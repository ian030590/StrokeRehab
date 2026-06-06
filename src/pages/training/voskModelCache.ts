const DATABASE_NAME = 'vision-trainer-model-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'models';

interface CachedModel {
  key: string;
  blob: Blob;
  sourceUrl: string;
  savedAt: string;
}

export interface CachedModelUrl {
  url: string;
  revoke: () => void;
}

export async function getCachedModelUrl(
  cacheKey: string,
  sourceUrl: string,
  onProgress: (progress: number) => void,
): Promise<CachedModelUrl> {
  const cached = await readCachedModel(cacheKey).catch((error) => {
    console.warn('IndexedDB model cache is unavailable.', error);
    return null;
  });
  if (cached?.sourceUrl === sourceUrl) {
    onProgress(100);
    return createObjectUrl(cached.blob);
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Unable to download Vosk model (${response.status}).`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  const blob = response.body
    ? await readResponseBlob(response, totalBytes, onProgress)
    : await response.blob();

  onProgress(100);
  await writeCachedModel({
    key: cacheKey,
    blob,
    sourceUrl,
    savedAt: new Date().toISOString(),
  }).catch((error) => {
    console.warn('Unable to cache Vosk model in IndexedDB.', error);
  });
  return createObjectUrl(blob);
}

async function readResponseBlob(
  response: Response,
  totalBytes: number,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const reader = response.body?.getReader();
  if (!reader) return response.blob();

  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loadedBytes += value.byteLength;
    if (totalBytes > 0) {
      onProgress(Math.min(99, Math.round((loadedBytes / totalBytes) * 100)));
    }
  }

  return new Blob(chunks as BlobPart[], {
    type: response.headers.get('content-type') || 'application/gzip',
  });
}

function createObjectUrl(blob: Blob): CachedModelUrl {
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

async function readCachedModel(key: string): Promise<CachedModel | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as CachedModel | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeCachedModel(model: CachedModel): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(model);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
