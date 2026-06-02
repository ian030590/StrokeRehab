import type { TranslationKey } from '../i18n';
import type { TrialData } from '../pages/training/types';
import { downloadCsvFile } from './downloadFile';
import { getSetting, STORAGE_PREFIX } from './settings';

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const TRAINING_RECORDS_CHANGED_EVENT = 'vision-trainer-training-records-changed';

const TRAINING_RECORDS_KEY = `${STORAGE_PREFIX}training_records_v1`;

const MODULE_TITLE_KEYS: Record<string, TranslationKey> = {
  'motor-training': 'home.module.motor.title',
  'cognitive-training': 'home.module.cognitive.title',
  'speech-training': 'home.module.speech.title',
};

export interface TrainingRecordConfig {
  totalRounds?: number;
  oculomotorMode?: string;
  oculomotorPattern?: string;
  oculomotorDurationSec?: number;
  oculomotorSpeedDegPerSec?: number;
  oculomotorTargetSizeMm?: number;
  oculomotorDistractorCount?: number;
  gaborDurationSec?: number;
  gaborMaxSpots?: number;
  readingWPS?: number;
  readingCrowding?: number;
  readingContrast?: number;
  drivingDurationSec?: number;
  drivingRedFlashEnabled?: boolean;
  drivingDifficulty?: string;
  drivingControlMode?: string;
}

export interface TrainingRecord {
  id: string;
  savedAt: string;
  userName: string;
  moduleId: string;
  difficulty: string;
  oculomotorMode?: string;
  oculomotorPattern?: string;
  config?: TrainingRecordConfig;
  results: TrialData[];
}

interface SaveTrainingRecordArgs {
  userName: string;
  moduleId: string;
  difficulty: string;
  oculomotorMode?: string;
  oculomotorPattern?: string;
  config?: TrainingRecordConfig;
  results: TrialData[];
}

type CsvRow = unknown[];

