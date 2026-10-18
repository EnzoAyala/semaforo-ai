/*
 * SemaforoIA — Prueba rápida de pines
 * Enciende cada LED 1 s y hace un beep corto en el buzzer.
 * Pines: PIR D2, boton D3, buzzer D4, veh D5/D6/D10, pea D8/D9
 */
# include <Arduino.h>

const int PIN_PIR = 2;
const int PIN_BUTTON = 3;
const int PIN_BUZZER = 4;
const int PIN_VEH_R = 5;
const int PIN_VEH_Y = 6;
const int PIN_VEH_G = 10;
const int PIN_PEA_R = 8;
const int PIN_PEA_G = 9;

const int LEDS[] = {PIN_VEH_R, PIN_VEH_Y, PIN_VEH_G, PIN_PEA_R, PIN_PEA_G};
const int NUM_LEDS = 5;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  for (int i = 0; i < NUM_LEDS; i++) {
    pinMode(LEDS[i], OUTPUT);
    digitalWrite(LEDS[i], LOW);
  }
  Serial.println(F("prueba_pines: iniciando ciclo LED + buzzer"));
}

void loop() {
  for (int i = 0; i < NUM_LEDS; i++) {
    digitalWrite(LEDS[i], HIGH);
    Serial.print(F("LED pin "));
    Serial.println(LEDS[i]);
    delay(1000);
    digitalWrite(LEDS[i], LOW);
  }

  digitalWrite(PIN_BUZZER, HIGH);
  Serial.println(F("buzzer ON"));
  delay(200);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println(F("buzzer OFF"));

  Serial.print(F("PIR="));
  Serial.print(digitalRead(PIN_PIR));
  Serial.print(F(" BUTTON="));
  Serial.println(digitalRead(PIN_BUTTON) == LOW ? 1 : 0);
  delay(500);
}
