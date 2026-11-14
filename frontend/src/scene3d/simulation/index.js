/** Orquestación de la simulación 3D (hooks y helpers). */

export { WAVE_CHECK_MS, STAGGER_MS, MIN_READY_FOR_WAVE } from './constants';
export { restoreAgentsFrom, applyStoreToUi } from './storeSync';
export { useSimSync } from './useSimSync';
export { useWaveScheduler } from './useWaveScheduler';
export { useCrossingBridge } from './useCrossingBridge';
export { useAgentLifecycle } from './useAgentLifecycle';
export { useFullscreen } from './useFullscreen';
