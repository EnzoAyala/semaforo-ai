# SemaforoIA — Informe IoT

Documento de presentación del proyecto: caso de uso, arquitectura, software, configuración y recorrido completo de los datos (captura → transmisión → almacenamiento → visualización).

---

## 1. Caso de uso

En avenidas con alto flujo vehicular, los semáforos peatonales suelen ciclar por tiempo fijo aunque no haya peatones. Eso genera frenadas innecesarias y congestión.

**SemaforoIA** detecta presencia con un sensor **PIR** (o un **pulsador** de cruce) en un **Arduino Uno**, envía el evento a una plataforma en el PC y solo entonces inicia el ciclo:

1. Amarillo vehicular (advertencia)
2. Rojo vehicular + verde peatonal
3. Cooldown (sensor bloqueado)
4. Retorno a reposo (verde vehicular / rojo peatonal)

La plataforma también:

- Persiste eventos y cambios de estado en **PostgreSQL**
- Muestra luces y métricas en un **dashboard React**
- Ofrece asistente (Gemini) y alertas por correo (SMTP)

---

## 2. Diagrama de arquitectura

```mermaid
flowchart LR
  subgraph campo [Campo]
    PIR[Sensor PIR]
    BTN[Pulsador]
    LED[Modulos semaforo + buzzer]
    UNO[Arduino Uno]
    PIR --> UNO
    BTN --> UNO
    UNO --> LED
  end

  subgraph pc [PC host]
    BR[bridge_serial.py]
    UNO -->|"USB Serial JSON"| BR
  end

  subgraph docker [Docker Compose]
    API[FastAPI :8000]
    DB[(PostgreSQL :5432)]
    WEB[Frontend React :5173]
    BR -->|"HTTP POST/GET"| API
    API --> DB
    API -->|"REST + WebSocket"| WEB
    BR -->|"comandos luces"| UNO
  end
```

### Capas

| Capa | Componente | Rol |
|------|------------|-----|
| Captura / actuación | Arduino + PIR + botón + LEDs + buzzer | Lee sensores y aplica luces |
| Transmisión | USB Serial + `src/bridge_serial.py` | Traduce Serial ↔ HTTP |
| Plataforma | FastAPI (`src/api.py`) + lógica FSM (`src/logic.py`) | Decide estados y expone API |
| Almacenamiento | PostgreSQL (`db/init.sql`) | Guarda eventos e historial |
| Visualización | React (`frontend/`) | Luces en vivo, modal de datos, chat |

---

## 3. Software utilizado

| Software | Uso |
|----------|-----|
| **Arduino IDE** | Compilar y subir el firmware `.ino` |
| **Python 3.11+** | API, bridge serial, tests |
| **Docker Desktop** | Contenedores de Postgres, API y frontend |
| **VS Code / Cursor** | Desarrollo y terminal |
| **Node.js + Vite** | Build del dashboard (también vía Docker) |
| **Navegador** | Visualización en `http://localhost:5173` |
| **PostgreSQL 16** (imagen Docker) | Base de datos |
| **Gemini / Groq / xAI** (opcional) | Chatbot del asistente |

No se usó MQTT ni WiFi en el Arduino: la transmisión es **por cable USB** hacia el PC (válido como enlace de red local hacia la plataforma).

---

## 4. Código principal

| Ruta | Descripción |
|------|-------------|
| `arduino/semaforo_ia/semaforo_ia.ino` | Firmware: captura PIR/botón, pitido al cruce aceptado, luces |
| `arduino/prueba_pines/prueba_pines.ino` | Prueba rápida de cables/LEDs |
| `src/bridge_serial.py` | Bridge USB ↔ HTTP |
| `src/api.py` | REST + WebSocket + ingest de sensor + historial |
| `src/logic.py` | Máquina de estados del semáforo |
| `src/storage.py` | Persistencia SQLAlchemy → PostgreSQL |
| `src/automation.py` | Envío de alertas SMTP |
| `src/ai_assistant.py` | Asistente conversacional |
| `frontend/src/App.jsx` | Escenario principal (semáforo a pantalla) |
| `frontend/src/components/HistoryModal.jsx` | Registro + gráficos |
| `frontend/src/components/AssistDrawer.jsx` | Chat + correo en panel flotante |
| `db/init.sql` | Creación de tablas |
| `scripts/start.ps1` | Un comando: Docker + bridge |

