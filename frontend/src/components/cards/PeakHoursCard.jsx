import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { semaforoService } from '../../services/api';

export function PeakHoursCard({ compact = false, onNotificar }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    const res = await semaforoService.obtenerHorariosPico();
    if (res) setData(res);
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, [cargar]);

  const actualizar = async () => {
    setLoading(true);
    try {
      const res = await semaforoService.actualizarHorariosPico();
      if (res) {
        setData(res);
        onNotificar?.(
          res.aplicado?.en_hora_pico
            ? `Bot tráfico: ${res.aplicado.franja_activa} — tiempos ajustados`
            : 'Bot tráfico: fuera de hora pico — tiempos base'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const bot = data?.bot;
  const aplicado = data?.aplicado;
  const fuenteUrl = bot?.fuente_url || '';

  return (
    <section className={`peak-card ${compact ? 'peak-card-compact' : ''}`}>
      <div className="peak-card-head">
        <div>
          <h3>Bot horarios pico</h3>
          <p>Scrapea la URL de BOLETIN_TRANSITO_URL (ATU/gob.pe) y ajusta tiempos</p>
        </div>
        <button
          type="button"
          className="peak-refresh"
          onClick={actualizar}
          disabled={loading}
          title="Volver a scrapear la web"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="peak-status">
        <span className={`peak-badge ${aplicado?.en_hora_pico ? 'on' : 'off'}`}>
          {aplicado?.en_hora_pico ? aplicado.franja_activa || 'Hora pico' : 'Flujo normal'}
        </span>
        <span className="peak-meta">
          Peatonal {data?.resumen?.duracion_rojo ?? '—'}s · Cooldown{' '}
          {data?.resumen?.duracion_cooldown ?? '—'}s
        </span>
      </div>

      {bot?.franjas?.length > 0 && (
        <ul className="peak-franjas">
          {bot.franjas.map((f) => (
            <li key={`${f.nombre}-${f.inicio}`}>
              <strong>{f.nombre}</strong>
              <span>
                {f.inicio}–{f.fin}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="peak-source">
        Fuente:{' '}
        {fuenteUrl ? (
          <a href={fuenteUrl} target="_blank" rel="noreferrer">
            {fuenteUrl.length > 64 ? `${fuenteUrl.slice(0, 64)}…` : fuenteUrl}
          </a>
        ) : (
          '—'
        )}
        {bot?.parser ? ` · parser: ${bot.parser}` : ''}
        {bot?.hora_local ? ` · ${bot.hora_local}` : ''}
      </p>
      {bot?.error && <p className="peak-error">Aviso: {bot.error}</p>}
    </section>
  );
}
