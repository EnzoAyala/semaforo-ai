import { X } from 'lucide-react';
import { Chatbot } from './Chatbot';
import { PeakHoursCard } from './PeakHoursCard';

export function AssistDrawer({ open, onClose, onNotificar }) {
  return (
    <aside
      className={`side-panel assist-panel ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Asistente SemaforoIA"
    >
      <div className="side-panel-inner">
        <div className="drawer-head">
          <div>
            <h2>Asistente</h2>
            <p>Chat del proyecto y horarios pico</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body assist-body">
          <Chatbot compact />
          <PeakHoursCard compact onNotificar={onNotificar} />
        </div>
      </div>
    </aside>
  );
}
