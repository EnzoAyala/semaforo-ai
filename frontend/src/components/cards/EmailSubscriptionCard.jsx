import { useCallback, useEffect, useState } from 'react';
import { Mail, UserMinus } from 'lucide-react';
import { semaforoService } from '../../services/api';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSubscriptionCard({ onNotificar, compact = false }) {
  const [correo, setCorreo] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [accion, setAccion] = useState('');

  const emailValido = EMAIL_OK.test(correo.trim());

  const cargar = useCallback(async () => {
    const data = await semaforoService.listarSuscripcionesEmail();
    setLista(data?.suscripciones || []);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void cargar();
    }, 0);
    return () => window.clearTimeout(t);
  }, [cargar]);

  const suscribir = async () => {
    if (!emailValido || cargando) return;
    setCargando(true);
    setAccion('subscribe');
    try {
      const res = await semaforoService.suscribirEmail(correo.trim());
      onNotificar?.(
        res?.mensaje ||
          `Suscrito: ${correo.trim()}. Recibirás el estado en cada cambio de fase.`
      );
      setCorreo('');
      await cargar();
    } catch (err) {
      onNotificar?.(err.message || 'No se pudo suscribir');
    } finally {
      setCargando(false);
      setAccion('');
    }
  };

  const cancelar = async (email) => {
    setCargando(true);
    setAccion(email);
    try {
      const res = await semaforoService.cancelarSuscripcionEmail(email);
      onNotificar?.(res?.mensaje || `Cancelado: ${email}`);
      await cargar();
    } catch (err) {
      onNotificar?.(err.message || 'No se pudo cancelar');
    } finally {
      setCargando(false);
      setAccion('');
    }
  };

  return (
    <section className={`sub-card ${compact ? 'sub-card-compact' : ''}`}>
      <div className="sub-card-head">
        <div>
          <h3>Suscripción automática</h3>
          <p>
            Al suscribirte, el sistema envía solo el estado por correo en cada
            cambio de fase (REPOSO, AMARILLO, PEATONAL, COOLDOWN). Sin envío manual.
          </p>
        </div>
      </div>

      <div className="sub-form">
        <label htmlFor="sub-email">Correo electrónico</label>
        <div className="sub-row">
          <input
            id="sub-email"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            disabled={cargando}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={suscribir}
            disabled={!emailValido || cargando}
          >
            <Mail size={16} />
            {accion === 'subscribe' ? '…' : 'Suscribir'}
          </button>
        </div>
        {correo && !emailValido && (
          <small className="sub-hint bad">Ingresa un correo válido</small>
        )}
      </div>

      <ul className="sub-list">
        {lista.length === 0 && (
          <li className="sub-empty">Nadie suscrito todavía</li>
        )}
        {lista.map((s) => (
          <li key={s.id || s.email}>
            <span>{s.email}</span>
            <button
              type="button"
              className="sub-cancel"
              onClick={() => cancelar(s.email)}
              disabled={cargando}
              title="Cancelar suscripción"
            >
              <UserMinus size={15} />
              {accion === s.email ? '…' : 'Cancelar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
