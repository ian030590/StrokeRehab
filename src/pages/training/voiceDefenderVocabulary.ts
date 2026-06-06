import { STORAGE_PREFIX } from '../../utils/settings';

export type VoiceLanguage = 'zh' | 'en';

export interface VoiceVocabularyItem {
  id: string;
  word: string;
  language: VoiceLanguage;
  isActive: boolean;
}

const STORAGE_KEY = `${STORAGE_PREFIX}voice_defender_vocabulary_v1`;

const DEFAULT_CHINESE_WORDS = [
  '蘋果', '香蕉', '葡萄', '橘子', '草莓', '西瓜', '桃子', '梨子', '芒果', '檸檬',
  '天空', '海洋', '河流', '山谷', '森林', '花朵', '雨水', '雪花', '太陽', '月亮',
  '紅色', '藍色', '綠色', '黃色', '白色', '黑色', '紫色', '橙色', '桌子', '椅子',
  '杯子', '書本', '鉛筆', '眼鏡', '電話', '電腦', '鑰匙', '雨傘', '走路', '跑步',
  '跳躍', '微笑', '呼吸', '說話', '聆聽', '閱讀', '寫字', '畫畫', '朋友', '老師',
] as const;

const DEFAULT_ENGLISH_WORDS = [
  'apple', 'banana', 'grape', 'orange', 'strawberry', 'watermelon', 'peach', 'pear', 'mango', 'lemon',
  'sky', 'ocean', 'river', 'valley', 'forest', 'flower', 'rain', 'snow', 'sun', 'moon',
  'red', 'blue', 'green', 'yellow', 'white', 'black', 'purple', 'table', 'chair', 'cup',
  'book', 'pencil', 'glasses', 'phone', 'computer', 'key', 'umbrella', 'walk', 'run', 'jump',
  'smile', 'breathe', 'speak', 'listen', 'read', 'write', 'draw', 'friend', 'teacher', 'family',
] as const;

export function createDefaultVoiceVocabulary(): VoiceVocabularyItem[] {
  return [
    ...DEFAULT_CHINESE_WORDS.map((word, index) => ({
      id: `zh-${index + 1}`,
      word,
      language: 'zh' as const,
      isActive: true,
    })),
    ...DEFAULT_ENGLISH_WORDS.map((word, index) => ({
      id: `en-${index + 1}`,
      word,
      language: 'en' as const,
      isActive: true,
    })),
  ];
}

export function loadVoiceVocabulary(): VoiceVocabularyItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = createDefaultVoiceVocabulary();
      saveVoiceVocabulary(defaults);
      return defaults;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDefaultVoiceVocabulary();

    return parsed
      .map(toVocabularyItem)
      .filter((item): item is VoiceVocabularyItem => item !== null);
  } catch (error) {
    console.warn('Unable to read voice defender vocabulary.', error);
    return createDefaultVoiceVocabulary();
  }
}

export function saveVoiceVocabulary(items: VoiceVocabularyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Unable to save voice defender vocabulary.', error);
  }
}

export function createVoiceVocabularyItem(word: string, language: VoiceLanguage): VoiceVocabularyItem {
  return {
    id: `${language}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    word: word.trim(),
    language,
    isActive: true,
  };
}

function toVocabularyItem(value: unknown): VoiceVocabularyItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    typeof item.word !== 'string' ||
    (item.language !== 'zh' && item.language !== 'en') ||
    typeof item.isActive !== 'boolean'
  ) {
    return null;
  }

  const word = item.word.trim();
  return word ? { id: item.id, word, language: item.language, isActive: item.isActive } : null;
}
