/*
 * SemaforoIA - Firmware Arduino Uno
 * Baudios: 115200
 * PIR OUT D2 | Boton D3 (a GND, INPUT_PULLUP) | Buzzer D4
 * Veh R/Y/G = D5/D6/D10 | Pea R/G = D8/D9
 */

const int SWAP_VEH_RG = 0;
const int LED_ACTIVE_LOW = 0;
const int BUZZER_ACTIVE_LOW = 0;

const int PIN_PIR = 2;     // PIR OUT
const int PIN_BUTTON = 3;  // pulsador: senal a D3, otra pata a GND
const int PIN_BUZZER = 4;
const int PIN_VEH_R = 5;
const int PIN_VEH_Y = 6;
const int PIN_VEH_G = 10;
const int PIN_PEA_R = 8;
const int PIN_PEA_G = 9;

const unsigned long DEBOUNCE_MS = 40;
const unsigned long PIR_HOLD_MS = 150;
const unsigned long BOOT_IGNORE_MS = 4000;
const unsigned long BUTTON_GAP_MS = 500;
const unsigned long PIR_GAP_MS = 2000;
const unsigned long PIR_BLOCK_AFTER_BTN_MS = 3000;
const unsigned long HEARTBEAT_MS = 2000;
const unsigned long COMMAND_TIMEOUT_MS = 8000;
const unsigned long BEEP_MS = 220;

String serialBuffer = "";
unsigned long bootMs = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastCommandMs = 0;
unsigned long lastButtonEventMs = 0;
unsigned long lastPirEventMs = 0;
unsigned long blockPirUntil = 0;
unsigned long beepUntil = 0;
unsigned long pirRiseMs = 0;
bool buttonHeld = false;

int prevPir = LOW;
int btnStable = HIGH;
int btnReading = HIGH;
unsigned long btnChangeMs = 0;

String currentVeh = "VERDE";
String currentPea = "ROJO";

int ledOn(bool on) {
  if (LED_ACTIVE_LOW) return on ? LOW : HIGH;
  return on ? HIGH : LOW;
}

int buzzOn(bool on) {
  if (BUZZER_ACTIVE_LOW) return on ? LOW : HIGH;
  return on ? HIGH : LOW;
}

int pinR() { return SWAP_VEH_RG ? PIN_VEH_G : PIN_VEH_R; }
int pinG() { return SWAP_VEH_RG ? PIN_VEH_R : PIN_VEH_G; }

void setVeh(bool r, bool y, bool g) {
  digitalWrite(pinR(), ledOn(r));
  digitalWrite(PIN_VEH_Y, ledOn(y));
  digitalWrite(pinG(), ledOn(g));
}

void setPea(bool r, bool g) {
  digitalWrite(PIN_PEA_R, ledOn(r));
  digitalWrite(PIN_PEA_G, ledOn(g));
}

void aplicarLuces(const String& veh, const String& pea) {
  currentVeh = veh;
  currentPea = pea;
  if (veh == "ROJO") setVeh(true, false, false);
  else if (veh == "AMARILLO") setVeh(false, true, false);
  else setVeh(false, false, true);

  if (pea == "VERDE") setPea(false, true);
  else setPea(true, false);
}

void estadoSeguro() { aplicarLuces("VERDE", "ROJO"); }

void pitido() {
  digitalWrite(PIN_BUZZER, buzzOn(true));
  beepUntil = millis() + BEEP_MS;
}

void tickBuzzer() {
  if (beepUntil && millis() >= beepUntil) {
    digitalWrite(PIN_BUZZER, buzzOn(false));
    beepUntil = 0;
  }
}

