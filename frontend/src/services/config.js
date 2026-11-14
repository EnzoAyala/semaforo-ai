/** Host y URLs de la API / WebSockets (misma máquina o LAN). */

const HOST = window.location.hostname || 'localhost';

export const API_BASE_URL = `http://${HOST}:8000/api`;
export const WS_URL = `ws://${HOST}:8000/ws/estado`;
export const SIM_WS_URL = `ws://${HOST}:8000/ws/sim`;
