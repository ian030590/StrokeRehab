import type { SessionExport } from "../types";

const csvEscape = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export function sessionExportToCsv(session: SessionExport) {
  const headers = [
    "game",
    "round",
    "startedAt",
    "graspedAt",
    "completedAt",
    "completionTimeMs",
    "drops",
    "maxRomDeg",
    "smoothnessScore",
    "assistanceApplied",
    "trajectorySamples",
    "plannedCups",
    "completedCups",
    "successfulGrasps",
    "totalDrops",
    "averageCompletionMs",
    "sessionMaxRomDeg",
    "trajectorySmoothness",
    "graspToDropRatio",
  ];

  const rows =
    session.rounds.length > 0
      ? session.rounds.map((round) => [
          session.game,
          round.round,
          round.startedAt,
          round.graspedAt,
          round.completedAt,
          round.completionTimeMs,
          round.drops,
          round.maxRomDeg,
          round.smoothnessScore,
          round.assistanceApplied,
          round.trajectory.length,
          session.summary.plannedCups,
          session.summary.completedCups,
          session.summary.successfulGrasps,
          session.summary.drops,
          session.summary.averageCompletionMs,
          session.summary.maxRomDeg,
          session.summary.trajectorySmoothness,
          session.summary.graspToDropRatio,
        ])
      : [
          [
            session.game,
            "",
            session.startedAt,
            "",
            session.endedAt,
            "",
            "",
            "",
            "",
            "",
            "",
            session.summary.plannedCups,
            session.summary.completedCups,
            session.summary.successfulGrasps,
            session.summary.drops,
            session.summary.averageCompletionMs,
            session.summary.maxRomDeg,
            session.summary.trajectorySmoothness,
            session.summary.graspToDropRatio,
          ],
        ];

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

export function createSessionFilename(extension: "csv" | "json") {
  return `cafe-barista-session-${new Date().toISOString().slice(0, 19)}.${extension}`;
}
