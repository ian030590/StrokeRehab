import type { Difficulty, HudState, ReferenceModuleMeta, SessionLimitSeconds } from './types';

export const REFERENCE_COGNITIVE_MODULES: ReferenceModuleMeta[] = [
  {
    id: 'memory-match',
    title: '記憶配對',
    referenceTitle: 'Memory Match',
    description: '翻開卡片尋找相同圖案，訓練短期記憶、視覺掃描與錯誤抑制。',
    focus: '記憶',
  },
  {
    id: 'lights-out',
    title: '熄燈解題',
    referenceTitle: 'Lights Out',
    description: '切換格子與相鄰格的亮滅狀態，訓練邏輯推理與問題分解。',
    focus: '推理',
  },
  {
    id: 'reaction-time',
    title: '反應時間',
    referenceTitle: 'Reaction Time',
    description: '等待訊號出現後快速點擊，訓練注意力維持與反應控制。',
    focus: '反應',
  },
  {
    id: 'whack-a-mole',
    title: '目標點擊',
    referenceTitle: 'Whack-a-Mole',
    description: '在限定時間內點擊出現的目標，訓練視覺搜尋、注意轉移與手眼協調。',
    focus: '注意',
  },
  {
    id: 'sliding-puzzle',
    title: '滑塊拼圖',
    referenceTitle: 'Sliding Puzzle',
    description: '移動方塊還原數字順序，訓練規劃、空間推理與步驟控制。',
    focus: '規劃',
  },
];

export const DIFFICULTIES: Record<Difficulty, { label: string; description: string }> = {
  Beginner: { label: '初級', description: '較少格數或較慢節奏，適合暖身。' },
  Intermediate: { label: '中級', description: '提高步驟與反應要求，適合一般訓練。' },
  Advanced: { label: '高級', description: '提高密度與速度，適合進階挑戰。' },
};

export const SESSION_LIMIT_OPTIONS = [60, 120, 300, null] as const satisfies readonly SessionLimitSeconds[];
export const REACTION_TRIAL_OPTIONS = [5, 8, 12] as const;
export const WHACK_DURATION_OPTIONS = [30, 45, 60] as const;
export const CARD_VALUES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const MEMORY_CONFIG: Record<Difficulty, { rows: number; cols: number; pairs: number }> = {
  Beginner: { rows: 3, cols: 4, pairs: 6 },
  Intermediate: { rows: 4, cols: 4, pairs: 8 },
  Advanced: { rows: 4, cols: 5, pairs: 10 },
};

export const LIGHTS_CONFIG: Record<Difficulty, { size: number; shuffles: number }> = {
  Beginner: { size: 3, shuffles: 8 },
  Intermediate: { size: 4, shuffles: 14 },
  Advanced: { size: 5, shuffles: 24 },
};

export const REACTION_CONFIG: Record<Difficulty, { minDelay: number; maxDelay: number }> = {
  Beginner: { minDelay: 1.4, maxDelay: 3.2 },
  Intermediate: { minDelay: 1.8, maxDelay: 4.4 },
  Advanced: { minDelay: 2.2, maxDelay: 5.2 },
};

export const WHACK_CONFIG: Record<Difficulty, { gridSize: number; targetMs: number; minDelay: number; maxDelay: number }> = {
  Beginner: { gridSize: 3, targetMs: 1100, minDelay: 0.35, maxDelay: 0.9 },
  Intermediate: { gridSize: 3, targetMs: 850, minDelay: 0.25, maxDelay: 0.72 },
  Advanced: { gridSize: 4, targetMs: 720, minDelay: 0.18, maxDelay: 0.58 },
};

export const SLIDING_CONFIG: Record<Difficulty, { size: number; shuffles: number }> = {
  Beginner: { size: 3, shuffles: 36 },
  Intermediate: { size: 4, shuffles: 72 },
  Advanced: { size: 5, shuffles: 120 },
};

export const DEFAULT_HUD: HudState = {
  primaryLabel: '狀態',
  primaryValue: '-',
  secondaryLabel: '進度',
  secondaryValue: '-',
  tertiaryLabel: '時間',
  tertiaryValue: '-',
};
