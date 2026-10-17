/*
 * SemaforoIA — Firmware principal (Arduino Uno)
 * Captura PIR/pulsador por Serial JSON y aplica comandos de luces/buzzer.
 * Baudios: 115200
 *
 * Si en REPOSO ves ROJO en vez de VERDE en el semáforo vehicular:
 *   pon SWAP_VEH_RG en 1, vuelve a subir este sketch.
 *
 * Si los LEDs se comportan al revés (se apagan cuando deberían encenderse):
 *   pon LED_ACTIVE_LOW en 1.
 */

// --- Ajustes de hardware (cámbialos si hace falta) ---
const int SWAP_VEH_RG = 0;      // 1 = intercambia rojo/verde vehicular
const int LED_ACTIVE_LOW = 0;   // 1 = módulos common-anode (activo en LOW)
const int BUZZER_ACTIVE_LOW = 0;

const int PIN_PIR = 2;
const int PIN_BUTTON = 3;
const int PIN_BUZZER = 4;
const int PIN_VEH_R = 5;
const int PIN_VEH_Y = 6;
const int PIN_VEH_G = 7;
const int PIN_PEA_R = 8;
const int PIN_PEA_G = 9;

const unsigned long DEBOUNCE_MS = 50;
const unsigned long PIR_STABLE_MS = 80;
const unsigned long BOOT_IGNORE_MS = 5000;   // ignora sensores tras reset/USB
const unsigned long EVENT_COOLDOWN_MS = 3000; // no reenviar PIR/botón tan seguido
const unsigned long HEARTBEAT_MS = 2000;
const unsigned long COMMAND_TIMEOUT_MS = 8000;

String serialBuffer = "";
unsigned long lastHeartbeat = 0;
unsigned long lastCommandMs = 0;
unsigned long lastEventMs = 0;
unsigned long bootMs = 0;

int lastPir = LOW;
int pirHighSince = 0;
int lastButtonStable = HIGH;
int lastButtonReading = HIGH;
unsigned long lastButtonChangeMs = 0;

String currentVeh = "VERDE";
String currentPea = "ROJO";
int currentBuzzer = 0;

int ledLevel(bool on) {
  if (LED_ACTIVE_LOW) {
    return on ? LOW : HIGH;
  }
  return on ? HIGH : LOW;
}

int buzzerLevel(bool on) {
  if (BUZZER_ACTIVE_LOW) {
    return on ? LOW : HIGH;
  }
  return on ? HIGH : LOW;
}

int pinVehRojo() {
  return SWAP_VEH_RG ? PIN_VEH_G : PIN_VEH_R;
}

int pinVehVerde() {
  return SWAP_VEH_RG ? PIN_VEH_R : PIN_VEH_G;
}

void escribirVehicular(bool rojo, bool amarillo, bool verde) {
  digitalWrite(pinVehRojo(), ledLevel(rojo));
  digitalWrite(PIN_VEH_Y, ledLevel(amarillo));
  digitalWrite(pinVehVerde(), ledLevel(verde));
}

void escribirPeatonal(bool rojo, bool verde) {
  digitalWrite(PIN_PEA_R, ledLevel(rojo));
  digitalWrite(PIN_PEA_G, ledLevel(verde));
}

void aplicarLuces(const String& veh, const String& pea, int buzzer) {
  currentVeh = veh;
  currentPea = pea;
  currentBuzzer = buzzer;

  if (veh == "ROJO") {
    escribirVehicular(true, false, false);
  } else if (veh == "AMARILLO") {
    escribirVehicular(false, true, false);
  } else {
    // VERDE (o valor desconocido → estado seguro)
    escribirVehicular(false, false, true);
  }

  if (pea == "VERDE") {
    escribirPeatonal(false, true);
  } else {
    escribirPeatonal(true, false);
  }

  digitalWrite(PIN_BUZZER, buzzerLevel(buzzer != 0));
}

void estadoSeguro() {
  aplicarLuces("VERDE", "ROJO", 0);
}

bool sensoresHabilitados() {
  return (millis() - bootMs) >= BOOT_IGNORE_MS;
}

