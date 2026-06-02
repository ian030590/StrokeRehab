import type { ReactNode } from "react";
import { HEALTH_EXERCISE_VIDEOS } from "./healthExerciseVideos";

export type TrainingCategory = "motor" | "cognitive" | "language";
export type ModuleLanguage = "zh" | "en";

export type TrainingModuleId =
  | "writing-defense"
  | "healthy-movement"
  | "connect-dots"
  | "chinese-crossword"
  | "spatial-attention"
  | "attention-switch"
  | "memory-match"
  | "inhibition-response"
  | "word-retrieval"
  | "naming-practice"
  | "sentence-building"
  | "comprehension-response";

export interface ModuleSettingOption {
  value: string;
  label: string;
  description?: string;
}

export interface ModuleSettingGroup {
  id: string;
  label: string;
  options: readonly ModuleSettingOption[];
}

export interface TrainingModuleCardData {
  id: TrainingModuleId;
  category: TrainingCategory;
  title: string;
  description: string;
  icon: ReactNode;
  tags: readonly string[];
  settings: readonly ModuleSettingGroup[];
}

const PLAYABLE_MODULE_IDS = new Set<TrainingModuleId>([
  "writing-defense",
  "healthy-movement",
  "connect-dots",
  "chinese-crossword",
]);

const DEVICE_TAGS: Record<ModuleLanguage, readonly string[]> = {
  zh: ["電腦", "平板"],
  en: ["Computer", "Tablet"],
};

type OptionCopy = { label: string; description?: string };
type SettingCopy = { label: string; options?: Record<string, OptionCopy> };
type ModuleCopy = {
  title: string;
  description: string;
  settings?: Record<string, SettingCopy>;
};

const EN_MODULE_COPY: Partial<Record<TrainingModuleId, ModuleCopy>> = {
  "writing-defense": {
    title: "Writing Defense",
    description: "Draw the target shape with a mouse, tablet touch, or pen display to defeat incoming enemies.",
    settings: {
      difficulty: {
        label: "Image Difficulty",
        options: {
          beginner: { label: "Beginner", description: "Simple shapes: circle, triangle, square, and lines" },
          intermediate: { label: "Intermediate", description: "Medium shapes: heart, star, oval, and hexagon" },
          advanced: { label: "Advanced", description: "Chinese characters: 天, 古, 元, 右, 左, 夫, 吉" },
        },
      },
      speed: {
        label: "Enemy Speed",
        options: {
          low: { label: "Slow", description: "Enemies move and appear at a slower pace" },
          moderate: { label: "Standard", description: "Enemies advance at a steady pace" },
          high: { label: "Fast", description: "Enemies move and appear more quickly" },
        },
      },
      duration: {
        label: "Game Time",
        options: {
          "1": { label: "1 minute" },
          "2": { label: "2 minutes" },
          "3": { label: "3 minutes" },
          "5": { label: "5 minutes" },
        },
      },
    },
  },
  "healthy-movement": {
    title: "Healthy Movement",
    description: "Browse health exercise YouTube videos, choose one, and follow along. More videos can be added later.",
    settings: {
      video: { label: "Exercise Video" },
    },
  },
  "connect-dots": {
    title: "Connect the Dots",
    description: "Connect numbered sample points from a hidden outline to train visual search, sequencing, and hand-eye control.",
    settings: {
      shape: {
        label: "Outline Shape",
        options: {
          star: { label: "Star", description: "Angular outline with clear turns" },
          cat: { label: "Cat", description: "Curved outline for continuous control practice" },
          leaf: { label: "Leaf", description: "Symmetric curves for smooth tracing" },
        },
      },
      density: {
        label: "Dot Density",
        options: {
          wide: { label: "Low", description: "Larger spacing, easier to learn" },
          standard: { label: "Standard", description: "Samples about every 28 px" },
          dense: { label: "High", description: "Samples about every 20 px" },
        },
      },
    },
  },
  "chinese-crossword": {
    title: "Chinese Crossword",
    description: "Place Chinese idioms into a crossword grid and fill characters using pinyin and definitions.",
    settings: {
      level: {
        label: "Puzzle Difficulty",
        options: {
          standard: { label: "Standard", description: "About 8 intersecting words" },
          easy: { label: "Easy", description: "Smaller grid with more focused clues" },
          challenge: { label: "Challenge", description: "More words and intersections" },
        },
      },
    },
  },
};

