export interface HealthExerciseVideo {
  id: string;
  title: string;
  titleEn?: string;
  provider: string;
  providerEn?: string;
  durationLabel?: string;
  durationLabelEn?: string;
  audience: string;
  audienceEn?: string;
  description: string;
  descriptionEn?: string;
  youtubeUrl: string;
}

export const HEALTH_EXERCISE_VIDEOS: readonly HealthExerciseVideo[] = [
  {
    id: "mohw-senior-health-exercise",
    title: "高齡者健康操",
    titleEn: "Senior Health Exercise",
    provider: "衛生福利部",
    providerEn: "Ministry of Health and Welfare",
    audience: "高齡者",
    audienceEn: "Older Adults",
    description: "適合高齡者跟著影片進行溫和全身活動。",
    descriptionEn: "A gentle full-body exercise video suitable for older adults.",
    youtubeUrl: "https://www.youtube.com/watch?v=_w50TfdCmKU",
  },
  {
    id: "mohw-office-worker-15min",
    title: "15分鐘上班族健康操",
    titleEn: "15-minute Office Worker Health Exercise",
    provider: "衛生福利部",
    providerEn: "Ministry of Health and Welfare",
    durationLabel: "15分鐘",
    durationLabelEn: "15 minutes",
    audience: "上班族",
    audienceEn: "Office Workers",
    description: "適合久坐族群利用短時間活動肩頸、軀幹與四肢。",
    descriptionEn: "A short routine for people who sit for long periods, covering the neck, shoulders, trunk, and limbs.",
    youtubeUrl: "https://www.youtube.com/watch?v=AExY450VSxg",
  },
];

export function getHealthExerciseVideo(id: string | null) {
  return HEALTH_EXERCISE_VIDEOS.find((video) => video.id === id) ?? HEALTH_EXERCISE_VIDEOS[0];
}