void emitirEvento(const char* source) {
  if (!sensoresHabilitados()) {
    return;
  }
  if ((millis() - lastEventMs) < EVENT_COOLDOWN_MS) {
    return;
  }
  lastEventMs = millis();
  Serial.print(F("{\"type\":\"event\",\"source\":\""));
  Serial.print(source);
  Serial.print(F("\",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void emitirHeartbeat() {
  int pir = digitalRead(PIN_PIR) == HIGH ? 1 : 0;
  int button = digitalRead(PIN_BUTTON) == LOW ? 1 : 0;
  Serial.print(F("{\"type\":\"heartbeat\",\"pir\":"));
  Serial.print(pir);
  Serial.print(F(",\"button\":"));
  Serial.print(button);
  Serial.print(F(",\"veh\":\""));
  Serial.print(currentVeh);
  Serial.print(F("\",\"pea\":\""));
  Serial.print(currentPea);
  Serial.println(F("\"}"));
}

String extraerCampo(const String& json, const char* key) {
  String needle = String("\"") + key + "\":";
  int idx = json.indexOf(needle);
  if (idx < 0) {
    return "";
  }
  idx += needle.length();
  while (idx < (int)json.length() && json[idx] == ' ') {
    idx++;
  }
  if (idx < (int)json.length() && json[idx] == '\"') {
    int end = json.indexOf('\"', idx + 1);
    if (end < 0) return "";
    return json.substring(idx + 1, end);
  }
  int end = idx;
  while (end < (int)json.length() && json[end] != ',' && json[end] != '}') {
    end++;
  }
  return json.substring(idx, end);
}

void procesarComando(const String& line) {
  // Ignora telemetría propia u otros JSON sin comando de luces
  if (line.indexOf("\"veh\"") < 0 || line.indexOf("\"pea\"") < 0) {
    return;
  }
  String veh = extraerCampo(line, "veh");
  String pea = extraerCampo(line, "pea");
  String buzzerRaw = extraerCampo(line, "buzzer");
  if (veh.length() == 0 || pea.length() == 0) {
    return;
  }
  veh.toUpperCase();
  pea.toUpperCase();
  int buzzer = buzzerRaw.toInt();
  aplicarLuces(veh, pea, buzzer);
  lastCommandMs = millis();
}

void leerSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        procesarComando(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
      if (serialBuffer.length() > 200) {
        serialBuffer = "";
      }
    }
  }
}

void leerSensores() {
  if (!sensoresHabilitados()) {
    lastPir = digitalRead(PIN_PIR);
    lastButtonReading = digitalRead(PIN_BUTTON);
    lastButtonStable = lastButtonReading;
    pirHighSince = 0;
    return;
  }

  int pir = digitalRead(PIN_PIR);
  if (pir == HIGH && lastPir == LOW) {
    pirHighSince = millis(); // posible flanco de subida
  }
  if (pir == HIGH && pirHighSince > 0 && (millis() - pirHighSince) >= PIR_STABLE_MS) {
    emitirEvento("pir");
    pirHighSince = 0; // un evento hasta que el PIR baje
  }
  if (pir == LOW) {
    pirHighSince = 0;
  }
  lastPir = pir;

  int reading = digitalRead(PIN_BUTTON);
  if (reading != lastButtonReading) {
    lastButtonChangeMs = millis();
    lastButtonReading = reading;
  }
  if ((millis() - lastButtonChangeMs) > DEBOUNCE_MS) {
    if (reading != lastButtonStable) {
      lastButtonStable = reading;
      if (lastButtonStable == LOW) {
        emitirEvento("button");
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_VEH_R, OUTPUT);
  pinMode(PIN_VEH_Y, OUTPUT);
  pinMode(PIN_VEH_G, OUTPUT);
  pinMode(PIN_PEA_R, OUTPUT);
  pinMode(PIN_PEA_G, OUTPUT);

  digitalWrite(PIN_BUZZER, buzzerLevel(false));
  estadoSeguro();

  bootMs = millis();
  lastCommandMs = millis();
  lastEventMs = 0;

  Serial.println(F("{\"type\":\"boot\",\"device\":\"semaforo_ia\"}"));
}

void loop() {
  leerSerial();
  leerSensores();

  if (millis() - lastHeartbeat >= HEARTBEAT_MS) {
    emitirHeartbeat();
    lastHeartbeat = millis();
  }

  // Solo vuelve a seguro si el bridge dejó de mandar comandos
  if (millis() - lastCommandMs >= COMMAND_TIMEOUT_MS) {
    estadoSeguro();
    lastCommandMs = millis();
  }
}