const intensityOptions: readonly ModuleSettingOption[] = [
  { value: "low", label: "低強度", description: "速度慢，適合暖身或初次練習" },
  { value: "moderate", label: "中強度", description: "穩定節奏，適合一般訓練" },
  { value: "high", label: "高強度", description: "反應時間短，適合進階挑戰" },
];

const durationOptions: readonly ModuleSettingOption[] = [
  { value: "1", label: "1 分鐘" },
  { value: "2", label: "2 分鐘" },
  { value: "3", label: "3 分鐘" },
  { value: "5", label: "5 分鐘" },
];

const difficultyOptions: readonly ModuleSettingOption[] = [
  { value: "beginner", label: "初級", description: "簡單圖形（圓形、三角形、正方形、直線）" },
  { value: "intermediate", label: "中級", description: "中等圖形（愛心、星星、橢圓、六邊形）" },
  { value: "advanced", label: "高級", description: "中文字（天、古、元、右、左、夫、吉）" },
];

const writingSpeedOptions: readonly ModuleSettingOption[] = [
  { value: "low", label: "慢速", description: "敵人移動與出現節奏較慢" },
  { value: "moderate", label: "標準", description: "敵人以穩定速度前進" },
  { value: "high", label: "快速", description: "敵人移動與出現節奏較快" },
];

const healthExerciseVideoOptions: readonly ModuleSettingOption[] = HEALTH_EXERCISE_VIDEOS.map((video) => ({
  value: video.id,
  label: video.title,
  description: `${video.provider}${video.durationLabel ? ` / ${video.durationLabel}` : ""} / ${video.audience}`,
}));

const sideOptions: readonly ModuleSettingOption[] = [
  { value: "left", label: "左側" },
  { value: "right", label: "右側" },
  { value: "both", label: "雙側" },
];

const assistOptions: readonly ModuleSettingOption[] = [
  { value: "guided", label: "引導" },
  { value: "standard", label: "標準" },
  { value: "minimal", label: "少量提示" },
];

const cognitiveLoadOptions: readonly ModuleSettingOption[] = [
  { value: "simple", label: "單一任務", description: "一次只處理一種刺激" },
  { value: "mixed", label: "混合任務", description: "需要在兩種規則間切換" },
  { value: "dual", label: "雙重任務", description: "加入記憶或抑制反應需求" },
];

const connectDotsShapeOptions: readonly ModuleSettingOption[] = [
  { value: "star", label: "星星", description: "折線輪廓，轉折清楚" },
  { value: "cat", label: "貓咪", description: "曲線輪廓，適合練習連續控制" },
  { value: "leaf", label: "葉子", description: "對稱曲線，練習平滑描繪" },
];

const dotDensityOptions: readonly ModuleSettingOption[] = [
  { value: "wide", label: "低密度", description: "點距較大，適合熟悉操作" },
  { value: "standard", label: "標準", description: "約每 28px 取樣一點" },
  { value: "dense", label: "高密度", description: "約每 20px 取樣一點" },
];

const crosswordLevelOptions: readonly ModuleSettingOption[] = [
  { value: "standard", label: "標準", description: "約 8 個詞彙交錯" },
  { value: "easy", label: "入門", description: "格數較少，提示較集中" },
  { value: "challenge", label: "挑戰", description: "更多詞彙與交叉點" },
];

const languageLevelOptions: readonly ModuleSettingOption[] = [
  { value: "word", label: "單詞", description: "短詞彙與常用名詞" },
  { value: "phrase", label: "短句", description: "兩到六字的功能性語句" },
  { value: "scenario", label: "情境對話", description: "日常溝通情境中的回應" },
];

const responseModeOptions: readonly ModuleSettingOption[] = [
  { value: "speak", label: "口語回答" },
  { value: "point", label: "指認回答" },
  { value: "type", label: "文字輸入" },
];

const cueOptions: readonly ModuleSettingOption[] = [
  { value: "semantic", label: "語意提示" },
  { value: "phonemic", label: "音韻提示" },
  { value: "minimal", label: "少量提示" },
];

