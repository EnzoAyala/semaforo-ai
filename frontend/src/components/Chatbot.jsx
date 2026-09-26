import { useState } from 'react';
import { semaforoService } from '../services/api';

const MENSAJE_INICIAL = {
  autor: 'asistente',
  texto: 'Hola, soy el asistente de SemaforoIA. Pregúntame por el estado del semáforo o cuándo puedes cruzar.',
};

export function Chatbot() {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL]);
  const [consulta, setConsulta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [conexion, setConexion] = useState(null);

  const tieneFormatoGemini = (clave) =>
    /^(AQ\.|AIza)[A-Za-z0-9_-]{20,}$/.test(clave.trim());

  const cambiarApiKey = (event) => {
    setApiKey(event.target.value);
    setConexion(null);
  };

  const validarApiKey = () => {
    const formatoValido = tieneFormatoGemini(apiKey);
    setConexion({
      ok: formatoValido,
      conectado: false,
      texto: formatoValido
        ? 'Formato válido. La conexión se comprobará al enviar el primer mensaje.'
        : 'La clave debe comenzar con AQ. o AIza.',
    });
  };

  const enviarConsulta = async (event) => {
    event.preventDefault();
    const texto = consulta.trim();
    if (!texto || enviando) return;
    if (!tieneFormatoGemini(apiKey)) {
      setConexion({
        ok: false,
        conectado: false,
        texto: 'Revisa el formato de la API key de Gemini.',
      });
      return;
    }

    setMensajes((actuales) => [...actuales, { autor: 'usuario', texto }]);
    setConsulta('');
    setEnviando(true);

    try {
      const data = await semaforoService.consultarChatbot(texto, apiKey.trim());
      setConexion({
        ok: true,
        conectado: true,
        texto: 'Conectado a Google Gemini · gemini-3.6-flash',
      });
      setMensajes((actuales) => [
        ...actuales,
        { autor: 'asistente', texto: data.respuesta },
      ]);
    } catch (error) {
      setMensajes((actuales) => [
        ...actuales,
        { autor: 'error', texto: error.message },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="chatbot-card" aria-labelledby="chatbot-title">
      <div className="chatbot-header">
        <div>
          <h2 id="chatbot-title">🤖 Asistente inteligente</h2>
          <p>Gemini conectado al estado del semáforo en tiempo real</p>
        </div>
        <span className="chatbot-online">Gemini 3.6 Flash</span>
      </div>

      <div className="chatbot-messages" aria-live="polite">
        {mensajes.map((mensaje, index) => (
          <div
            className={`chat-message chat-message-${mensaje.autor}`}
            key={`${mensaje.autor}-${index}`}
          >
            {mensaje.texto}
          </div>
        ))}
        {enviando && (
          <div className="chat-message chat-message-asistente">Pensando…</div>
        )}
      </div>

      <div className="chatbot-config">
        <label className="chatbot-key-label" htmlFor="chatbot-api-key">
          API key de Google Gemini
          <input
            id="chatbot-api-key"
            type="password"
            value={apiKey}
            onChange={cambiarApiKey}
            placeholder="AQ.… o AIza…"
            autoComplete="off"
            disabled={enviando}
          />
        </label>
        <button
          className="btn btn-secondary chatbot-validate"
          type="button"
          onClick={validarApiKey}
          disabled={!apiKey.trim() || enviando}
        >
          Revisar clave
        </button>
        <small>
          La revisión local no consume cuota. La conexión se confirma al enviar.
        </small>
        {conexion && (
          <div
            className={`connection-status ${conexion.ok ? 'connected' : 'disconnected'}`}
            role="status"
          >
            {conexion.conectado ? '● ' : conexion.ok ? '✓ ' : '⚠ '}{conexion.texto}
          </div>
        )}
      </div>

      <form className="chatbot-form" onSubmit={enviarConsulta}>
        <label className="sr-only" htmlFor="chatbot-consulta">
          Consulta para el asistente
        </label>
        <input
          id="chatbot-consulta"
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          placeholder="Ej.: ¿Puedo cruzar ahora?"
          maxLength={1000}
          disabled={enviando}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={enviando || !consulta.trim() || !apiKey.trim()}
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
