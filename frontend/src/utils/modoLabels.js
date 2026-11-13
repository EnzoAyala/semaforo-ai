/**
 * Etiquetas alineadas al flujo del README:
 * REPOSO → AMARILLO (3s) → PEATONAL (60s) → COOLDOWN (120s) → REPOSO
 */
export function labelModo(modo) {
  switch (modo) {
    case 'REPOSO':
      return 'REPOSO';
    case 'TRANSICION_AMARILLO':
      return 'AMARILLO';
    case 'FASE_PEATONAL':
      return 'PEATONAL';
    case 'COOLDOWN':
      return 'COOLDOWN';
    default:
      return modo || '—';
  }
}

/** Contador solo en fases temporizadas (no en REPOSO). */
export function modoTieneContador(modo) {
  return (
    modo === 'TRANSICION_AMARILLO' ||
    modo === 'FASE_PEATONAL' ||
    modo === 'COOLDOWN'
  );
}

/** PIR activo únicamente en REPOSO (README §1 / diagrama). */
export function sensorPirActivo(modo) {
  return !modo || modo === 'REPOSO';
}

export function descripcionModo(modo, duracionCooldown = 120) {
  switch (modo) {
    case 'REPOSO':
      return 'PIR activo · espera detección';
    case 'TRANSICION_AMARILLO':
      return 'Advertencia vehicular 3s';
    case 'FASE_PEATONAL':
      return 'Cruce peatonal 60s · PIR ignorado';
    case 'COOLDOWN':
      return `Enfriamiento ${duracionCooldown}s · PIR bloqueado`;
    default:
      return '';
  }
}
