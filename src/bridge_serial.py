"""
Bridge USB Serial ↔ HTTP para SemaforoIA.

Lee eventos del Arduino Uno y los envía a la API.
Consulta el estado de la plataforma y reenvía comandos de luces/buzzer.

Uso (PowerShell):
  $env:SERIAL_PORT="COM3"
  $env:API_BASE_URL="http://localhost:8000"
  python -m src.bridge_serial
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Any, Dict, Optional

import httpx


def _env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


API_BASE_URL = _env("API_BASE_URL", "http://localhost:8000").rstrip("/")
SERIAL_PORT = _env("SERIAL_PORT", "COM3")
BAUD_RATE = int(_env("SERIAL_BAUD", "115200"))
DEVICE_ID = _env("DEVICE_ID", "arduino-uno")
POLL_INTERVAL = float(_env("POLL_INTERVAL", "0.4"))
EVENT_DEBOUNCE_SEC = float(_env("EVENT_DEBOUNCE_SEC", "2.5"))


def http_json(method: str, path: str, payload: Optional[dict] = None) -> Dict[str, Any]:
    url = f"{API_BASE_URL}{path}"
    if not url.startswith(("http://", "https://")):
        raise ValueError("API_BASE_URL debe usar http:// o https://")
    with httpx.Client(timeout=5.0) as client:
        response = client.request(method, url, json=payload)
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()


_last_event_at = 0.0
_pending_beep = False


def comando_desde_estado(estado: Dict[str, Any]) -> Dict[str, Any]:
    global _pending_beep
    veh = estado.get("luz_vehicular", "VERDE")
    pea = estado.get("luz_peatonal", "ROJO")
    # Pitido de un solo disparo solo si el cruce fue aceptado
    buzzer = 1 if _pending_beep else 0
    _pending_beep = False
    return {"veh": veh, "pea": pea, "buzzer": buzzer}


def enviar_evento(source: str) -> None:
    global _last_event_at, _pending_beep
    now = time.time()
    if (now - _last_event_at) < EVENT_DEBOUNCE_SEC:
        print(f"[evento] ignorado (debounce) source={source}")
        return
    _last_event_at = now

    resultado = http_json(
        "POST",
        "/api/sensor/evento",
        {"source": source, "device_id": DEVICE_ID},
    )
    aceptado = resultado.get("solicitud_aceptada")
    modo = (resultado.get("resumen") or {}).get("modo")
    if aceptado:
        _pending_beep = True
    print(f"[evento] source={source} aceptado={aceptado} modo={modo}")


def enviar_heartbeat(msg: Dict[str, Any]) -> None:
    http_json(
        "POST",
        "/api/sensor/heartbeat",
        {
            "pir": int(msg.get("pir", 0)),
            "button": int(msg.get("button", 0)),
            "device_id": DEVICE_ID,
        },
    )


def procesar_linea(line: str) -> None:
    line = line.strip()
    if not line or not line.startswith("{"):
        return
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        print(f"[serial] JSON inválido: {line}")
        return

    tipo = msg.get("type")
    if tipo == "event":
        source = str(msg.get("source", "")).lower()
        if source in {"pir", "button"}:
            enviar_evento(source)
    elif tipo == "heartbeat":
        enviar_heartbeat(msg)
    elif tipo == "boot":
        print(f"[serial] Arduino listo: {msg}")


def abrir_serial():
    try:
        import serial
    except ImportError as exc:
        raise SystemExit(
            "Falta pyserial. Ejecuta: pip install -r requirements.txt"
        ) from exc

    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.2)
    time.sleep(2.5)  # espera al reset del Uno al abrir el puerto
    ser.reset_input_buffer()
    return ser


def main() -> int:
    print(f"Bridge SemaforoIA | puerto={SERIAL_PORT} api={API_BASE_URL}")
    try:
        ser = abrir_serial()
    except Exception as exc:
        print(f"No se pudo abrir {SERIAL_PORT}: {exc}", file=sys.stderr)
        return 1

    # Partir siempre desde REPOSO al conectar el hardware
    try:
        reset = http_json("POST", "/api/reset")
        print(f"[api] reset → {reset.get('resumen', {}).get('modo')}")
    except (httpx.HTTPError, ValueError) as exc:
        print(f"[api] no se pudo resetear (¿está docker compose arriba?): {exc}")

    buffer = ""
    last_poll = 0.0
    last_cmd = ""

    try:
        while True:
            chunk = ser.read(ser.in_waiting or 1).decode("utf-8", errors="ignore")
            if chunk:
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    try:
                        procesar_linea(line)
                    except (httpx.HTTPError, ValueError) as exc:
                        print(f"[api] error: {exc}")

            now = time.time()
            if now - last_poll >= POLL_INTERVAL:
                last_poll = now
                try:
                    estado = http_json("GET", "/api/estado")
                    cmd = comando_desde_estado(estado)
                    line = json.dumps(cmd, separators=(",", ":")) + "\n"
                    ser.write(line.encode("utf-8"))
                    if line != last_cmd:
                        last_cmd = line
                        print(
                            f"[cmd] modo={estado.get('modo')} "
                            f"veh={cmd['veh']} pea={cmd['pea']} "
                            f"t={estado.get('tiempo_restante_seg')}s"
                        )
                except (httpx.HTTPError, ValueError) as exc:
                    print(f"[api] no disponible: {exc}")
            time.sleep(0.02)
    except KeyboardInterrupt:
        print("\nBridge detenido.")
    finally:
        ser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
