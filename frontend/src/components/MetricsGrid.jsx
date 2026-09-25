import React from 'react';

export const MetricsGrid = ({ modo, tiempoRestante }) => (
  <div className="metrics-grid">
    <div className="metric-card">
      <label>MODO ACTUAL</label>
      <value style={{ color: '#38bdf8' }}>{modo}</value>
    </div>
    <div className="metric-card">
      <label>TEMPORIZADOR</label>
      <value style={{ color: '#f59e0b' }}>{tiempoRestante}s</value>
    </div>
    <div className="metric-card">
      <label>SENSOR PIR</label>
      <value style={{ color: modo === 'COOLDOWN' ? '#ef4444' : '#22c55e' }}>
        {modo === 'COOLDOWN' ? 'BLOQUEADO' : 'ACTIVO'}
      </value>
    </div>
  </div>
);