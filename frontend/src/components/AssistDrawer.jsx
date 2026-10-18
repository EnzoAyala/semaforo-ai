import { X } from 'lucide-react';
import { Chatbot } from './Chatbot';
import { EmailAlertCard } from './EmailAlertCard';

export function AssistDrawer({ open, onClose, modo, onNotificar }) {
  if (!open) return null;

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label="Asistente y alertas">
      <button type="button" className="drawer-backdrop" aria-label="Cerrar" onClick={onClose} />
      <aside className="drawer-panel assist-drawer">
        <div className="drawer-head">
          <div>
            <h2>Asistente</h2>
            <p>Chatbot y envío de alertas por correo</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body">
          <Chatbot compact />
          <EmailAlertCard modo={modo} onNotificar={onNotificar} compact />
        </div>
      </aside>
    </div>
  );
}