void emitir(const char* source) {
  if (millis() - bootMs < BOOT_IGNORE_MS) return;
  Serial.print(F("{\"type\":\"event\",\"source\":\""));
  Serial.print(source);
  Serial.print(F("\",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

String campo(const String& json, const char* key) {
  String needle = String("\"") + key + "\":";
  int i = json.indexOf(needle);
  if (i < 0) return "";
  i += needle.length();
  while (i < (int)json.length() && json[i] == ' ') i++;
  if (i < (int)json.length() && json[i] == '\"') {
    int e = json.indexOf('\"', i + 1);
    if (e < 0) return "";
    return json.substring(i + 1, e);
  }
  int e = i;
  while (e < (int)json.length() && json[e] != ',' && json[e] != '}') e++;
  return json.substring(i, e);
}

void procesarComando(const String& line) {
  if (line.indexOf("\"veh\"") < 0 || line.indexOf("\"pea\"") < 0) return;
  String veh = campo(line, "veh");
  String pea = campo(line, "pea");
  if (veh.length() == 0 || pea.length() == 0) return;
  veh.toUpperCase();
  pea.toUpperCase();
  aplicarLuces(veh, pea);
  if (campo(line, "buzzer").toInt() != 0) pitido();
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
      if (serialBuffer.length() > 200) serialBuffer = "";
    }
  }
}

void leerBoton() {
  int raw = digitalRead(PIN_BUTTON);
  if (raw != btnReading) {
    btnChangeMs = millis();
    btnReading = raw;
  }
  if (millis() - btnChangeMs < DEBOUNCE_MS) return;
  if (raw == btnStable) {
    buttonHeld = (btnStable == LOW);
    return;
  }

  btnStable = raw;
  buttonHeld = (btnStable == LOW);

  // Flanco de pulsacion (HIGH -> LOW con pull-up)
  if (btnStable == LOW) {
    if (millis() - lastButtonEventMs < BUTTON_GAP_MS) return;
    lastButtonEventMs = millis();
    blockPirUntil = millis() + PIR_BLOCK_AFTER_BTN_MS;
    pirRiseMs = 0;
    emitir("button");
  }
}

void leerPir() {
  int pir = digitalRead(PIN_PIR);

  // Mientras el boton esta pulsado o recien se pulso, no emitir PIR
  // (la mano cerca del sensor suele dispararlo)
  if (buttonHeld || millis() < blockPirUntil) {
    prevPir = pir;
    pirRiseMs = 0;
    return;
  }

  if (pir == HIGH && prevPir == LOW) {
    pirRiseMs = millis();
  }

  if (pir == HIGH && pirRiseMs > 0 && (millis() - pirRiseMs) >= PIR_HOLD_MS) {
    if (millis() - lastPirEventMs >= PIR_GAP_MS) {
      lastPirEventMs = millis();
      emitir("pir");
    }
    pirRiseMs = 0;
  }

  if (pir == LOW) {
    pirRiseMs = 0;
  }

  prevPir = pir;
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

  digitalWrite(PIN_BUZZER, buzzOn(false));
  estadoSeguro();

  bootMs = millis();
  lastCommandMs = millis();
  lastButtonEventMs = 0;
  lastPirEventMs = 0;
  blockPirUntil = 0;
  buttonHeld = false;
  prevPir = digitalRead(PIN_PIR);
  btnReading = digitalRead(PIN_BUTTON);
  btnStable = btnReading;

  Serial.println(F("{\"type\":\"boot\",\"device\":\"semaforo_ia\"}"));
}

void loop() {
  leerSerial();

  if (millis() - bootMs >= BOOT_IGNORE_MS) {
    leerBoton(); // prioridad
    leerPir();
  }

  tickBuzzer();

  if (millis() - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = millis();
    Serial.print(F("{\"type\":\"heartbeat\",\"pir\":"));
    Serial.print(digitalRead(PIN_PIR) == HIGH ? 1 : 0);
    Serial.print(F(",\"button\":"));
    Serial.print(digitalRead(PIN_BUTTON) == LOW ? 1 : 0);
    Serial.println(F("}"));
  }

  if (millis() - lastCommandMs >= COMMAND_TIMEOUT_MS) {
    estadoSeguro();
    lastCommandMs = millis();
  }
}
