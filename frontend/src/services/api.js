const API_BASE_URL = 'http://localhost:8000/api';

export const semaforoService = {
  // Obtener estado real desde el backend
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

  // Enviar solicitud de peaton al backend
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

  // Enviar correo de alerta real (Tu módulo Enzo)
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

  // Consultar al asistente; el backend añade el estado actual del semáforo.
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
        // Conserva el mensaje genérico si la API no responde con JSON.
      }
      throw new Error(mensaje);
    }
    return await res.json();
  }
};
