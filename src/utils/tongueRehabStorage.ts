import { STORAGE_PREFIX } from './settings';

export interface TongueTrainingSettings {
  sensitivity: number;
  growthRate: number;
  durationSec: number;
  appleSpeed: number;
  spawnIntervalSec: number;
  edgeChance: number;
  cameraOpacity: number;
}

export const DEFAULT_TONGUE_SETTINGS: TongueTrainingSettings = {
  sensitivity: 0.65,
  growthRate: 180,
  durationSec: 60,
  appleSpeed: 115,
  spawnIntervalSec: 1.6,
  edgeChance: 0.4,
  cameraOpacity: 0.78,
};

export function getTongueTrainingSettings(userId: string): TongueTrainingSettings {
  try {
    const raw = localStorage.getItem(settingsKey(userId));
    if (!raw) return { ...DEFAULT_TONGUE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<TongueTrainingSettings>;
    return {
      sensitivity: clampNumber(parsed.sensitivity, 0.45, 0.95, DEFAULT_TONGUE_SETTINGS.sensitivity),
      growthRate: clampNumber(parsed.growthRate, 80, 360, DEFAULT_TONGUE_SETTINGS.growthRate),
      durationSec: clampNumber(parsed.durationSec, 30, 300, DEFAULT_TONGUE_SETTINGS.durationSec),
      appleSpeed: clampNumber(parsed.appleSpeed, 60, 260, DEFAULT_TONGUE_SETTINGS.appleSpeed),
      spawnIntervalSec: clampNumber(parsed.spawnIntervalSec, 0.6, 3.5, DEFAULT_TONGUE_SETTINGS.spawnIntervalSec),
      edgeChance: clampNumber(parsed.edgeChance, 0, 0.9, DEFAULT_TONGUE_SETTINGS.edgeChance),
      cameraOpacity: clampNumber(parsed.cameraOpacity, 0.25, 1, DEFAULT_TONGUE_SETTINGS.cameraOpacity),
    };
  } catch {
    return { ...DEFAULT_TONGUE_SETTINGS };
  }
}

export function saveTongueTrainingSettings(userId: string, settings: TongueTrainingSettings): void {
  localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
}

function settingsKey(userId: string): string {
  return `${STORAGE_PREFIX}tongue_settings_${encodeURIComponent(userId)}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
