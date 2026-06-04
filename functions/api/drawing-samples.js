const MAX_IMAGE_BYTES = 1024 * 1024;
const SHAPES = new Set(['circle', 'cross', 'square', 'triangle', 'vertical-line', 'horizontal-line']);

export async function onRequestOptions(context) {
  return new Response(null, {
    status: isAllowedOrigin(context) ? 204 : 403,
    headers: corsHeaders(context),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(context);
  const webhookUrl = env.DISCORD_DRAWING_WEBHOOK_URL;

  if (!isAllowedOrigin(context)) {
    return json({ error: 'Origin is not allowed.' }, 403, headers);
  }

  if (!webhookUrl) {
    return json({ error: 'Discord webhook is not configured.' }, 500, headers);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return json({ error: 'Expected multipart/form-data.' }, 415, headers);
  }

  const form = await request.formData();
  const image = form.get('image');
  const metadataText = form.get('metadata');

  if (!(image instanceof File)) {
    return json({ error: 'Missing image file.' }, 400, headers);
  }

  if (image.type !== 'image/png') {
    return json({ error: 'Only PNG image uploads are accepted.' }, 415, headers);
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return json({ error: 'Image is too large.' }, 413, headers);
  }

  const metadata = parseMetadata(metadataText);
  const filename = createSafeFilename(metadata, image.name);
  const discordForm = new FormData();
  discordForm.append('payload_json', JSON.stringify(createDiscordPayload(metadata, filename)));
  discordForm.append('files[0]', image, filename);

  const discordResponse = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    body: discordForm,
  });

  if (!discordResponse.ok) {
    const text = await discordResponse.text().catch(() => '');
    return json(
      { error: 'Discord upload failed.', discordStatus: discordResponse.status, detail: text.slice(0, 500) },
      502,
      headers,
    );
  }

  return json({ ok: true, filename }, 201, headers);
}

function parseMetadata(value) {
  if (typeof value !== 'string' || value.length > 12000) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function createSafeFilename(metadata, fallbackName) {
  const rawTarget = typeof metadata.targetShape === 'string' && SHAPES.has(metadata.targetShape)
    ? metadata.targetShape
    : 'unknown';
  const matched = metadata.matched === true ? 'hit' : 'miss';
  const sampleId = typeof metadata.sampleId === 'string' ? metadata.sampleId : fallbackName.replace(/\.png$/i, '');
  const safeSampleId = sanitizeFilePart(sampleId) || crypto.randomUUID();
  return `drawing_${rawTarget}_${matched}_${safeSampleId}.png`;
}

function createDiscordPayload(metadata, filename) {
  const targetShape = safeText(metadata.targetShape) || 'unknown';
  const recognizedShape = safeText(metadata.recognizedShape) || 'unrecognized';
  const participant = safeText(metadata.participantId) || 'Unknown';
  const fields = [
    { name: 'participant', value: participant, inline: true },
    { name: 'target', value: targetShape, inline: true },
    { name: 'recognized', value: recognizedShape, inline: true },
    { name: 'matched', value: metadata.matched === true ? 'true' : 'false', inline: true },
    { name: 'difficulty', value: safeText(metadata.difficulty) || 'unknown', inline: true },
    { name: 'enemy', value: safeText(metadata.enemyNumber) || '-', inline: true },
    { name: 'elapsedSec', value: safeText(metadata.elapsedSeconds) || '-', inline: true },
    { name: 'strokeCount', value: safeText(metadata.strokeCount) || '-', inline: true },
    { name: 'pointCount', value: safeText(metadata.pointCount) || '-', inline: true },
  ];

  return {
    username: 'Stroke Trainer',
    content: `Drawing sample: ${filename}`,
    embeds: [{
      title: 'Drawing Tower Defense Sample',
      timestamp: safeTimestamp(metadata.createdAt),
      fields,
    }],
  };
}

function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, 256);
}

function safeTimestamp(value) {
  if (typeof value !== 'string') return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function sanitizeFilePart(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function corsHeaders({ request, env }) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = String(env.DRAWING_UPLOAD_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    vary: 'Origin',
  };

  if (!origin) return headers;

  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin || allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function isAllowedOrigin({ request, env }) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;

  const requestOrigin = new URL(request.url).origin;
  const allowedOrigins = String(env.DRAWING_UPLOAD_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return origin === requestOrigin || allowedOrigins.includes(origin);
}
