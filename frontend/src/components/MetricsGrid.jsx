export const MetricsGrid = ({ modo, tiempoRestante }) => (
  <div className="metrics-grid">
    <div className="metric-card">
      <label>MODO ACTUAL</label>
      <span className="metric-value" style={{ color: '#0284c7' }}>{modo}</span>
    </div>
    <div className="metric-card">
      <label>TEMPORIZADOR</label>
      <span className="metric-value" style={{ color: '#d97706' }}>{tiempoRestante}s</span>
    </div>
    <div className="metric-card">
      <label>SENSOR PIR</label>
      <span className="metric-value" style={{ color: modo === 'COOLDOWN' ? '#dc2626' : '#16a34a' }}>
        {modo === 'COOLDOWN' ? 'BLOQUEADO' : 'ACTIVO'}
      </span>
    </div>
  </div>
);