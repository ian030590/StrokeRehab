export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const formatSeconds = (milliseconds: number) =>
  `${(milliseconds / 1000).toFixed(1)} 秒`;

export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) {
    return "尚未完成";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
};
