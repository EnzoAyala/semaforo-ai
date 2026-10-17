import './App.css';

import { useSemaforo } from './hooks/useSemaforo';
import { Header } from './components/Header';
import { MetricsGrid } from './components/MetricsGrid';
import { TrafficLight } from './components/TrafficLight';
import { StatusBanner } from './components/StatusBanner';
import { EmailAlertCard } from './components/EmailAlertCard';
import { Chatbot } from './components/Chatbot';
import { HistoryPanel } from './components/HistoryPanel';

export function App() {
  const { estado, mensaje, setMensaje, solicitarCruce } = useSemaforo();

  return (
    <div className="app-container">
      <Header />

      <div className="dashboard-grid">
        <section className="column-left">
          <Chatbot />
        </section>

        <section className="column-right">
          <MetricsGrid
            modo={estado.modo}
            tiempoRestante={estado.tiempo_restante_seg}
          />

          <TrafficLight
            luzVehicular={estado.luz_vehicular}
            luzPeatonal={estado.luz_peatonal}
          />

          <div className="action-container">
            <button className="btn btn-primary btn-sensor" onClick={solicitarCruce}>
              Prueba manual (UI)
            </button>
          </div>

          <StatusBanner mensaje={mensaje} />

          <EmailAlertCard
            modo={estado.modo}
            onNotificar={setMensaje}
          />
        </section>
      </div>

      <HistoryPanel refreshKey={estado.modo} />
    </div>
  );
}

export default App;