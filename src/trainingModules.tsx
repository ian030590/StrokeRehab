import type { ReactNode } from "react";

export type TrainingCategory = "motor" | "cognitive" | "language";

export type TrainingModuleId =
  | "writing-defense"
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
  { value: "beginner", label: "初階", description: "最慢的敵人速度，簡單形狀（圓形、三角形、正方形、直線）" },
  { value: "intermediate", label: "中階", description: "較快的敵人速度，中等形狀（愛心、星星、橢圓、六邊形）" },
  { value: "hard", label: "高階", description: "最快的敵人速度，困難形狀（中文字：天、古、元、右、左、夫、吉）" },
];

const deviceOptions: readonly ModuleSettingOption[] = [
  { value: "tablet", label: "平板電腦", description: "需觸控螢幕拖曳或滑鼠按壓作畫" },
  { value: "trackpad", label: "觸控板", description: "免按壓，手指在觸控板滑動即可作畫" },
];

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
    description: "透過觸控板或觸控螢幕畫出對應的圖案，擊退不斷逼近的敵人。訓練手部精細動作與反應時間。",
    icon: icon(
      <>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </>
    ),
    tags: ["動作控制", "書寫", "精細動作", "反應遊戲"],
    settings: [
      { id: "difficulty", label: "遊戲難度", options: difficultyOptions },
      { id: "duration", label: "遊戲時間", options: durationOptions },
      { id: "device", label: "使用設備", options: deviceOptions },
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
    tags: ["空間注意", "方位辨識", "忽略干擾"],
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
    tags: ["注意力", "規則切換", "反應控制"],
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
    tags: ["工作記憶", "配對", "更新"],
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
    tags: ["抑制控制", "反應時間", "準確度"],
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
    tags: ["詞彙", "命名", "口語輸出"],
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
    tags: ["命名", "生活語彙", "提示淡化"],
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
    tags: ["句型", "語序", "表達"],
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
    tags: ["聽理解", "指令反應", "功能溝通"],
    settings: [
      { id: "level", label: "語料層級", options: languageLevelOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "response", label: "回答方式", options: responseModeOptions },
      { id: "cue", label: "提示類型", options: cueOptions },
    ],
  },
];

export function getTrainingModules(category: TrainingCategory) {
  return TRAINING_MODULES.filter((module) => module.category === category);
}
