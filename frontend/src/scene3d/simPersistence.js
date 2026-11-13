import { API_BASE_URL, SIM_WS_URL } from '../services/api';

const STORAGE_KEY = 'semaforoia-sim3d-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 h

const CLIENT_ID =
  (() => {
    try {
      const key = 'semaforoia-sim-client';
      let id = localStorage.getItem(key);
      if (!id) {
        id = `c-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return `c-${Date.now().toString(36)}`;
    }
  })();

let memory = {};
let hydrated = false;
let hydratePromise = null;
let lastPush = 0;
let pushTimer = null;
let ws = null;
/** Solo el host de la LAN publica; el resto solo recibe. */
let isHost = true;
const listeners = new Set();

function isFresh(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.empty) return false;
  if (data.updatedAt && Date.now() - data.updatedAt > MAX_AGE_MS) return false;
  return Boolean(data.updatedAt || data.agents || data.lanes || data.bus);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return isFresh(data) ? data : {};
  } catch {
    return {};
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}

function setMemory(data, { notify = true } = {}) {
  memory = data && typeof data === 'object' ? { ...data } : {};
  writeLocal(memory);
  if (notify) {
    listeners.forEach((fn) => {
      try {
        fn(memory);
      } catch {
        // ignore
      }
    });
  }
}

export function getSimClientId() {
  return CLIENT_ID;
}

export function readSimStore() {
  if (isFresh(memory)) return memory;
  const local = readLocal();
  if (isFresh(local)) {
    memory = local;
    return memory;
  }
  return {};
}

export function subscribeSimStore(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function scheduleServerPush() {
  if (pushTimer) return;
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    const payload = { ...memory, clientId: CLIENT_ID };
    try {
      const res = await fetch(`${API_BASE_URL}/sim`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const state = await res.json();
        if (state.accepted === false) {
          isHost = false;
          if (isFresh(state)) setMemory(state, { notify: true });
          return;
        }
        isHost = true;
        lastPush = state.updatedAt || Date.now();
        memory = { ...memory, updatedAt: lastPush, writerId: CLIENT_ID };
        writeLocal(memory);
      }
    } catch {
      // offline → solo local; asumimos host
      isHost = true;
    }
  }, 400);
}

export function isSimHost() {
  return isHost;
}

export function patchSimStore(partial) {
  const next = {
    ...readSimStore(),
    ...partial,
    updatedAt: Date.now(),
    writerId: CLIENT_ID,
  };
  if (partial.lanes) {
    next.lanes = {
      ...(readSimStore().lanes || {}),
      ...partial.lanes,
    };
  }
  setMemory(next, { notify: false });
  // Seguidores no pisan al host; igual guardan local por si quedan solos
  if (isHost) scheduleServerPush();
}

export function clearSimStore() {
  memory = {};
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  fetch(`${API_BASE_URL}/sim`, { method: 'DELETE' }).catch(() => {});
}

/** Carga el snapshot compartido del servidor (una vez al iniciar). */
export function hydrateSimStore() {
  if (hydrated) return Promise.resolve(readSimStore());
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const local = readLocal();
    try {
      const res = await fetch(`${API_BASE_URL}/sim`);
      if (res.ok) {
        const remote = await res.json();
        if (isFresh(remote)) {
          // Si ya hay host en la red, este cliente entra como seguidor
          isHost = !remote.hostId || remote.hostId === CLIENT_ID;
          setMemory(remote, { notify: false });
          hydrated = true;
          connectSimSocket();
          return memory;
        }
      }
    } catch {
      // usar local
    }
    isHost = true;
    if (isFresh(local)) setMemory(local, { notify: false });
    hydrated = true;
    connectSimSocket();
    return memory;
  })();

  return hydratePromise;
}

function connectSimSocket() {
  if (ws || typeof window === 'undefined') return;
  try {
    ws = new WebSocket(SIM_WS_URL);
  } catch {
    ws = null;
    return;
  }

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      const state = msg?.state || msg;
      if (!isFresh(state)) return;
      // Ignorar eco de este cliente
      if (state.writerId && state.writerId === CLIENT_ID) return;
      if (state.updatedAt && state.updatedAt <= (memory.updatedAt || 0)) return;
      isHost = false;
      setMemory(state, { notify: true });
    } catch {
      // ignore
    }
  };

  ws.onclose = () => {
    ws = null;
    setTimeout(connectSimSocket, 2500);
  };

  ws.onerror = () => {
    try {
      ws?.close();
    } catch {
      // ignore
    }
  };
}
