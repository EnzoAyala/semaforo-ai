import { useState, useEffect } from 'react';
import { semaforoService, WS_URL } from '../services/api';

export const useSemaforo = () => {
  const [estado, setEstado] = useState({
    modo: 'REPOSO',
    luz_vehicular: 'VERDE',
    luz_peatonal: 'ROJO',
    tiempo_restante_seg: 0,
    en_hora_pico: false,
    franja_activa: null,
    duracion_rojo: 60,
    duracion_cooldown: 120,
  });

  const [mensaje, setMensaje] = useState('Conectando al semáforo en tiempo real…');

  useEffect(() => {
    let ws;
    let intervalFallback;

    // Cargar estado inicial por HTTP
    const cargarEstadoInicial = async () => {
      const data = await semaforoService.obtenerEstado();
      if (data) setEstado(data);
    };
    cargarEstadoInicial();

    // Conexión por WebSocket usando la IP detectada dinámicamente
    const conectarWS = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setMensaje('🟢 Conectado en tiempo real (WebSocket Multi-dispositivo)');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setEstado(data);
          } catch (err) {
            console.error('Error al parsear WebSocket:', err);
          }
        };

        ws.onerror = () => {
          setMensaje('⚠️ WebSocket inestable. Refrescando por HTTP…');
        };

        ws.onclose = () => {
          setMensaje('⚠️ WebSocket cerrado. Reintentando…');
          window.setTimeout(conectarWS, 1500);
        };
      } catch {
        window.setTimeout(conectarWS, 2000);
      }
    };

    // HTTP siempre como respaldo (asegura que el contador avance aunque el WS se cuelgue)
    intervalFallback = setInterval(async () => {
      const data = await semaforoService.obtenerEstado();
      if (data) setEstado(data);
    }, 1000);

    conectarWS();

    return () => {
      if (ws) ws.close();
      if (intervalFallback) clearInterval(intervalFallback);
    };
  }, []);

  const aplicarResumen = (resumen) => {
    if (resumen && typeof resumen === 'object' && resumen.modo) {
      setEstado((prev) => ({ ...prev, ...resumen }));
    }
  };

  const solicitarCruce = async () => {
    const res = await semaforoService.solicitarCruce();
    if (res?.resumen) aplicarResumen(res.resumen);
    if (res && res.solicitud_aceptada) {
      setMensaje('🚶 Peatón detectado: Transición transmitida a la red');
    } else {
      setMensaje('⚠️ Solicitud RECHAZADA: El semáforo está activo o en Cooldown');
    }
    return res;
  };

  return {
    estado,
    mensaje,
    setMensaje,
    setEstado,
    aplicarResumen,
    solicitarCruce,
  };
};