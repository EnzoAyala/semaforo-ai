# SemaforoIA - Control Peatonal Inteligente con Sensores IoT

## 1. Problema y Solución
En muchas avenidas, los semáforos peatonales cambian a rojo para los vehículos de forma periódica, incluso cuando no hay peatones esperando. Esto genera congestión innecesaria 

Nuestra solución utiliza **sensores de movimiento (PIR/Arduino)** para detectar cuando hay personas paradas esperando cruzar. Al detectarlas:
1. El semáforo cambia a **rojo para los vehículos** (permitiendo el paso peatonal) durante **1 minuto**.
2. Una vez concluido el minuto, el sistema entra en un **tiempo de espera (cooldown) de 2 minutos** donde el sensor no se reactiva, garantizando la fluidez del tránsito vehicular.

*(En este primer avance, esta interacción se maneja de forma simulada en código)*

## 2. Arquitectura del Proyecto
* **Dato IoT:** Sensor de movimiento (PIR / Arduino) que detecta la presencia de peatones en la zona de espera.
* **Lógica de Negocio:** Temporización del cambio de fase (1 min de luz roja vehicular / 2 min de enfriamiento de sensor).
* **DevOps y CI/CD:** Pipeline automatizado en GitHub Actions con pruebas unitarias (`pytest`), seguridad (`bandit`), contenedorización (`Docker`) y despliegue simulado.

## 3. Integrantes del Equipo
* **Enzo Ayala:** Arquitectura, Estructura de Proyecto y Docker.
* **Victor Chavez:** Lógica del Semáforo y Pruebas Unitarias.
* **Brillight Chunga:** Pipeline CI/CD, Seguridad y Gestión de Commits.