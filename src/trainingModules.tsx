import type { ReactNode } from "react";

export type TrainingCategory = "motor" | "cognitive";

export type TrainingModuleId =
  | "reach-target"
  | "hand-sequence"
  | "balance-shift"
  | "gait-rhythm"
  | "visual-scanning"
  | "attention-switch"
  | "memory-match"
  | "inhibition-response";

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
  { value: "3", label: "3 分鐘" },
  { value: "5", label: "5 分鐘" },
  { value: "8", label: "8 分鐘" },
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

function icon(children: ReactNode) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const TRAINING_MODULES: readonly TrainingModuleCardData[] = [
  {
    id: "reach-target",
    category: "motor",
    title: "上肢觸碰訓練",
    description: "以可調整距離與方向的目標，練習肩肘控制、伸手與回收動作。",
    icon: icon(
      <>
        <path d="M4 12h7" />
        <path d="M11 12l-3-3" />
        <path d="M11 12l-3 3" />
        <circle cx="17" cy="12" r="3" />
        <path d="M20 12h1" />
      </>,
    ),
    tags: ["動作控制", "上肢", "目標導向"],
    settings: [
      { id: "intensity", label: "訓練強度", options: intensityOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "side", label: "訓練側別", options: sideOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "hand-sequence",
    category: "motor",
    title: "手部序列訓練",
    description: "依照順序完成按壓、抓握或放開任務，訓練手指分化與動作計畫。",
    icon: icon(
      <>
        <path d="M6 20V9" />
        <path d="M10 20V5" />
        <path d="M14 20V7" />
        <path d="M18 20v-9" />
        <path d="M5 20h14" />
      </>,
    ),
    tags: ["手功能", "序列", "精細動作"],
    settings: [
      { id: "intensity", label: "節奏速度", options: intensityOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "side", label: "訓練側別", options: sideOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "balance-shift",
    category: "motor",
    title: "坐站重心轉移",
    description: "透過方向提示練習左右與前後重心控制，支援坐姿或站姿訓練情境。",
    icon: icon(
      <>
        <path d="M12 3v18" />
        <path d="M7 8l5-5 5 5" />
        <path d="M7 16l5 5 5-5" />
        <path d="M3 12h18" />
      </>,
    ),
    tags: ["平衡", "軀幹控制", "重心轉移"],
    settings: [
      { id: "intensity", label: "轉移幅度", options: intensityOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "side", label: "主要方向", options: sideOptions },
      { id: "assist", label: "安全提示", options: assistOptions },
    ],
  },
  {
    id: "gait-rhythm",
    category: "motor",
    title: "步態節奏訓練",
    description: "用視覺節拍與步伐提示建立穩定節奏，支援步速與跨步反應練習。",
    icon: icon(
      <>
        <path d="M8 4v5l-2 4" />
        <path d="M16 4v5l2 4" />
        <path d="M7 20l3-5" />
        <path d="M17 20l-3-5" />
        <path d="M9 9h6" />
      </>,
    ),
    tags: ["步態", "節奏", "下肢"],
    settings: [
      { id: "intensity", label: "節拍速度", options: intensityOptions },
      { id: "duration", label: "訓練時間", options: durationOptions },
      { id: "side", label: "訓練側別", options: sideOptions },
      { id: "assist", label: "提示程度", options: assistOptions },
    ],
  },
  {
    id: "visual-scanning",
    category: "cognitive",
    title: "視覺搜尋訓練",
    description: "在多個刺激中尋找指定目標，練習掃視策略、忽略干擾與空間注意。",
    icon: icon(
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
        <path d="M8 11h6" />
        <path d="M11 8v6" />
      </>,
    ),
    tags: ["視覺搜尋", "空間注意", "忽略干擾"],
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
];

export function getTrainingModules(category: TrainingCategory) {
  return TRAINING_MODULES.filter((module) => module.category === category);
}
