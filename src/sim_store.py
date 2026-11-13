"""Estado compartido de la simulación 3D (red local multi-cliente)."""

from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional, Tuple

_lock = threading.Lock()
_state: Dict[str, Any] = {}
_updated_at: float = 0.0
_writer_id: Optional[str] = None
_host_id: Optional[str] = None
_host_until: float = 0.0

MAX_AGE_S = 60 * 60 * 12  # 12 h
HOST_LEASE_S = 4.5


def get_state() -> Dict[str, Any]:
    with _lock:
        if _updated_at and (time.time() - _updated_at) > MAX_AGE_S:
            _state.clear()
            return {
                "updatedAt": 0,
                "empty": True,
                "hostId": None,
            }
        if not _state:
            return {"updatedAt": 0, "empty": True, "hostId": _host_id}
        out = dict(_state)
        out["updatedAt"] = int(_updated_at * 1000)
        out["writerId"] = _writer_id
        out["hostId"] = _host_id if time.time() < _host_until else None
        out["empty"] = False
        return out


def patch_state(
    partial: Dict[str, Any], writer_id: Optional[str] = None
) -> Tuple[Dict[str, Any], bool]:
    """
    Merge parcial con lease de host.
    Solo el host (o si el lease expiró) puede escribir → evita pelea entre PCs.
    """
    global _updated_at, _writer_id, _host_id, _host_until
    if not isinstance(partial, dict):
        return get_state(), False

    clean = {
        k: v
        for k, v in partial.items()
        if k not in ("updatedAt", "writerId", "empty", "clientId", "hostId")
    }

    with _lock:
        now = time.time()
        host_alive = bool(_host_id and now < _host_until)
        if host_alive and writer_id and _host_id != writer_id:
            out = dict(_state) if _state else {}
            out["updatedAt"] = int(_updated_at * 1000) if _updated_at else 0
            out["writerId"] = _writer_id
            out["hostId"] = _host_id
            out["empty"] = not bool(_state)
            out["accepted"] = False
            return out, False

        if writer_id:
            _host_id = writer_id
            _host_until = now + HOST_LEASE_S
            _writer_id = writer_id

        for key, value in clean.items():
            if key == "lanes" and isinstance(value, dict) and isinstance(
                _state.get("lanes"), dict
            ):
                merged = dict(_state["lanes"])
                merged.update(value)
                _state["lanes"] = merged
            else:
                _state[key] = value

        _updated_at = now
        out = dict(_state)
        out["updatedAt"] = int(_updated_at * 1000)
        out["writerId"] = _writer_id
        out["hostId"] = _host_id
        out["empty"] = False
        out["accepted"] = True
        return out, True


def clear_state() -> Dict[str, Any]:
    global _updated_at, _writer_id, _host_id, _host_until
    with _lock:
        _state.clear()
        _updated_at = 0.0
        _writer_id = None
        _host_id = None
        _host_until = 0.0
    return {"updatedAt": 0, "empty": True, "hostId": None, "accepted": True}
