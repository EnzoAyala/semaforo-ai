// Detecta si se ingresó por localhost, 192.168.x.x o 26.x.x.x
const HOST = window.location.hostname || 'localhost';

export const API_BASE_URL = `http://${HOST}:8000/api`;
export const WS_URL = `ws://${HOST}:8000/ws/estado`;
export const SIM_WS_URL = `ws://${HOST}:8000/ws/sim`;

export const semaforoService = {
  async obtenerEstado() {
    try {
      const res = await fetch(`${API_BASE_URL}/estado`);
      if (!res.ok) throw new Error('Error al obtener estado');
      return await res.json();
    } catch (error) {
      console.error('Error en servicio API:', error);
      return null;
    }
  },

  async solicitarCruce(tiempoActual = null) {
    try {
      const res = await fetch(`${API_BASE_URL}/solicitar-cruce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiempo_actual: tiempoActual }),
      });
      if (!res.ok) throw new Error('Error al solicitar cruce');
      return await res.json();
    } catch (error) {
      console.error('Error en servicio API:', error);
      return null;
    }
  },

  async enviarEventoSensor(source = 'pir', deviceId = 'sim-3d') {
    try {
      const res = await fetch(`${API_BASE_URL}/sensor/evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, device_id: deviceId }),
      });
      if (!res.ok) throw new Error('Error al enviar evento de sensor');
      return await res.json();
    } catch (error) {
      console.error('Error en sensor 3D:', error);
      return null;
    }
  },

  async enviarAlertaEmail(correo, asunto, mensajeAdicional = "") {
    try {
      const res = await fetch(`${API_BASE_URL}/enviar-alerta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatario: correo,
          asunto: asunto,
          mensaje_adicional: mensajeAdicional
        }),
      });
      if (!res.ok) throw new Error('Error al enviar correo');
      return await res.json();
    } catch (error) {
      console.error('Error en servicio de correo:', error);
      return null;
    }
  },

  async listarSuscripcionesEmail() {
    const res = await fetch(`${API_BASE_URL}/suscripciones/email`);
    if (!res.ok) throw new Error('No se pudieron cargar las suscripciones');
    return await res.json();
  },

  async suscribirEmail(email) {
    const res = await fetch(`${API_BASE_URL}/suscripciones/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      let mensaje = 'No se pudo suscribir el correo';
      try {
        const err = await res.json();
        if (err.detail) mensaje = err.detail;
      } catch {
        // ignore
      }
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async cancelarSuscripcionEmail(email) {
    const res = await fetch(`${API_BASE_URL}/suscripciones/email`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      let mensaje = 'No se pudo cancelar la suscripción';
      try {
        const err = await res.json();
        if (err.detail) mensaje = err.detail;
      } catch {
        // ignore
      }
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async notificarSuscriptoresAhora() {
    const res = await fetch(`${API_BASE_URL}/suscripciones/email/notificar`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('No se pudo notificar a los suscriptores');
    return await res.json();
  },

  async consultarChatbot(consulta) {
    const res = await fetch(`${API_BASE_URL}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consulta, proveedor: 'gemini' }),
    });

    if (!res.ok) {
      let mensaje = 'No se pudo contactar al asistente';
      try {
        const error = await res.json();
        if (error.detail) mensaje = error.detail;
      } catch {
        // Mantiene el mensaje predeterminado
      }
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async transcribirAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const res = await fetch(`${API_BASE_URL}/chatbot/transcribir`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let mensaje = 'No se pudo transcribir el audio';
      try {
        const error = await res.json();
        if (error.detail) mensaje = error.detail;
      } catch {
        // Mantiene el mensaje predeterminado
      }
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async obtenerHistorialEventos(limit = 50) {
    const res = await fetch(`${API_BASE_URL}/historial/eventos?limit=${limit}`);
    if (!res.ok) throw new Error('Error al obtener historial de eventos');
    return await res.json();
  },

  async obtenerHistorialEstados(limit = 50) {
    const res = await fetch(`${API_BASE_URL}/historial/estados?limit=${limit}`);
    if (!res.ok) throw new Error('Error al obtener historial de estados');
    return await res.json();
  },

  async obtenerSaludSensor() {
    try {
      const res = await fetch(`${API_BASE_URL}/sensor/salud`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async obtenerHorariosPico() {
    try {
      const res = await fetch(`${API_BASE_URL}/bot/horarios-pico`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async actualizarHorariosPico() {
    try {
      const res = await fetch(`${API_BASE_URL}/bot/horarios-pico/actualizar`, {
        method: 'POST',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};