function icon(children: ReactNode) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const TRAINING_MODULES: readonly TrainingModuleCardData[] = [
  {
    id: "writing-defense",
    category: "motor",
    title: "書寫保衛戰",
    description: "透過滑鼠、平板觸控或繪圖螢幕畫出對應的圖案，擊退不斷逼近的敵人。訓練手部精細動作與反應時間。",
    icon: icon(
      <>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </>
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "difficulty", label: "圖像難度", options: difficultyOptions },
      { id: "speed", label: "敵人速度", options: writingSpeedOptions },
      { id: "duration", label: "遊戲時間", options: durationOptions },
    ],
  },
  {
    id: "healthy-movement",
    category: "motor",
    title: "健康動一動",
    description: "彙整健康操 YouTube 影片，選擇影片後前往觀看並跟著活動。未來可持續新增影片來源。",
    icon: icon(
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M10 9l5 3-5 3V9Z" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "video", label: "健康操影片", options: healthExerciseVideoOptions },
    ],
  },
  {
    id: "connect-dots",
    category: "cognitive",
    title: "連點遊戲",
    description: "依照序號連接輪廓取樣點，在視覺搜尋、順序規劃與手眼協調間建立穩定連結。",
    icon: icon(
      <>
        <circle cx="5" cy="6" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="19" cy="8" r="2" />
        <circle cx="16" cy="17" r="2" />
        <circle cx="7" cy="18" r="2" />
        <path d="M6.8 5.6 10.2 4.4" />
        <path d="M13.8 4.8 17.2 7.2" />
        <path d="M18.2 9.8 16.8 15.2" />
        <path d="M13.8 17.2 9.2 17.8" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "shape", label: "輪廓圖形", options: connectDotsShapeOptions },
      { id: "density", label: "點位密度", options: dotDensityOptions },
    ],
  },
  {
    id: "chinese-crossword",
    category: "cognitive",
    title: "中文填字遊戲",
    description: "把成語詞庫交錯排成填字格，依照拼音與解釋填入中文字，訓練語意提取、注意力與工作記憶。",
    icon: icon(
      <>
        <rect x="4" y="4" width="5" height="5" rx="1" />
        <rect x="9" y="4" width="5" height="5" rx="1" />
        <rect x="14" y="4" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="14" width="5" height="5" rx="1" />
        <path d="M6 7h1" />
        <path d="M11 7h1" />
        <path d="M16 7h1" />
        <path d="M11 12h1" />
        <path d="M11 17h1" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "level", label: "題目難度", options: crosswordLevelOptions },
    ],
  },
  {
    id: "spatial-attention",
    category: "cognitive",
    title: "空間注意訓練",
    description: "依照方位與目標提示完成搜尋與辨識，練習空間注意、忽略干擾與反應穩定度。",
    icon: icon(
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
        <path d="M8 11h6" />
        <path d="M11 8v6" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "load", label: "任務負荷", options: cognitiveLoadOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "field", label: "搜尋範圍", options: sideOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "attention-switch",
    category: "cognitive",
    title: "注意力切換訓練",
    description: "依照規則變化切換反應條件，訓練持續注意、選擇注意與彈性轉換。",
    icon: icon(
      <>
        <path d="M7 7h10v10" />
        <path d="M17 7l-10 10" />
        <path d="M7 17h10" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "load", label: "任務負荷", options: cognitiveLoadOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "speed", label: "刺激速度", options: intensityOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "memory-match",
    category: "cognitive",
    title: "工作記憶配對",
    description: "記住短暫呈現的圖案或位置，再完成配對判斷，練習短期保持與更新。",
    icon: icon(
      <>
        <rect x="4" y="5" width="6" height="6" rx="1" />
        <rect x="14" y="5" width="6" height="6" rx="1" />
        <rect x="4" y="15" width="6" height="6" rx="1" />
        <path d="M15 18h4" />
        <path d="M17 16v4" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "load", label: "記憶負荷", options: cognitiveLoadOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "speed", label: "呈現速度", options: intensityOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "inhibition-response",
    category: "cognitive",
    title: "抑制反應訓練",
    description: "在 Go/No-Go 類型任務中抑制錯誤反應，訓練反應控制與衝動抑制。",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 8l8 8" />
        <path d="M16 8l-8 8" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "load", label: "任務負荷", options: cognitiveLoadOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "speed", label: "刺激速度", options: intensityOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "word-retrieval",
    category: "language",
    title: "詞彙提取訓練",
    description: "依照提示找出合適詞彙，練習命名、語意連結與口語輸出準備。",
    icon: icon(
      <>
        <path d="M4 5h16v10H8l-4 4V5Z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "level", label: "語料層級", options: languageLevelOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "response", label: "回答方式", options: responseModeOptions },
      { id: "cue", label: "提示類型", options: cueOptions },
    ],
  },
  {
    id: "naming-practice",
    category: "language",
    title: "日常命名訓練",
    description: "從生活物件、動作與情境線索中練習命名，支援逐步提示與錯誤修正。",
    icon: icon(
      <>
        <rect x="4" y="5" width="16" height="12" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h4" />
        <path d="M10 21h4" />
        <path d="M12 17v4" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "level", label: "語料層級", options: languageLevelOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "response", label: "回答方式", options: responseModeOptions },
      { id: "cue", label: "提示類型", options: cueOptions },
    ],
  },
  {
    id: "sentence-building",
    category: "language",
    title: "句型組合訓練",
    description: "將人物、動作與物件組合成完整語句，練習句法、語序與表達清楚度。",
    icon: icon(
      <>
        <path d="M5 6h14" />
        <path d="M5 12h10" />
        <path d="M5 18h12" />
        <path d="M17 10l3 2-3 2" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "level", label: "語料層級", options: languageLevelOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "response", label: "回答方式", options: responseModeOptions },
      { id: "cue", label: "提示類型", options: cueOptions },
    ],
  },
  {
    id: "comprehension-response",
    category: "language",
    title: "聽理解反應訓練",
    description: "依照口語指令選擇、排序或回應，練習聽理解、語意判斷與功能性溝通。",
    icon: icon(
      <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M17 9a4 4 0 0 1 0 6" />
        <path d="M20 7a8 8 0 0 1 0 10" />
      </>,
    ),
    tags: DEVICE_TAGS.zh,
    settings: [
      { id: "level", label: "語料層級", options: languageLevelOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "response", label: "回答方式", options: responseModeOptions },
      { id: "cue", label: "提示類型", options: cueOptions },
    ],
  },
];

