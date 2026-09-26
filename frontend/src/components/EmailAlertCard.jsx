import { useState } from 'react';
import { semaforoService } from '../services/api';

export const EmailAlertCard = ({ modo, onNotificar }) => {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  // Validación básica de email
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  // Sugerencias para errores comunes
  const obtenerSugerencia = () => {
    if (!correo) {
      return 'Ingresa un correo electrónico';
    }

    if (!correo.includes('@')) {
      return 'El correo debe contener @';
    }

    if (correo.endsWith('@')) {
      return 'Completa el dominio, por ejemplo: usuario@gmail.com';
    }

    const sugerencias = {
      '@gmail.con': '@gmail.com',
      '@gmail.co': '@gmail.com',
      '@gmai.com': '@gmail.com',
      '@gmial.com': '@gmail.com',
      '@gmal.com': '@gmail.com',
      '@hotmai.com': '@hotmail.com',
      '@hotmial.com': '@hotmail.com',
      '@outlok.com': '@outlook.com',
      '@outllok.com': '@outlook.com',
    };

    for (const [error, correcto] of Object.entries(sugerencias)) {
      if (correo.endsWith(error)) {
        const usuario = correo.substring(
          0,
          correo.length - error.length
        );

        return `¿Quisiste decir ${usuario}${correcto}?`;
      }
    }

    if (!emailValido) {
      return 'Ingresa un correo válido, por ejemplo: usuario@gmail.com';
    }

    return '';
  };

  const mensajeValidacion = obtenerSugerencia();

  const handleEnviar = async () => {
    // Seguridad adicional: no enviar si el correo no es válido
    if (!emailValido) {
      return;
    }

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
          placeholder="ejemplo@gmail.com"
        />

        {/* Mensaje de validación */}
        {correo && !emailValido && (
          <small style={{ color: '#dc2626' }}>
            ❌ {mensajeValidacion}
          </small>
        )}

        {/* Mensaje cuando el correo es válido */}
        {emailValido && (
          <small style={{ color: '#16a34a' }}>
            ✅ Correo válido
          </small>
        )}

        {/* Sugerencia específica */}
        {correo && mensajeValidacion.startsWith('¿Quisiste decir') && (
          <small style={{ color: '#d97706' }}>
            💡 {mensajeValidacion}
          </small>
        )}
      </div>

      <div className="button-group">
        <button
          className="btn btn-danger"
          onClick={handleEnviar}
          disabled={cargando || !emailValido}
        >
          {cargando
            ? '📧 Enviando...'
            : '📩 Enviar Alerta Email'}
        </button>
      </div>
    </div>
  );
};
