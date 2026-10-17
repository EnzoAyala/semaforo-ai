import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { semaforoService } from '../services/api';

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function horaLabel(iso) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  } catch {
    return '?';
  }
}

/** Gráfico de área: eventos por hora (mejor para ver el flujo temporal IoT). */
function AreaChart({ puntos }) {
  const width = 560;
  const height = 180;
  const pad = 28;
  if (!puntos.length) {
    return <p className="history-empty">Aún no hay eventos para graficar.</p>;
  }

  const maxY = Math.max(1, ...puntos.map((p) => p.y));
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = puntos.map((p, i) => {
    const x = pad + (puntos.length === 1 ? innerW / 2 : (i / (puntos.length - 1)) * innerW);
    const y = pad + innerH - (p.y / maxY) * innerH;
    return { x, y, ...p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${pad + innerH} L${coords[0].x},${pad + innerH} Z`;

  return (
    <svg className="area-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Eventos por hora">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="2.5" />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="4" fill="#f0a202" />
          <text x={c.x} y={height - 6} textAnchor="middle" className="chart-axis">
            {c.label}
          </text>
          <text x={c.x} y={c.y - 10} textAnchor="middle" className="chart-value">
            {c.y}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ counts }) {
  const max = Math.max(1, ...Object.values(counts));
  const entries = Object.entries(counts);
  if (!entries.length) return <p className="history-empty">Sin eventos.</p>;

  return (
    <div className="bar-chart">
      {entries.map(([source, value]) => (
        <div key={source} className="bar-row">
          <span className="bar-label">{source}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <span className="bar-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoryModal({ open, onClose, refreshKey = 0 }) {
  const [eventos, setEventos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [salud, setSalud] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [histEventos, histEstados, saludSensor] = await Promise.all([
        semaforoService.obtenerHistorialEventos(100),
        semaforoService.obtenerHistorialEstados(40),
        semaforoService.obtenerSaludSensor(),
      ]);
      setEventos(histEventos?.eventos || []);
      setEstados(histEstados?.estados || []);
      setSalud(saludSensor);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial');
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    cargar();
    const id = setInterval(cargar, 4000);
    return () => clearInterval(id);
  }, [cargar, refreshKey, open]);

  const counts = useMemo(() => {
    const map = { pir: 0, button: 0, ui: 0 };
    for (const ev of eventos) {
      const key = (ev.source || 'otro').toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [eventos]);

  const porHora = useMemo(() => {
    const buckets = {};
    for (const ev of [...eventos].reverse()) {
      if (!ev.timestamp) continue;
      const label = horaLabel(ev.timestamp);
      buckets[label] = (buckets[label] || 0) + 1;
    }
    return Object.entries(buckets).map(([label, y]) => ({ label, y }));
  }, [eventos]);

  if (!open) return null;

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-label="Registro IoT">
      <button type="button" className="drawer-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="modal-panel">
        <div className="drawer-head">
          <div>
            <h2>Registro IoT</h2>
            <p>Captura → almacenamiento PostgreSQL → visualización</p>
          </div>
          <div className="modal-head-actions">
            <span className={`bridge-badge ${salud?.bridge_connected ? 'ok' : 'off'}`}>
              {salud?.bridge_connected ? 'Bridge online' : 'Bridge offline'}
            </span>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <p className="history-error">{error}</p>}

        <div className="modal-grid">
          <section className="modal-card modal-card-wide">
            <h3>Flujo temporal (eventos por hora)</h3>
            <AreaChart puntos={porHora} />
          </section>

          <section className="modal-card">
            <h3>Por fuente de captura</h3>
            <BarChart counts={counts} />
          </section>

          <section className="modal-card">
            <h3>Últimas detecciones</h3>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Fuente</th>
                    <th>OK</th>
                    <th>Modo</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.length === 0 && (
                    <tr>
                      <td colSpan={4}>Sin detecciones</td>
                    </tr>
                  )}
                  {eventos.slice(0, 12).map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatearFecha(ev.timestamp)}</td>
                      <td>{ev.source}</td>
                      <td>{ev.accepted ? 'Sí' : 'No'}</td>
                      <td>{ev.modo_resultante || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="modal-card modal-card-wide">
            <h3>Timeline de estados</h3>
            <ul className="state-timeline">
              {estados.length === 0 && <li>Sin cambios aún</li>}
              {estados.slice(0, 15).map((st) => (
                <li key={st.id}>
                  <span className="timeline-mode">{st.modo}</span>
                  <span className="timeline-lights">
                    Veh {st.luz_vehicular} · Pea {st.luz_peatonal}
                  </span>
                  <span className="timeline-time">{formatearFecha(st.timestamp)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
