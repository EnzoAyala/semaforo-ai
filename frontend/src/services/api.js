// Detecta si se ingresó por localhost, 192.168.x.x o 26.x.x.x
const HOST = window.location.hostname || 'localhost';

export const API_BASE_URL = `http://${HOST}:8000/api`;
export const WS_URL = `ws://${HOST}:8000/ws/estado`;

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

  async consultarChatbot(consulta, apiKey) {
    const res = await fetch(`${API_BASE_URL}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consulta, proveedor: 'gemini', api_key: apiKey || null }),
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

  async transcribirAudio(audioBlob, apiKey) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    if (apiKey) {
      formData.append('api_key', apiKey.trim());
    }

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
  }
};