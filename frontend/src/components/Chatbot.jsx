import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { semaforoService } from '../services/api';

const MENSAJE_INICIAL = {
  autor: 'asistente',
  texto: 'Hola, soy el asistente de SemaforoIA. Pregúntame por el estado del semáforo o cuándo puedes cruzar.',
};

export function Chatbot() {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL]);
  const [consulta, setConsulta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [conexion, setConexion] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
        ? 'Formato válido. La conexión se comprobará al enviar el primer mensaje o nota de voz.'
        : 'La clave debe comenzar con AQ. o AIza.',
    });
  };

  const iniciarGrabacion = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMensajes((actuales) => [
        ...actuales,
        {
          autor: 'error',
          texto: 'Tu navegador no admite la captura de audio por micrófono.',
        },
      ]);
      return;
    }

    if (!apiKey.trim()) {
      setConexion({
        ok: false,
        conectado: false,
        texto: 'Ingresa tu API key de Gemini antes de usar la transcripción de voz.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        setTranscribiendo(true);
        try {
          const resultado = await semaforoService.transcribirAudio(
            audioBlob,
            apiKey.trim()
          );
          if (resultado && resultado.texto) {
            setConsulta(resultado.texto);
            setConexion({
              ok: true,
              conectado: true,
              texto: 'Voz transcrita exitosamente con Gemini Flash',
            });
          }
        } catch (error) {
          setMensajes((actuales) => [
            ...actuales,
            { autor: 'error', texto: `Error en transcripción de voz: ${error.message}` },
          ]);
        } finally {
          setTranscribiendo(false);
        }
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch (err) {
      setMensajes((actuales) => [
        ...actuales,
        {
          autor: 'error',
          texto: `No se pudo acceder al micrófono: ${err.message || 'Permiso denegado'}.`,
        },
      ]);
      setGrabando(false);
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setGrabando(false);
  };

  const alternarGrabacion = () => {
    if (grabando) {
      detenerGrabacion();
    } else {
      iniciarGrabacion();
    }
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
          <p>Gemini conectado al estado del semáforo con voz y texto</p>
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
            disabled={enviando || grabando || transcribiendo}
          />
        </label>
        <button
          className="btn btn-secondary chatbot-validate"
          type="button"
          onClick={validarApiKey}
          disabled={!apiKey.trim() || enviando || grabando || transcribiendo}
        >
          Revisar clave
        </button>
        <small>
          La revisión local no consume cuota. Puedes escribir o dictar por voz usando el micrófono.
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
          placeholder={
            grabando
              ? '🎙️ Grabando audio... Haz clic en el botón rojo para detener.'
              : transcribiendo
              ? '⌛ Gemini transcribiendo tu audio...'
              : 'Ej.: ¿Puedo cruzar ahora? o pulsa el micrófono'
          }
          maxLength={1000}
          disabled={enviando || grabando || transcribiendo}
        />
        <button
          className={`btn btn-mic ${grabando ? 'btn-mic-recording' : ''}`}
          type="button"
          onClick={alternarGrabacion}
          disabled={enviando || transcribiendo || !apiKey.trim()}
          title={
            !apiKey.trim()
              ? 'Ingresa tu API key de Gemini para habilitar el micrófono'
              : grabando
              ? 'Detener grabación y transcribir con Gemini'
              : 'Dictar consulta por voz'
          }
          aria-label={grabando ? 'Detener grabación' : 'Iniciar grabación de voz'}
        >
          {transcribiendo ? (
            <Loader2 className="btn-mic-spin" size={18} />
          ) : grabando ? (
            <Square size={16} fill="currentColor" />
          ) : (
            <Mic size={18} />
          )}
        </button>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={enviando || grabando || transcribiendo || !consulta.trim() || !apiKey.trim()}
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