---

## 5. Archivos de configuración

| Archivo | Contenido relevante |
|---------|---------------------|
| `.env` | `DATABASE_URL`, `POSTGRES_*`, `SERIAL_PORT`, `API_BASE_URL`, claves IA/SMTP |
| `.env.example` | Plantilla sin secretos |
| `docker-compose.yml` | Servicios `db`, `api`, `frontend` y volumen `pgdata` |
| `Dockerfile` | Imagen de la API (`uvicorn src.api:app`) |
| `frontend/Dockerfile` | Build Vite + nginx |
| `frontend/nginx.conf` | Servir el SPA |
| `requirements.txt` | Dependencias Python (FastAPI, psycopg, pyserial, …) |
| `frontend/package.json` | Dependencias React/Vite |
| `hardware/MONTAJE.md` | Pines y cableado |

Ejemplo de variables críticas (valores de desarrollo):

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=user
POSTGRES_DB=semaforo
DATABASE_URL=postgresql+psycopg://postgres:user@localhost:5432/semaforo
SERIAL_PORT=COM5
API_BASE_URL=http://localhost:8000
```

---

## 6. Demostración del recorrido completo de los datos

### Paso A — Captura

1. El peatón activa el **PIR** o el **pulsador**.
2. El Arduino emite por Serial (115200 baudios), por ejemplo:

```json
{"type":"event","source":"pir","ts":12345}
```

### Paso B — Transmisión

1. `bridge_serial.py` lee el puerto `COMx`.
2. Hace `POST /api/sensor/evento` hacia la API.
3. Si el cruce se acepta, el bridge manda un pitido de confirmación (`buzzer: 1` una sola vez) y luego comandos de luces:

```json
{"veh":"AMARILLO","pea":"ROJO","buzzer":0}
```

### Paso C — Recepción y almacenamiento

1. FastAPI ejecuta la FSM (`solicitar_cruce` / `actualizar_estado`).
2. Guarda en PostgreSQL:
   - `sensor_events` → detección (fuente, aceptado, modo)
   - `state_changes` → cada transición de luces/modo
   - `sensor_health` → latidos del bridge
3. Diffunde el estado por WebSocket `/ws/estado`.

### Paso D — Visualización

1. El dashboard muestra los semáforos a pantalla completa en tiempo real.
2. La burbuja **Datos** abre el modal de registro con:
   - **Gráfico de área**: eventos por hora (flujo temporal)
   - **Barras**: conteo por fuente (`pir` / `button` / `ui`)
   - Tabla de detecciones y timeline de estados
3. Consulta directa opcional:

```powershell
docker compose exec -T db psql -U postgres -d semaforo -c "SELECT id, source, accepted, modo_resultante FROM sensor_events ORDER BY id DESC LIMIT 10;"
```

### Cómo reproducir la demo en vivo

```powershell
# 1) Arduino conectado y firmware semaforo_ia subido
# 2) Docker Desktop abierto
.\scripts\start.ps1

# 3) Abrir dashboard
# http://localhost:5173

# 4) Pulsar el botón físico o activar el PIR
# 5) Abrir la burbuja "Datos" y ver el nuevo registro/gráfico
```

Checklist de requisitos IoT:

1. **Captura** — PIR / pulsador en Arduino  
2. **Transmisión** — USB Serial → bridge → HTTP  
3. **Recepción y almacenamiento** — FastAPI + PostgreSQL en contenedores  
4. **Visualización** — dashboard + modal de gráficos/historial  

---

## 7. Montaje rápido de hardware

Ver guía detallada: [hardware/MONTAJE.md](hardware/MONTAJE.md)

| Señal | Pin |
|-------|-----|
| PIR OUT | D2 |
| Pulsador | D3 → GND |
| Buzzer | D4 |
| Vehicular R / Y / G | D5 / D6 / **D10** |
| Peatonal R / G | D8 / D9 |

---

## 8. Referencias del repositorio

- README general del producto: [README.md](README.md)
- Inicio automático: [scripts/start.ps1](scripts/start.ps1)
- Esquema SQL: [db/init.sql](db/init.sql)
