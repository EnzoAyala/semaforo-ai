export const Header = ({ modo, tiempoRestante, bridgeOk }) => (
  <header className="stage-topbar">
    <div className="brand-block">
      <p className="brand-name">SemaforoIA</p>
      <p className="brand-tag">Control peatonal IoT</p>
    </div>

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
  </header>
);