export function getTrainingModules(category: TrainingCategory, lang: ModuleLanguage = "zh") {
  return TRAINING_MODULES
    .filter((module) => module.category === category && PLAYABLE_MODULE_IDS.has(module.id))
    .map((module) => localizeModule(module, lang));
}

function localizeModule(module: TrainingModuleCardData, lang: ModuleLanguage): TrainingModuleCardData {
  if (lang === "zh") {
    return {
      ...module,
      tags: DEVICE_TAGS.zh,
    };
  }

  const moduleCopy = EN_MODULE_COPY[module.id];
  return {
    ...module,
    title: moduleCopy?.title ?? module.title,
    description: moduleCopy?.description ?? module.description,
    tags: DEVICE_TAGS.en,
    settings: module.settings.map((setting) => {
      const settingCopy = moduleCopy?.settings?.[setting.id];
      return {
        ...setting,
        label: settingCopy?.label ?? setting.label,
        options: localizeOptions(module.id, setting, settingCopy),
      };
    }),
  };
}

function localizeOptions(
  moduleId: TrainingModuleId,
  setting: ModuleSettingGroup,
  settingCopy?: SettingCopy,
): readonly ModuleSettingOption[] {
  if (moduleId === "healthy-movement" && setting.id === "video") {
    return HEALTH_EXERCISE_VIDEOS.map((video) => ({
      value: video.id,
      label: video.titleEn ?? video.title,
      description: `${video.providerEn ?? video.provider}${video.durationLabelEn || video.durationLabel ? ` / ${video.durationLabelEn ?? video.durationLabel}` : ""} / ${video.audienceEn ?? video.audience}`,
    }));
  }

  return setting.options.map((option) => ({
    ...option,
    label: settingCopy?.options?.[option.value]?.label ?? option.label,
    description: settingCopy?.options?.[option.value]?.description ?? option.description,
  }));
}
