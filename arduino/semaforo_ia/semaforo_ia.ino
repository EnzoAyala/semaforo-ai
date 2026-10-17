/*
 * SemaforoIA — Firmware principal (Arduino Uno)
 * Captura PIR/pulsador por Serial JSON y aplica comandos de luces/buzzer.
 * Baudios: 115200
 */
#include <Arduino.h>


const int PIN_PIR = 2;
const int PIN_BUTTON = 3;
const int PIN_BUZZER = 4;
const int PIN_VEH_R = 5;
const int PIN_VEH_Y = 6;
const int PIN_VEH_G = 7;
const int PIN_PEA_R = 8;
const int PIN_PEA_G = 9;

const unsigned long DEBOUNCE_MS = 50;
const unsigned long HEARTBEAT_MS = 2000;
const unsigned long COMMAND_TIMEOUT_MS = 5000;

String serialBuffer = "";
unsigned long lastHeartbeat = 0;
unsigned long lastCommandMs = 0;

int lastPir = LOW;
int lastButtonStable = HIGH;
int lastButtonReading = HIGH;
unsigned long lastButtonChangeMs = 0;

String currentVeh = "VERDE";
String currentPea = "ROJO";
int currentBuzzer = 0;

void apagarVehicular() {
  digitalWrite(PIN_VEH_R, LOW);
  digitalWrite(PIN_VEH_Y, LOW);
  digitalWrite(PIN_VEH_G, LOW);
}

void apagarPeatonal() {
  digitalWrite(PIN_PEA_R, LOW);
  digitalWrite(PIN_PEA_G, LOW);
}

void aplicarLuces(const String& veh, const String& pea, int buzzer) {
  currentVeh = veh;
  currentPea = pea;
  currentBuzzer = buzzer;

  apagarVehicular();
  if (veh == "ROJO") {
    digitalWrite(PIN_VEH_R, HIGH);
  } else if (veh == "AMARILLO") {
    digitalWrite(PIN_VEH_Y, HIGH);
  } else {
    digitalWrite(PIN_VEH_G, HIGH);
  }

  apagarPeatonal();
  if (pea == "VERDE") {
    digitalWrite(PIN_PEA_G, HIGH);
  } else {
    digitalWrite(PIN_PEA_R, HIGH);
  }

  digitalWrite(PIN_BUZZER, buzzer ? HIGH : LOW);
}

void estadoSeguro() {
  aplicarLuces("VERDE", "ROJO", 0);
}

void emitirEvento(const char* source) {
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
  Serial.println(F("}"));
}

String extraerCampo(const String& json, const char* key) {
  String needle = String("\"") + key + "\":";
  int idx = json.indexOf(needle);
  if (idx < 0) {
    return "";
  }
  idx += needle.length();
  while (idx < (int)json.length() && (json[idx] == ' ' || json[idx] == '\"')) {
    if (json[idx] == '\"') {
      int end = json.indexOf('\"', idx + 1);
      if (end < 0) return "";
      return json.substring(idx + 1, end);
    }
    idx++;
  }
  int end = idx;
  while (end < (int)json.length() && json[end] != ',' && json[end] != '}') {
    end++;
  }
  return json.substring(idx, end);
}

void procesarComando(const String& line) {
  String veh = extraerCampo(line, "veh");
  String pea = extraerCampo(line, "pea");
  String buzzerRaw = extraerCampo(line, "buzzer");
  if (veh.length() == 0 || pea.length() == 0) {
    return;
  }
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
  int pir = digitalRead(PIN_PIR);
  if (pir == HIGH && lastPir == LOW) {
    emitirEvento("pir");
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
  estadoSeguro();
  lastCommandMs = millis();
  Serial.println(F("{\"type\":\"boot\",\"device\":\"semaforo_ia\"}"));
}

void loop() {
  leerSerial();
  leerSensores();

  if (millis() - lastHeartbeat >= HEARTBEAT_MS) {
    emitirHeartbeat();
    lastHeartbeat = millis();
  }

  if (millis() - lastCommandMs >= COMMAND_TIMEOUT_MS) {
    estadoSeguro();
    lastCommandMs = millis();
  }
}
