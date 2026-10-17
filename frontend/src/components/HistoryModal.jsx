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

function horaLabelFromDate(d) {
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

/** Area chart: sube con mas cruces peatonales (luz peatonal verde). */
function AreaChart({ puntos, yLabel = 'Cruces' }) {
  const width = 640;
  const height = 220;
  const padL = 44;
  const padR = 16;
  const padT = 24;
  const padB = 32;

  if (!puntos.length) {
    return <p className="history-empty">Aún no hay actividad peatonal para graficar.</p>;
  }

  const maxY = Math.max(1, ...puntos.map((p) => p.y));
  const ticks = [0, Math.ceil(maxY / 2), maxY].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = padT + innerH;

  const coords = puntos.map((p, i) => {
    const x = padL + (puntos.length === 1 ? innerW / 2 : (i / (puntos.length - 1)) * innerW);
    // SVG: y crece hacia abajo → restamos para que mas actividad suba
    const y = baseY - (p.y / maxY) * innerH;
    return { x, y, ...p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${baseY} L${coords[0].x},${baseY} Z`;

  return (
    <svg
      className="area-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Actividad peatonal por hora"
    >
      <defs>
        <linearGradient id="areaFillPed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Grid + eje Y */}
      {ticks.map((t) => {
        const y = baseY - (t / maxY) * innerH;
        return (
          <g key={`tick-${t}`}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              className="chart-grid"
            />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-axis">
              {t}
            </text>
          </g>
        );
      })}
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        className="chart-axis chart-ylabel"
        transform={`rotate(-90 14 ${height / 2})`}
      >
        {yLabel}
      </text>

      <path d={area} fill="url(#areaFillPed)" />
      <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.8" />

      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="4.5" fill="#f0a202" />
          <text x={c.x} y={height - 8} textAnchor="middle" className="chart-axis">
            {c.label}
          </text>
          {c.y > 0 && (
            <text x={c.x} y={c.y - 10} textAnchor="middle" className="chart-value">
              {c.y}
            </text>
          )}
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
        semaforoService.obtenerHistorialEventos(200),
        semaforoService.obtenerHistorialEstados(200),
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

  // Ultimas 12h: cuantas veces el peatonal paso a VERDE (actividad de personas)
  const actividadPeatonal = useMemo(() => {
    const now = new Date();
    const buckets = [];
    const indexByHour = {};

    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.getHours();
      const label = horaLabelFromDate(d);
      // Si se repite la misma hora en el wrap de medianoche, usamos indice unico
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
      indexByHour[key] = buckets.length;
      buckets.push({ label, y: 0, key, hour });
    }

    const oldest = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    // Orden cronologico (mas antiguo primero) para detectar transiciones
    const ordenados = [...estados].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    let prevPea = null;
    for (const st of ordenados) {
      if (!st.timestamp) continue;
      const d = new Date(st.timestamp);
      if (Number.isNaN(d.getTime()) || d < oldest) {
        prevPea = st.luz_peatonal;
        continue;
      }
      const pea = st.luz_peatonal;
      // Cuenta cada vez que ENCIENDE el verde peatonal
      if (pea === 'VERDE' && prevPea !== 'VERDE') {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const idx = indexByHour[key];
        if (idx !== undefined) buckets[idx].y += 1;
      }
      prevPea = pea;
    }

    return buckets.map(({ label, y }) => ({ label, y }));
  }, [estados]);

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
            <h3>Actividad peatonal (últimas 12 horas)</h3>
            <p className="chart-help">
              La curva <strong>sube</strong> cuando hubo cruces: cada unidad es una vez que el
              semáforo peatonal pasó a <strong>verde</strong>. Eje vertical = cantidad de cruces;
              eje horizontal = hora.
            </p>
            <AreaChart puntos={actividadPeatonal} yLabel="Cruces (verde peatonal)" />
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
