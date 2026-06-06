const CACHE_NAME = 'stroke-trainer-vosk-models-v1';
const CACHE_KEY_PREFIX = '__vosk_model_cache__';
const SOURCE_URL_HEADER = 'X-Stroke-Trainer-Model-Source';

export type VoskModelLoadStage = 'checking-cache' | 'loading-cache' | 'downloading' | 'saving-cache';

export interface CachedModelUrl {
  url: string;
  revoke: () => void;
}

export async function getCachedModelUrl(
  cacheKey: string,
  sourceUrl: string,
  onProgress: (progress: number) => void,
  onStage?: (stage: VoskModelLoadStage) => void,
): Promise<CachedModelUrl> {
  onStage?.('checking-cache');
  onProgress(0);

  const cacheRequest = createCacheRequest(cacheKey);
  const cachedBlob = await readCachedModel(cacheRequest, sourceUrl, onStage);
  if (cachedBlob) {
    onProgress(100);
    return createObjectUrl(cachedBlob);
  }

  onStage?.('downloading');
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to download Vosk model (${response.status}).`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  const blob = response.body
    ? await readResponseBlob(response, totalBytes, onProgress)
    : await response.blob();
  if (blob.size === 0) {
    throw new Error('Downloaded Vosk model is empty.');
  }

  onProgress(100);
  onStage?.('saving-cache');
  await writeCachedModel(cacheRequest, sourceUrl, blob).catch((error) => {
    console.warn('Unable to cache Vosk model with the Cache API.', error);
  });
  return createObjectUrl(blob);
}

async function readCachedModel(
  request: Request,
  sourceUrl: string,
  onStage?: (stage: VoskModelLoadStage) => void,
): Promise<Blob | null> {
  if (!('caches' in window)) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(request);
    if (!response) return null;
    if (!response.ok || response.headers.get(SOURCE_URL_HEADER) !== sourceUrl) {
      await cache.delete(request);
      return null;
    }

    onStage?.('loading-cache');
    const blob = await response.blob();
    if (blob.size === 0) {
      await cache.delete(request);
      return null;
    }
    return blob;
  } catch (error) {
    console.warn('Cache API model lookup failed; using network download.', error);
    return null;
  }
}

async function writeCachedModel(request: Request, sourceUrl: string, blob: Blob): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_NAME);
  const headers = new Headers({
    'Content-Type': blob.type || 'application/gzip',
    [SOURCE_URL_HEADER]: sourceUrl,
  });
  await cache.put(request, new Response(blob, { status: 200, headers }));
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

function createCacheRequest(cacheKey: string): Request {
  const cacheUrl = new URL(`${CACHE_KEY_PREFIX}/${encodeURIComponent(cacheKey)}`, window.location.href);
  cacheUrl.search = '';
  cacheUrl.hash = '';
  return new Request(cacheUrl.toString(), { method: 'GET' });
}

function createObjectUrl(blob: Blob): CachedModelUrl {
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}
