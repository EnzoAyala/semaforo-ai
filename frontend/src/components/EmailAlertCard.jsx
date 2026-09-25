import React, { useState } from 'react';
import { semaforoService } from '../services/api';

export const EmailAlertCard = ({ modo, onNotificar }) => {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleEnviar = async () => {
    setCargando(true);
    onNotificar('📧 Enviando alerta mediante el Backend...');

    const res = await semaforoService.enviarAlertaEmail(
      correo,
      'Alerta de Monitoreo - Dashboard React',
      `Notificación manual generada en modo ${modo}`
    );

    setCargando(false);
    if (res && res.status === 'ok') {
      alert(`✅ Correo enviado con éxito a: ${correo}`);
      onNotificar(`✅ Reporte enviado a ${correo}`);
    } else {
      alert('❌ Error al enviar el correo.');
      onNotificar('❌ Error en el envío del correo');
    }
  };

  return (
    <div className="control-card">
      <div className="email-group">
        <label>Destinatario Email:</label>
        <input
          type="email"
          className="email-input"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>

      <div className="button-group">
        <button className="btn btn-danger" onClick={handleEnviar} disabled={cargando}>
          {cargando ? '📧 Enviando...' : '📩 Enviar Alerta Email (Enzo)'}
        </button>
      </div>
    </div>
  );
};