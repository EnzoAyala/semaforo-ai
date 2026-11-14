import { X } from 'lucide-react';
import { EmailSubscriptionCard } from '../cards/EmailSubscriptionCard';

export function SubscriptionDrawer({ open, onClose, onNotificar }) {
  return (
    <aside
      className={`side-panel sub-panel ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Suscripción de alertas"
    >
      <div className="side-panel-inner">
        <div className="drawer-head">
          <div>
            <h2>Suscripción</h2>
            <p>Alertas automáticas por correo en cada cambio de fase</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body">
          <EmailSubscriptionCard onNotificar={onNotificar} />
        </div>
      </div>
    </aside>
  );
}
