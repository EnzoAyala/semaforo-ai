import { Moon, Sun } from 'lucide-react';
import {
  descripcionModo,
  labelModo,
  modoTieneContador,
  sensorPirActivo,
} from '../../utils/modoLabels';

export const Header = ({
  modo,
  tiempoRestante,
  bridgeOk,
  theme,
  onToggleTheme,
  enHoraPico = false,
  franjaActiva = null,
  duracionRojo = 60,
  duracionCooldown = 120,
}) => {
  const showTimer = modoTieneContador(modo) && Number(tiempoRestante) > 0.05;
  const pirOn = sensorPirActivo(modo);

  return (
  <header className="stage-topbar">
    <div className="brand-block">
      <p className="brand-name">SemaforoIA</p>
      <p className="brand-tag">Control peatonal IoT</p>
    </div>

    <div className="topbar-right">
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
      </button>

      <div className="status-pills" aria-live="polite">
        <span
          className="pill"
          title={descripcionModo(modo, duracionCooldown)}
        >
          <small>Modo</small>
          <strong>{labelModo(modo)}</strong>
        </span>
        <span className="pill pill-timer" aria-live="polite">
          <small>Tiempo</small>
          <strong className="timer-digits">
            {showTimer ? (
              <>
                {Math.ceil(Number(tiempoRestante))
                  .toString()
                  .padStart(2, '0')}
                <span className="timer-unit">s</span>
              </>
            ) : (
              <span className="timer-idle">—</span>
            )}
          </strong>
        </span>
        <span className={`pill ${pirOn ? 'pill-ok' : 'pill-off'}`}>
          <small>PIR</small>
          <strong>{pirOn ? 'Activo' : 'Bloqueado'}</strong>
        </span>
        <span
          className={`pill ${enHoraPico ? 'pill-peak' : 'pill-offpeak'}`}
          title={
            enHoraPico
              ? `Política pico: peatonal ${duracionRojo}s · cooldown ${duracionCooldown}s`
              : `Fuera de pico: peatonal ${duracionRojo}s · cooldown ${duracionCooldown}s`
          }
        >
          <small>Tráfico</small>
          <strong>{enHoraPico ? franjaActiva || 'Hora pico' : 'Flujo normal'}</strong>
        </span>
        <span className={`pill ${bridgeOk ? 'pill-ok' : 'pill-off'}`}>
          <small>Bridge</small>
          <strong>{bridgeOk ? 'Online' : 'Offline'}</strong>
        </span>
      </div>
    </div>
  </header>
  );
};
