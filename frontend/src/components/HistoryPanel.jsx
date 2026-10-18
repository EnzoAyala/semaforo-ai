import { useCallback, useEffect, useMemo, useState } from 'react';
import { semaforoService } from '../services/api';

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function BarChart({ counts }) {
  const max = Math.max(1, ...Object.values(counts));
  const entries = Object.entries(counts);

  if (entries.length === 0) {
    return <p className="history-empty">Sin eventos aún.</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label="Eventos por fuente">
      {entries.map(([source, value]) => (
        <div key={source} className="bar-row">
          <span className="bar-label">{source}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(value / max) * 100}%` }}
              title={`${source}: ${value}`}
            />
          </div>
          <span className="bar-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoryPanel({ refreshKey = 0 }) {
  const [eventos, setEventos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [salud, setSalud] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [histEventos, histEstados, saludSensor] = await Promise.all([
        semaforoService.obtenerHistorialEventos(30),
        semaforoService.obtenerHistorialEstados(20),
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
    cargar();
    const id = setInterval(cargar, 4000);
    return () => clearInterval(id);
  }, [cargar, refreshKey]);

  const counts = useMemo(() => {
    const map = { pir: 0, button: 0, ui: 0 };
    for (const ev of eventos) {
      const key = (ev.source || 'otro').toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [eventos]);

  const bridgeOk = salud?.bridge_connected;

  return (
    <section className="history-panel">
      <div className="history-header">
        <div>
          <h2>Historial IoT</h2>
          <p>Capturas del sensor y cambios de estado (PostgreSQL)</p>
        </div>
        <span className={`bridge-badge ${bridgeOk ? 'ok' : 'off'}`}>
          {bridgeOk ? 'Bridge conectado' : 'Bridge offline'}
        </span>
      </div>

      {error && <p className="history-error">{error}</p>}

      <div className="history-grid">
        <div className="history-card">
          <h3>Eventos por fuente</h3>
          <BarChart counts={counts} />
        </div>

        <div className="history-card">
          <h3>Últimas detecciones</h3>
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Fuente</th>
                  <th>Aceptado</th>
                  <th>Modo</th>
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 && (
                  <tr>
                    <td colSpan={4}>Sin detecciones registradas</td>
                  </tr>
                )}
                {eventos.map((ev) => (
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
        </div>

        <div className="history-card history-card-wide">
          <h3>Timeline de estados</h3>
          <ul className="state-timeline">
            {estados.length === 0 && <li>Sin cambios aún</li>}
            {estados.map((st) => (
              <li key={st.id}>
                <span className="timeline-mode">{st.modo}</span>
                <span className="timeline-lights">
                  Veh {st.luz_vehicular} · Pea {st.luz_peatonal}
                </span>
                <span className="timeline-time">{formatearFecha(st.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