export function getTrainingRecords(): TrainingRecord[] {
  try {
    const raw = localStorage.getItem(TRAINING_RECORDS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(toTrainingRecord)
      .filter((record): record is TrainingRecord => record !== null);
  } catch (error) {
    console.warn('Unable to read saved training records.', error);
    return [];
  }
}

export function getTrainingRecordCount(): number {
  return getTrainingRecords().length;
}

export function saveTrainingRecord(args: SaveTrainingRecordArgs): TrainingRecord | null {
  if (args.results.length === 0) return null;

  const record: TrainingRecord = {
    id: createRecordId(),
    savedAt: new Date().toISOString(),
    userName: args.userName,
    moduleId: args.moduleId,
    difficulty: args.difficulty,
    oculomotorMode: args.oculomotorMode,
    oculomotorPattern: args.oculomotorPattern,
    config: args.config,
    results: args.results,
  };

  try {
    const records = getTrainingRecords();
    localStorage.setItem(TRAINING_RECORDS_KEY, JSON.stringify([...records, record]));
    window.dispatchEvent(new Event(TRAINING_RECORDS_CHANGED_EVENT));
    return record;
  } catch (error) {
    console.warn('Unable to save training record.', error);
    return null;
  }
}

export function downloadAllTrainingRecordsCsv(t: TFunction): boolean {
  const records = getTrainingRecords();
  if (records.length === 0) return false;

  const now = new Date();
  const prefix = getSetting('downloadDirectory');
  const filenameDate = formatDate(now);
  const filenameTime = formatTime(now).replace(/:/g, '');
  const filename = `${prefix ? `${prefix}_` : ''}training_records_${filenameDate}_${filenameTime}.csv`;

  downloadCsvFile(buildTrainingRecordsCsv(records, t), filename);
  return true;
}

export function buildTrainingRecordsCsv(records: TrainingRecord[], t: TFunction): string {
  const headers = [
    t('exp.csv.date'),
    t('exp.csv.time'),
    t('exp.csv.sessionId'),
    t('exp.csv.savedAt'),
    t('exp.csv.user'),
    t('exp.csv.module'),
    t('exp.csv.moduleId'),
    t('exp.csv.diff'),
    t('exp.csv.mode'),
    t('exp.csv.path'),
    t('exp.csv.trialType'),
    t('exp.csv.round'),
    t('exp.csv.target'),
    t('exp.csv.response'),
    t('exp.csv.correct'),
    t('exp.csv.rt'),
    t('exp.csv.duration'),
    t('exp.csv.score'),
    t('exp.csv.acquired'),
    t('exp.csv.fps'),
    t('exp.csv.aoi'),
    t('exp.csv.status'),
    t('exp.csv.event'),
    t('exp.csv.valid'),
    t('exp.csv.collision'),
    t('exp.csv.preBrake'),
    t('exp.csv.laneDeviations'),
    t('exp.csv.routeProgress'),
    t('exp.csv.readingWps'),
    t('exp.csv.readingCrowding'),
  ];

  const rows = records.flatMap((record) => toCsvRows(record, t));
  return [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
}

function toCsvRows(record: TrainingRecord, t: TFunction): CsvRow[] {
  const firstResult = record.results[0];
  const moduleLabel = formatModule(record.moduleId, t);
  const difficulty = formatDifficulty(record.config?.drivingDifficulty ?? record.difficulty, t);
  const { date, time } = formatSavedAt(record.savedAt);
  const readingWPS = record.config?.readingWPS ?? '';
  const readingCrowding = record.config?.readingCrowding ?? '';

  const base = [
    date,
    time,
    record.id,
    record.savedAt,
    record.userName,
    moduleLabel,
    record.moduleId,
    difficulty,
  ];

  if (record.moduleId === 'driving-rehab') {
    const events = firstResult?.driving_events ?? [];
    if (events.length === 0) {
      return [[
        ...base,
        '',
        '',
        firstResult?.trial_type ?? '',
        '',
        '',
        firstResult?.response ?? '',
        '',
        firstResult?.average_rt ?? '',
        firstResult?.duration_ms ?? firstResult?.rt ?? '',
        '',
        '',
        firstResult?.average_fps ?? '',
        '',
        '',
        '',
        '',
        '',
        '',
        firstResult?.lane_deviations ?? '',
        firstResult?.route_progress ?? '',
        '',
        '',
      ]];
    }

    return events.map((event, index) => [
      ...base,
      '',
      '',
      firstResult?.trial_type ?? '',
      index + 1,
      '',
      event.response,
      '',
      event.rt_ms ?? '',
      firstResult?.duration_ms ?? firstResult?.rt ?? '',
      '',
      '',
      firstResult?.average_fps ?? '',
      '',
      '',
      event.label,
      event.valid,
      event.collision,
      event.brake_preheld,
      firstResult?.lane_deviations ?? '',
      firstResult?.route_progress ?? '',
      '',
      '',
    ]);
  }

  return record.results.map((result, index) => [
    ...base,
    formatOculomotorMode(result.mode ?? record.oculomotorMode ?? record.config?.oculomotorMode, t),
    formatOculomotorPath(result.pattern ?? record.oculomotorPattern ?? record.config?.oculomotorPattern, t),
    result.trial_type ?? '',
    index + 1,
    result.target ?? '',
    (result as TrialData & { response_text?: string }).response_text ?? result.response ?? '',
    formatCorrect(result.correct),
    result.rt ?? result.reading_time ?? '',
    result.duration_ms ?? '',
    result.score ?? '',
    result.acquired_targets ?? '',
    result.average_fps ?? '',
    (result as TrialData & { aoi_score?: number }).aoi_score ?? '',
    result.response ?? '',
    '',
    '',
    '',
    '',
    result.lane_deviations ?? '',
    result.route_progress ?? '',
    record.moduleId === 'reading-training' ? readingWPS : '',
    record.moduleId === 'reading-training' ? readingCrowding : '',
  ]);
}

function toTrainingRecord(value: unknown): TrainingRecord | null {
  const item = toObject(value);
  if (!item || !Array.isArray(item.results)) return null;

  return {
    id: typeof item.id === 'string' ? item.id : createRecordId(),
    savedAt: typeof item.savedAt === 'string' ? item.savedAt : new Date().toISOString(),
    userName: typeof item.userName === 'string' ? item.userName : '',
    moduleId: typeof item.moduleId === 'string' ? item.moduleId : '',
    difficulty: typeof item.difficulty === 'string' ? item.difficulty : '',
    oculomotorMode: typeof item.oculomotorMode === 'string' ? item.oculomotorMode : undefined,
    oculomotorPattern: typeof item.oculomotorPattern === 'string' ? item.oculomotorPattern : undefined,
    config: toObject(item.config) as TrainingRecordConfig | undefined,
    results: item.results as TrialData[],
  };
}

function toObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function createRecordId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}_${randomPart}`;
}

function formatSavedAt(savedAt: string): { date: string; time: string } {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  return { date: formatDate(date), time: formatTime(date) };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}

function formatModule(moduleId: string, t: TFunction): string {
  const key = MODULE_TITLE_KEYS[moduleId];
  return key ? t(key) : moduleId;
}

function formatDifficulty(difficulty: string, t: TFunction): string {
  if (difficulty === 'beginner' || difficulty === 'intermediate' || difficulty === 'advanced') {
    return t(`home.diff.${difficulty}` as TranslationKey);
  }
  return difficulty;
}

function formatOculomotorMode(mode: string | undefined, t: TFunction): string {
  return mode ? t(`preset.mode.${mode}` as TranslationKey) : '';
}

function formatOculomotorPath(path: string | undefined, t: TFunction): string {
  return path ? t(`preset.path.${path}` as TranslationKey) : '';
}

function formatCorrect(correct: boolean | undefined): string {
  if (correct === undefined) return '';
  return correct ? 'true' : 'false';
}

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}
