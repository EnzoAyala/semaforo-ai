import { useEffect, useState } from 'react';
import { MessageCircle, Database, Mail } from 'lucide-react';
import './App.css';

import { useSemaforo } from './hooks/useSemaforo';
import { usePhaseCountdown } from './hooks/usePhaseCountdown';
import { Header } from './components/layout/Header';
import { AssistDrawer } from './components/drawers/AssistDrawer';
import { SubscriptionDrawer } from './components/drawers/SubscriptionDrawer';
import { HistoryModal } from './components/modals/HistoryModal';
import { SimulationView } from './scene3d/SimulationView';
import { semaforoService } from './services/api';

const THEME_KEY = 'semaforoia-theme';

export function App() {
  const { estado, mensaje, setMensaje, aplicarResumen } = useSemaforo();
  const tiempoRestante = usePhaseCountdown(estado);
  const [assistOpen, setAssistOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const panelOpen = assistOpen || subOpen || historyOpen;
  const rightPanel =
    (assistOpen && 'assist') || (subOpen && 'sub') || (historyOpen && 'data') || '';

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

  const openOnly = (panel) => {
    setAssistOpen(panel === 'assist' ? (v) => !v : false);
    setSubOpen(panel === 'sub' ? (v) => !v : false);
    setHistoryOpen(panel === 'data' ? (v) => !v : false);
  };

  return (
    <div
      className={`stage stage-sim ${panelOpen ? 'stage-panel-open' : ''} ${
        rightPanel === 'assist' ? 'stage-assist' : ''
      } ${rightPanel === 'sub' ? 'stage-sub' : ''} ${
        rightPanel === 'data' ? 'stage-data' : ''
      }`}
      data-theme={theme}
      style={
        rightPanel === 'assist'
          ? { '--panel-open-w': 'var(--panel-assist-w)' }
          : rightPanel === 'sub'
            ? { '--panel-open-w': 'var(--panel-sub-w)' }
            : rightPanel === 'data'
              ? { '--panel-open-w': 'var(--panel-data-w)' }
              : { '--panel-open-w': '0px' }
      }
    >
      <div className="stage-glow" aria-hidden="true" />

      <div className="stage-shell">
        <div className="stage-primary">
          <Header
            modo={estado.modo}
            tiempoRestante={tiempoRestante}
            bridgeOk={bridgeOk}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            enHoraPico={Boolean(estado.en_hora_pico)}
            franjaActiva={estado.franja_activa}
            duracionRojo={estado.duracion_rojo}
            duracionCooldown={estado.duracion_cooldown}
          />

          <main className="stage-main">
            <SimulationView
              estado={estado}
              tiempoRestante={tiempoRestante}
              mensaje={mensaje}
              onNotificar={setMensaje}
              onEstado={aplicarResumen}
            />
          </main>
        </div>

        <AssistDrawer
          open={assistOpen}
          onClose={() => setAssistOpen(false)}
          onNotificar={setMensaje}
        />

        <SubscriptionDrawer
          open={subOpen}
          onClose={() => setSubOpen(false)}
          onNotificar={setMensaje}
        />

        <HistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          refreshKey={estado.modo}
        />
      </div>

      <div className="fab-stack" aria-label="Accesos rápidos">
        <button
          type="button"
          className={`fab ${assistOpen ? 'fab-active' : ''}`}
          onClick={() => openOnly('assist')}
          title="Asistente / chat"
        >
          <MessageCircle size={22} />
          <span>Chat</span>
        </button>
        <button
          type="button"
          className={`fab fab-mail ${subOpen ? 'fab-active' : ''}`}
          onClick={() => openOnly('sub')}
          title="Suscripción de alertas"
        >
          <Mail size={22} />
          <span>Alertas</span>
        </button>
        <button
          type="button"
          className={`fab fab-data ${historyOpen ? 'fab-active' : ''}`}
          onClick={() => openOnly('data')}
          title="Registro IoT"
        >
          <Database size={22} />
          <span>Datos</span>
        </button>
      </div>
    </div>
  );
}

export default App;
