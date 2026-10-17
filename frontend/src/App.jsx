import { useEffect, useState } from 'react';
import { MessageCircle, Database } from 'lucide-react';
import './App.css';

import { useSemaforo } from './hooks/useSemaforo';
import { Header } from './components/Header';
import { TrafficLight } from './components/TrafficLight';
import { StatusBanner } from './components/StatusBanner';
import { AssistDrawer } from './components/AssistDrawer';
import { HistoryModal } from './components/HistoryModal';
import { semaforoService } from './services/api';

const THEME_KEY = 'semaforoia-theme';

export function App() {
  const { estado, mensaje, setMensaje, solicitarCruce } = useSemaforo();
  const [assistOpen, setAssistOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const salud = await semaforoService.obtenerSaludSensor();
      if (alive) setBridgeOk(Boolean(salud?.bridge_connected));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="stage" data-theme={theme}>
      <div className="stage-glow" aria-hidden="true" />

      <Header
        modo={estado.modo}
        tiempoRestante={estado.tiempo_restante_seg}
        bridgeOk={bridgeOk}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="stage-main">
        <TrafficLight
          luzVehicular={estado.luz_vehicular}
          luzPeatonal={estado.luz_peatonal}
        />

        <div className="stage-actions">
          <button type="button" className="btn-cross" onClick={solicitarCruce}>
            Prueba manual
          </button>
          <StatusBanner mensaje={mensaje} />
        </div>
      </main>

      <div className="fab-stack" aria-label="Accesos rápidos">
        <button
          type="button"
          className={`fab ${assistOpen ? 'fab-active' : ''}`}
          onClick={() => {
            setHistoryOpen(false);
            setAssistOpen((v) => !v);
          }}
          title="Asistente y correo"
        >
          <MessageCircle size={22} />
          <span>Chat</span>
        </button>
        <button
          type="button"
          className={`fab fab-data ${historyOpen ? 'fab-active' : ''}`}
          onClick={() => {
            setAssistOpen(false);
            setHistoryOpen((v) => !v);
          }}
          title="Registro IoT"
        >
          <Database size={22} />
          <span>Datos</span>
        </button>
      </div>

      <AssistDrawer
        open={assistOpen}
        onClose={() => setAssistOpen(false)}
        modo={estado.modo}
        onNotificar={setMensaje}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        refreshKey={estado.modo}
      />
    </div>
  );
}

export default App;
