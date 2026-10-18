import { Moon, Sun } from 'lucide-react';

export const Header = ({ modo, tiempoRestante, bridgeOk, theme, onToggleTheme }) => (
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
        <span className="pill">
          <small>Tiempo</small>
          <strong>{Number(tiempoRestante || 0).toFixed(0)}s</strong>
        </span>
        <span className={`pill ${bridgeOk ? 'pill-ok' : 'pill-off'}`}>
          <small>Bridge</small>
          <strong>{bridgeOk ? 'Online' : 'Offline'}</strong>
        </span>
      </div>
    </div>
  </header>
);
