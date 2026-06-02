export interface HealthExerciseVideo {
  id: string;
  title: string;
  provider: string;
  durationLabel?: string;
  audience: string;
  description: string;
  youtubeUrl: string;
  tags: readonly string[];
}

export const HEALTH_EXERCISE_VIDEOS: readonly HealthExerciseVideo[] = [
  {
    id: "mohw-senior-health-exercise",
    title: "高齡者健康操",
    provider: "衛生福利部",
    audience: "高齡者",
    description: "適合高齡者跟著影片進行溫和全身活動。",
    youtubeUrl: "https://www.youtube.com/watch?v=_w50TfdCmKU",
    tags: ["高齡者", "全身活動", "健康操"],
  },
  {
    id: "mohw-office-worker-15min",
    title: "15分鐘上班族健康操",
    provider: "衛生福利部",
    durationLabel: "15分鐘",
    audience: "上班族",
    description: "適合久坐族群利用短時間活動肩頸、軀幹與四肢。",
    youtubeUrl: "https://www.youtube.com/watch?v=AExY450VSxg",
    tags: ["上班族", "久坐活動", "健康操"],
  },
];

export function getHealthExerciseVideo(id: string | null) {
  return HEALTH_EXERCISE_VIDEOS.find((video) => video.id === id) ?? HEALTH_EXERCISE_VIDEOS[0];
}
