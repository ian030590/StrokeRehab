export const VOICE_MATCH_SIMILARITY_THRESHOLD = 0.7;

export function normalizeSpeechText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function calculateBestSpeechSimilarity(transcript: string, target: string): number {
  const normalizedTarget = normalizeSpeechText(target);
  const candidates = new Set([
    normalizeSpeechText(transcript),
    ...transcript
      .split(/[\s,.;:!?，。！？、；：]+/u)
      .map(normalizeSpeechText),
  ]);
  return Math.max(
    0,
    ...[...candidates]
      .filter(Boolean)
      .map((candidate) => calculateSimilarity(candidate, normalizedTarget)),
  );
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return [...b].length;
  if (!b) return [...a].length;
  const left = [...a];
  const right = [...b];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  left.forEach((leftChar, leftIndex) => {
    const current = [leftIndex + 1];
    right.forEach((rightChar, rightIndex) => {
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (leftChar === rightChar ? 0 : 1),
      );
    });
    previous = current;
  });

  return previous[right.length];
}

export function calculateSimilarity(a: string, b: string): number {
  const maxLength = Math.max([...a].length, [...b].length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}
