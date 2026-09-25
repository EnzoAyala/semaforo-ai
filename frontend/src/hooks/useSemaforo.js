import { useState, useEffect } from 'react';
import { semaforoService } from '../services/api';

export const useSemaforo = () => {
  const [estado, setEstado] = useState({
    modo: 'REPOSO',
    luz_vehicular: 'VERDE',
    luz_peatonal: 'ROJO',
    tiempo_restante_seg: 0,
  });

  const [mensaje, setMensaje] = useState('Conectado al Backend FastAPI en tiempo real');

  // Sincronización continua cada 1 segundo con la API de Python
  useEffect(() => {
    const sincronizar = async () => {
      const data = await semaforoService.obtenerEstado();
      if (data) {
        setEstado(data);
      }
    };

    sincronizar();
    const interval = setInterval(sincronizar, 1000);
    return () => clearInterval(interval);
  }, []);

  const solicitarCruce = async () => {
    const res = await semaforoService.solicitarCruce();
    if (res && res.solicitud_aceptada) {
      setMensaje('🚶 Peatón detectado: Transición de advertencia iniciada');
    } else {
      setMensaje('⚠️ Solicitud RECHAZADA: El semáforo está activo o en Cooldown');
    }
  };

  return {
    estado,
    mensaje,
    setMensaje,
    solicitarCruce,
  };
};