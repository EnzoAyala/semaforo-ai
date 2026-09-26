import './App.css';

import { useSemaforo } from './hooks/useSemaforo';
import { Header } from './components/Header';
import { MetricsGrid } from './components/MetricsGrid';
import { TrafficLight } from './components/TrafficLight';
import { StatusBanner } from './components/StatusBanner';
import { EmailAlertCard } from './components/EmailAlertCard';
import { Chatbot } from './components/Chatbot';

export function App() {
  const { estado, mensaje, setMensaje, solicitarCruce } = useSemaforo();

  return (
    <div className="app-container">
      <Header />

      <MetricsGrid 
        modo={estado.modo} 
        tiempoRestante={estado.tiempo_restante_seg} 
      />

      <TrafficLight 
        luzVehicular={estado.luz_vehicular} 
        luzPeatonal={estado.luz_peatonal} 
      />

      <StatusBanner mensaje={mensaje} />

      <div className="button-group" style={{ margin: '20px 0' }}>
        <button className="btn btn-primary" onClick={solicitarCruce}>
          🚶 Simular Peatón (Sensor PIR)
        </button>
      </div>

      <EmailAlertCard 
        modo={estado.modo} 
        onNotificar={setMensaje} 
      />

      <Chatbot />
    </div>
  );
}

export default App;
