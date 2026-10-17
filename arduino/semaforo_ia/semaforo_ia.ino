/*
 * SemaforoIA — Firmware principal (Arduino Uno)
 * Baudios: 115200
 *
 * Pines vehicular: R=D5, Y=D6, G=D10  (verde en D10; si antes usabas D7, mueve el cable)
 * Si en REPOSO ves ROJO en vez de VERDE: pon SWAP_VEH_RG = 1
 * Si los LEDs se invierten: pon LED_ACTIVE_LOW = 1
 */

const int SWAP_VEH_RG = 0;
const int LED_ACTIVE_LOW = 0;
const int BUZZER_ACTIVE_LOW = 0;

const int PIN_PIR = 2;
const int PIN_BUTTON = 3;
const int PIN_BUZZER = 4;
const int PIN_VEH_R = 5;
const int PIN_VEH_Y = 6;
const int PIN_VEH_G = 10;  // verde vehicular (antes D7)
const int PIN_PEA_R = 8;
const int PIN_PEA_G = 9;

const unsigned long DEBOUNCE_MS = 50;
const unsigned long PIR_STABLE_MS = 150;
const unsigned long BOOT_IGNORE_MS = 5000;
const unsigned long EVENT_COOLDOWN_MS = 4000;
const unsigned long HEARTBEAT_MS = 2000;
const unsigned long COMMAND_TIMEOUT_MS = 8000;
const unsigned long BEEP_MS = 220;

String serialBuffer = "";
unsigned long lastHeartbeat = 0;
unsigned long lastCommandMs = 0;
unsigned long lastEventMs = 0;
unsigned long bootMs = 0;
unsigned long beepUntil = 0;

int lastPir = LOW;
unsigned long pirHighSince = 0;
int lastButtonStable = HIGH;
int lastButtonReading = HIGH;
unsigned long lastButtonChangeMs = 0;

String currentVeh = "VERDE";
String currentPea = "ROJO";

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

void aplicarLuces(const String& veh, const String& pea) {
  currentVeh = veh;
  currentPea = pea;

  if (veh == "ROJO") {
    escribirVehicular(true, false, false);
  } else if (veh == "AMARILLO") {
    escribirVehicular(false, true, false);
  } else {
    escribirVehicular(false, false, true);
  }

  if (pea == "VERDE") {
    escribirPeatonal(false, true);
  } else {
    escribirPeatonal(true, false);
  }
}

void estadoSeguro() {
  aplicarLuces("VERDE", "ROJO");
}

void pitidoDeteccion() {
  digitalWrite(PIN_BUZZER, buzzerLevel(true));
  beepUntil = millis() + BEEP_MS;
}

void actualizarBuzzer() {
  if (beepUntil != 0 && millis() >= beepUntil) {
    digitalWrite(PIN_BUZZER, buzzerLevel(false));
    beepUntil = 0;
  }
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
  // El pitido lo confirma el bridge solo si la API acepta el cruce
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
  if (line.indexOf("\"veh\"") < 0 || line.indexOf("\"pea\"") < 0) {
    return;
  }
  String veh = extraerCampo(line, "veh");
  String pea = extraerCampo(line, "pea");
  if (veh.length() == 0 || pea.length() == 0) {
    return;
  }
  veh.toUpperCase();
  pea.toUpperCase();
  aplicarLuces(veh, pea);

  // buzzer:1 = pitido corto de confirmacion (no tono continuo)
  String buzzerRaw = extraerCampo(line, "buzzer");
  if (buzzerRaw.toInt() != 0) {
    pitidoDeteccion();
  }

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
    pirHighSince = millis();
  }
  if (pir == HIGH && pirHighSince > 0 && (millis() - pirHighSince) >= PIR_STABLE_MS) {
    emitirEvento("pir");
    pirHighSince = 0;
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
  beepUntil = 0;

  Serial.println(F("{\"type\":\"boot\",\"device\":\"semaforo_ia\"}"));
}

void loop() {
  leerSerial();
  leerSensores();
  actualizarBuzzer();

  if (millis() - lastHeartbeat >= HEARTBEAT_MS) {
    emitirHeartbeat();
    lastHeartbeat = millis();
  }

  if (millis() - lastCommandMs >= COMMAND_TIMEOUT_MS) {
    estadoSeguro();
    lastCommandMs = millis();
  }
}
