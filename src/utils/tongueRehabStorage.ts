import type { KNNClassifier } from '@tensorflow-models/knn-classifier';
import { STORAGE_PREFIX } from './settings';

const DATABASE_NAME = 'TongueRehabDB';
const DATABASE_VERSION = 1;
const CLASSIFIERS_STORE = 'classifiers';

export interface TongueTrainingSettings {
  sensitivity: number;
  growthRate: number;
  durationSec: number;
  appleSpeed: number;
  spawnIntervalSec: number;
  edgeChance: number;
  cameraOpacity: number;
}

export interface SerializedTongueClassifier {
  userId: string;
  lastCalibrated: string;
  dataset: Record<string, {
    shape: [number, number];
    data: number[];
  }>;
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

export async function saveTongueClassifier(
  userId: string,
  classifier: KNNClassifier,
): Promise<SerializedTongueClassifier> {
  const dataset: SerializedTongueClassifier['dataset'] = {};
  const tensors = classifier.getClassifierDataset();
  for (const [label, tensor] of Object.entries(tensors)) {
    dataset[label] = {
      shape: [tensor.shape[0], tensor.shape[1]],
      data: Array.from(await tensor.data()),
    };
  }

  const record: SerializedTongueClassifier = {
    userId,
    lastCalibrated: new Date().toISOString(),
    dataset,
  };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CLASSIFIERS_STORE, 'readwrite');
    transaction.objectStore(CLASSIFIERS_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
  return record;
}

export async function loadTongueClassifier(userId: string): Promise<SerializedTongueClassifier | null> {
  const database = await openDatabase();
  return new Promise<SerializedTongueClassifier | null>((resolve, reject) => {
    const transaction = database.transaction(CLASSIFIERS_STORE, 'readonly');
    const request = transaction.objectStore(CLASSIFIERS_STORE).get(userId);
    request.onsuccess = () => resolve((request.result as SerializedTongueClassifier | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function deleteTongueClassifier(userId: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CLASSIFIERS_STORE, 'readwrite');
    transaction.objectStore(CLASSIFIERS_STORE).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
}

function settingsKey(userId: string): string {
  return `${STORAGE_PREFIX}tongue_settings_${encodeURIComponent(userId)}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CLASSIFIERS_STORE)) {
        const store = database.createObjectStore(CLASSIFIERS_STORE, { keyPath: 'userId' });
        store.createIndex('lastCalibrated', 'lastCalibrated');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Tongue rehabilitation database upgrade was blocked.'));
  });
}
