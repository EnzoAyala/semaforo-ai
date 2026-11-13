import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { semaforoService } from '../services/api';

const MENSAJE_INICIAL = {
  autor: 'asistente',
  texto:
    'Hola, soy el asistente de SemaforoIA. Solo respondo sobre el semáforo, el cruce peatonal y el sistema. Pregunta, por ejemplo: ¿puedo cruzar ahora?',
};

export function Chatbot({ compact = false }) {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL]);
  const [consulta, setConsulta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
          const resultado = await semaforoService.transcribirAudio(audioBlob);
          if (resultado && resultado.texto) {
            setConsulta(resultado.texto);
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

    setMensajes((actuales) => [...actuales, { autor: 'usuario', texto }]);
    setConsulta('');
    setEnviando(true);

    try {
      const data = await semaforoService.consultarChatbot(texto);
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

  const ocupado = enviando || grabando || transcribiendo;

  return (
    <section className={`chatbot-card ${compact ? 'chatbot-compact' : ''}`} aria-labelledby="chatbot-title">
      <div className="chatbot-header">
        <div>
          <h2 id="chatbot-title">Asistente</h2>
          <p>Solo temas de SemaforoIA</p>
        </div>
        <span className="chatbot-online">Gemini</span>
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
              ? '🎙️ Grabando… pulsa el botón rojo para detener.'
              : transcribiendo
              ? '⌛ Transcribiendo…'
              : 'Ej.: ¿Puedo cruzar ahora?'
          }
          maxLength={1000}
          disabled={ocupado}
        />
        <button
          className={`btn btn-mic ${grabando ? 'btn-mic-recording' : ''}`}
          type="button"
          onClick={alternarGrabacion}
          disabled={enviando || transcribiendo}
          title={
            grabando
              ? 'Detener y transcribir'
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
          disabled={ocupado || !consulta.trim()}
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
