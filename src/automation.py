"""
Módulo de Automatización de Alertas por Email (SemaforoIA).
Soporta envío SMTP real mediante Gmail y modo simulación para CI/CD.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def enviar_correo_alerta(
    destinatario: str,
    asunto: str,
    resumen_semaforo: dict,
    mensaje_adicional: str = ""
) -> bool:
    """
    Envía un correo automático con el estado actual del semáforo.
    Obtiene las credenciales desde variables de entorno.
    """
    remitente = os.getenv("SMTP_EMAIL", "alertas.semaforo.ia@gmail.com")
    password = os.getenv("SMTP_PASSWORD", "")
    servidor_smtp = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    puerto_smtp = int(os.getenv("SMTP_PORT", "587"))

    msg = MIMEMultipart()
    msg["From"] = remitente
    msg["To"] = destinatario
    msg["Subject"] = f"🚨 [SemaforoIA Alert] {asunto}"

    cuerpo_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #ef4444;">🚨 Alerta de Tránsito Peatonal - SemaforoIA</h2>
          <p>Reporte automático generado por la plataforma IoT:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f1f5f9;"><td style="padding: 8px; font-weight: bold;">Modo Actual:</td><td style="padding: 8px;">{resumen_semaforo.get('modo', 'N/A')}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Luz Vehicular:</td><td style="padding: 8px;">{resumen_semaforo.get('luz_vehicular', 'N/A')}</td></tr>
            <tr style="background-color: #f1f5f9;"><td style="padding: 8px; font-weight: bold;">Luz Peatonal:</td><td style="padding: 8px;">{resumen_semaforo.get('luz_peatonal', 'N/A')}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">En Cooldown:</td><td style="padding: 8px;">{'Sí' if resumen_semaforo.get('en_cooldown') else 'No'}</td></tr>
            <tr style="background-color: #f1f5f9;"><td style="padding: 8px; font-weight: bold;">Tiempo Restante:</td><td style="padding: 8px;">{resumen_semaforo.get('tiempo_restante_seg', 0)}s</td></tr>
          </table>

          <p style="margin-top: 20px;"><b>Observación:</b> {mensaje_adicional or 'Evento registrado desde la plataforma web.'}</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">Módulo de Automatización - SemaforoIA 2026</p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(cuerpo_html, "html"))

    try:
        # Fallback a modo simulación si no se configuran variables de entorno
        if not password or password == "app_password_placeholder":
            print(f"📧 [MODO SIMULACIÓN] Correo preparado para: {destinatario} | Asunto: {asunto}")
            return True

        with smtplib.SMTP(servidor_smtp, puerto_smtp) as server:
            server.starttls()
            server.login(remitente, password)
            server.send_message(msg)
            print(f"✅ [SMTP EXITOSO] Correo enviado de forma real a: {destinatario}")
            return True

    except Exception as e:
        print(f"❌ Error al enviar correo SMTP: {e}")
        return False