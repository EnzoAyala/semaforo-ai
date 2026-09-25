"""
Servidor API REST (FastAPI) para conectar el Backend con el Frontend en React.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from src.logic import SemaforoInteligente
from src.automation import enviar_correo_alerta

app = FastAPI(title="SemaforoIA API", version="2.0.0")

# Configuración nativa de CORS para comunicarse con React en http://localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia global del semáforo inteligente
semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)


class SolicitudPeaton(BaseModel):
    tiempo_actual: Optional[float] = None


class SolicitudEmail(BaseModel):
    destinatario: str
    asunto: str
    mensaje_adicional: Optional[str] = ""


@app.get("/api/estado")
def obtener_estado():
    """Retorna el estado actual del semáforo."""
    return semaforo.obtener_resumen()


@app.post("/api/solicitar-cruce")
def solicitar_cruce(datos: SolicitudPeaton):
    """Simula la activación del sensor PIR."""
    aceptado = semaforo.solicitar_cruce(datos.tiempo_actual)
    resumen = semaforo.obtener_resumen(datos.tiempo_actual)
    return {
        "solicitud_aceptada": aceptado,
        "resumen": resumen
    }


@app.post("/api/enviar-alerta")
def enviar_alerta(datos: SolicitudEmail):
    """Ejecuta el módulo de envío de correo automático."""
    resumen = semaforo.obtener_resumen()
    exito = enviar_correo_alerta(
        destinatario=datos.destinatario,
        asunto=datos.asunto,
        resumen_semaforo=resumen,
        mensaje_adicional=datos.mensaje_adicional
    )
    if not exito:
        raise HTTPException(status_code=500, detail="Error al procesar el envío del correo")
    return {"status": "ok", "mensaje": f"Correo enviado a {datos.destinatario}"}