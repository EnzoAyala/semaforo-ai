/** Pantalla completa del contenedor de la simulación 3D. */

import { useCallback, useEffect, useState } from 'react';

export function useFullscreen(viewRef, onNotificar) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      const el = viewRef.current;
      const active =
        document.fullscreenElement === el ||
        document.webkitFullscreenElement === el;
      setIsFullscreen(Boolean(active));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [viewRef]);

  const toggleFullscreen = useCallback(async () => {
    const el = viewRef.current;
    if (!el) return;
    try {
      const active =
        document.fullscreenElement === el ||
        document.webkitFullscreenElement === el;
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      onNotificar?.('No se pudo activar pantalla completa');
    }
  }, [viewRef, onNotificar]);

  return { isFullscreen, toggleFullscreen };
}
