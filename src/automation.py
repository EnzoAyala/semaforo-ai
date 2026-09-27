"""
Módulo de Automatización de Alertas por Email (SemaforoIA).
Envío mediante Gmail SMTP con formato HTML para la plataforma IoT.
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
    Envía un correo automático con el estado actual del semáforo usando SMTP de Gmail.
    """
    remitente = os.getenv("SMTP_EMAIL", "rickayalatarazona@gmail.com")
    password = os.getenv("SMTP_PASSWORD", "yfzv ukfl vuss bwqf")
    servidor_smtp = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    puerto_smtp = int(os.getenv("SMTP_PORT", "587"))

    if not remitente or not password:
        print("❌ Configura SMTP_EMAIL y SMTP_PASSWORD para enviar correos.")
        return False

    msg = MIMEMultipart()
    msg["From"] = remitente
    msg["To"] = destinatario
    msg["Subject"] = f"🚨 [SemaforoIA Alert] {asunto}"

    cuerpo_html = f"""
    <html>
      <body style="margin: 0; padding: 0; background-color: #eef2f7; font-family: Arial, Helvetica, sans-serif; color: #1e293b;">

        <div style="padding: 35px 15px;">

          <div style="
            max-width: 620px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #dbe3ec;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(15, 23, 42, 0.10);
          ">

            <!-- Encabezado -->
            <div style="
              background-color: #fff5f5;
              border-bottom: 1px solid #fecaca;
              padding: 25px 30px;
            ">

              <div style="
                display: inline-block;
                background-color: #fee2e2;
                color: #dc2626;
                border: 1px solid #fecaca;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
              ">
                ● ALERTA DEL SISTEMA
              </div>

              <h2 style="
                margin: 0;
                color: #b91c1c;
                font-size: 24px;
                line-height: 1.3;
              ">
                🚨 Alerta de Tránsito Peatonal
              </h2>

              <p style="
                margin: 8px 0 0 0;
                color: #64748b;
                font-size: 14px;
              ">
                SemaforoIA · Plataforma IoT de Monitoreo
              </p>

            </div>


            <!-- Contenido -->
            <div style="padding: 30px;">

              <p style="
                margin: 0 0 25px 0;
                color: #475569;
                font-size: 15px;
                line-height: 1.6;
              ">
                Se ha generado una notificación automática desde la plataforma
                <strong style="color: #1e293b;">IoT de monitoreo SemaforoIA</strong>.
                A continuación se presenta el estado actual del sistema:
              </p>


              <!-- Estado del semáforo -->
              <div style="
                border: 1px solid #dbe3ec;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 25px;
              ">

                <div style="
                  background-color: #f8fafc;
                  border-bottom: 1px solid #dbe3ec;
                  padding: 13px 16px;
                  font-size: 14px;
                  font-weight: bold;
                  color: #334155;
                ">
                  📊 Estado del sistema
                </div>


                <!-- Modo -->
                <div style="
                  padding: 14px 16px;
                  border-bottom: 1px solid #e2e8f0;
                ">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="
                        width: 50%;
                        color: #64748b;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        Modo actual
                      </td>
                      <td style="
                        width: 50%;
                        text-align: right;
                        color: #0f172a;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        {resumen_semaforo.get('modo', 'N/A')}
                      </td>
                    </tr>
                  </table>
                </div>


                <!-- Luz vehicular -->
                <div style="
                  padding: 14px 16px;
                  border-bottom: 1px solid #e2e8f0;
                  background-color: #fafbfc;
                ">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="
                        width: 50%;
                        color: #64748b;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        🚗 Luz vehicular
                      </td>
                      <td style="
                        width: 50%;
                        text-align: right;
                        color: #0f172a;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        {resumen_semaforo.get('luz_vehicular', 'N/A')}
                      </td>
                    </tr>
                  </table>
                </div>


                <!-- Luz peatonal -->
                <div style="
                  padding: 14px 16px;
                  border-bottom: 1px solid #e2e8f0;
                ">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="
                        width: 50%;
                        color: #64748b;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        🚶 Luz peatonal
                      </td>
                      <td style="
                        width: 50%;
                        text-align: right;
                        color: #0f172a;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        {resumen_semaforo.get('luz_peatonal', 'N/A')}
                      </td>
                    </tr>
                  </table>
                </div>


                <!-- Cooldown -->
                <div style="
                  padding: 14px 16px;
                  border-bottom: 1px solid #e2e8f0;
                  background-color: #fafbfc;
                ">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="
                        width: 50%;
                        color: #64748b;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        ⏱️ En cooldown
                      </td>
                      <td style="
                        width: 50%;
                        text-align: right;
                        color: #0f172a;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        {'Sí' if resumen_semaforo.get('en_cooldown') else 'No'}
                      </td>
                    </tr>
                  </table>
                </div>


                <!-- Tiempo restante -->
                <div style="padding: 14px 16px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="
                        width: 50%;
                        color: #64748b;
                        font-size: 13px;
                        font-weight: bold;
                      ">
                        ⏳ Tiempo restante
                      </td>
                      <td style="
                        width: 50%;
                        text-align: right;
                        color: #dc2626;
                        font-size: 16px;
                        font-weight: bold;
                      ">
                        {resumen_semaforo.get('tiempo_restante_seg', 0)}s
                      </td>
                    </tr>
                  </table>
                </div>

              </div>


              <!-- Observación -->
              <div style="
                border: 1px solid #dbe3ec;
                border-left: 4px solid #ef4444;
                border-radius: 8px;
                background-color: #f8fafc;
                padding: 18px;
              ">

                <p style="
                  margin: 0 0 8px 0;
                  color: #334155;
                  font-size: 14px;
                  font-weight: bold;
                ">
                  📝 Observación del sistema
                </p>

                <p style="
                  margin: 0;
                  color: #64748b;
                  font-size: 14px;
                  line-height: 1.6;
                ">
                  {mensaje_adicional or 'Evento registrado desde la interfaz de control.'}
                </p>

              </div>


              <!-- Separador -->
              <div style="
                border-top: 1px solid #e2e8f0;
                margin: 30px 0 20px 0;
              "></div>


              <!-- Footer -->
              <div style="text-align: center;">

                <p style="
                  margin: 0;
                  color: #64748b;
                  font-size: 13px;
                  font-weight: bold;
                ">
                  SemaforoIA
                </p>

                <p style="
                  margin: 5px 0 0 0;
                  color: #94a3b8;
                  font-size: 12px;
                ">
                  Módulo de Automatización · Semaforo AI
                </p>

                <p style="
                  margin: 4px 0 0 0;
                  color: #cbd5e1;
                  font-size: 11px;
                ">
                  Herramientas TIC · 2026
                </p>

              </div>

            </div>

          </div>

        </div>

      </body>
    </html>

    """

    msg.attach(MIMEText(cuerpo_html, "html"))

    try:
        print(f"🔌 Conectando al servidor SMTP {servidor_smtp}:{puerto_smtp}...")
        with smtplib.SMTP(servidor_smtp, puerto_smtp) as server:
            server.starttls()
            server.login(remitente, password)
            server.send_message(msg)
            print(f"✅ [SMTP EXITOSO] Correo enviado de forma real a: {destinatario}")
            return True

    except Exception as e:
        print(f"❌ Error al enviar correo SMTP real: {e}")
        return False
