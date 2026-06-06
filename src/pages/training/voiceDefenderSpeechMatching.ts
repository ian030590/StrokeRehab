export const VOICE_MATCH_SIMILARITY_THRESHOLD = 0.7;

const TRADITIONAL_TO_SIMPLIFIED_CHINESE: Readonly<Record<string, string>> = {
  蘋: '苹',
  檸: '柠',
  陽: '阳',
  紅: '红',
  藍: '蓝',
  綠: '绿',
  黃: '黄',
  書: '书',
  鉛: '铅',
  筆: '笔',
  鏡: '镜',
  電: '电',
  腦: '脑',
  鑰: '钥',
  傘: '伞',
  躍: '跃',
  說: '说',
  話: '话',
  聽: '听',
  閱: '阅',
  讀: '读',
  寫: '写',
  畫: '画',
  師: '师',
};

export function normalizeSpeechText(value: string): string {
  return toSimplifiedChinese(value)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function buildVoskGrammar(
  words: string[],
  language: 'zh' | 'en',
): string {
  const phrases = words
    .map((word) => word.normalize('NFKC').trim().replace(/\s+/g, ' '))
    .map((word) => language === 'zh' ? toSimplifiedChinese(word) : word.toLocaleLowerCase())
    .filter(Boolean);
  return JSON.stringify([...new Set([...phrases, '[unk]'])]);
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

function toSimplifiedChinese(value: string): string {
  return [...value]
    .map((character) => TRADITIONAL_TO_SIMPLIFIED_CHINESE[character] ?? character)
    .join('');
}
