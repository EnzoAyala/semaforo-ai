/** Presets y utilidades del ciclo día / atardecer / noche. */

export const AMBIENCE_OPTIONS = [
  { id: 'day', label: 'Día' },
  { id: 'sunset', label: 'Atardecer' },
  { id: 'night', label: 'Noche' },
  { id: 'auto', label: 'Ciclo Auto' },
];

const PRESETS = {
  day: {
    sunAngle: 0.72,
    sunAzimuth: 0.35,
    ambient: 0.62,
    hemiSky: '#d8ecff',
    hemiGround: '#6b8f5c',
    hemiIntensity: 0.5,
    dirIntensity: 1.35,
    dirColor: '#fff4e0',
    bg: '#9ec9ef',
    fog: '#a7c8e6',
    fogNear: 38,
    fogFar: 105,
    skyTurbidity: 5.5,
    skyRayleigh: 1.35,
    nightLights: 0,
    cloudOpacity: 0.62,
  },
  sunset: {
    sunAngle: 0.12,
    sunAzimuth: 0.55,
    ambient: 0.38,
    hemiSky: '#ffb38a',
    hemiGround: '#5a4a3a',
    hemiIntensity: 0.4,
    dirIntensity: 0.85,
    dirColor: '#ff8a4c',
    bg: '#e8a070',
    fog: '#d4926a',
    fogNear: 26,
    fogFar: 70,
    skyTurbidity: 8,
    skyRayleigh: 2.2,
    nightLights: 0.65,
    cloudOpacity: 0.45,
  },
  night: {
    sunAngle: -0.25,
    sunAzimuth: 0.2,
    ambient: 0.16,
    hemiSky: '#1a2744',
    hemiGround: '#0f1a14',
    hemiIntensity: 0.22,
    dirIntensity: 0.18,
    dirColor: '#9eb6ff',
    bg: '#0b1220',
    fog: '#121a2c',
    fogNear: 22,
    fogFar: 60,
    skyTurbidity: 2,
    skyRayleigh: 0.4,
    nightLights: 1,
    cloudOpacity: 0.22,
  },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function mixPreset(a, b, t) {
  return {
    sunAngle: lerp(a.sunAngle, b.sunAngle, t),
    sunAzimuth: lerp(a.sunAzimuth, b.sunAzimuth, t),
    ambient: lerp(a.ambient, b.ambient, t),
    hemiSky: lerpColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
    dirIntensity: lerp(a.dirIntensity, b.dirIntensity, t),
    dirColor: lerpColor(a.dirColor, b.dirColor, t),
    bg: lerpColor(a.bg, b.bg, t),
    fog: lerpColor(a.fog, b.fog, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    skyTurbidity: lerp(a.skyTurbidity, b.skyTurbidity, t),
    skyRayleigh: lerp(a.skyRayleigh, b.skyRayleigh, t),
    nightLights: lerp(a.nightLights, b.nightLights, t),
    cloudOpacity: lerp(a.cloudOpacity, b.cloudOpacity, t),
  };
}

/**
 * phase 0..1 en ciclo auto: día → atardecer → noche → día
 */
export function sampleAtmosphere(mode, phase = 0) {
  if (mode === 'day') return { ...PRESETS.day };
  if (mode === 'sunset') return { ...PRESETS.sunset };
  if (mode === 'night') return { ...PRESETS.night };

  // Ciclo auto: 0-0.35 día, 0.35-0.5 atardecer, 0.5-0.85 noche, 0.85-1 amanecer
  if (phase < 0.35) {
    return mixPreset(PRESETS.day, PRESETS.sunset, phase / 0.35);
  }
  if (phase < 0.5) {
    return mixPreset(PRESETS.sunset, PRESETS.night, (phase - 0.35) / 0.15);
  }
  if (phase < 0.85) {
    return { ...PRESETS.night };
  }
  return mixPreset(PRESETS.night, PRESETS.day, (phase - 0.85) / 0.15);
}

export function sunPositionFromAtmosphere(atm) {
  const elev = atm.sunAngle * Math.PI * 0.5;
  const az = atm.sunAzimuth * Math.PI;
  const r = 80;
  return [
    Math.cos(elev) * Math.sin(az) * r,
    Math.sin(elev) * r + 4,
    Math.cos(elev) * Math.cos(az) * r,
  ];
}
