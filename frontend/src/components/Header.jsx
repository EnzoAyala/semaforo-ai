import { Moon, Sun } from 'lucide-react';

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
}) => (
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
        <span className="pill">
          <small>Modo</small>
          <strong>{modo || '—'}</strong>
        </span>
        <span className="pill pill-timer" aria-live="polite">
          <small>Tiempo</small>
          <strong className="timer-digits">
            {Math.max(0, Math.ceil(Number(tiempoRestante) || 0))
              .toString()
              .padStart(2, '0')}
            <span className="timer-unit">s</span>
          </strong>
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
