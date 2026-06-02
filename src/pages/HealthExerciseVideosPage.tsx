import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HEALTH_EXERCISE_VIDEOS, getHealthExerciseVideo } from "../healthExerciseVideos";
import { useT } from "../i18n";

const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
const healthExerciseYoutubeIds = HEALTH_EXERCISE_VIDEOS.map((video) => getYoutubeVideoId(video.youtubeUrl)).filter(isString);

interface YouTubeVideoDetails {
  id: string;
  title?: string;
  channelTitle?: string;
  durationLabel?: string;
  thumbnailUrl?: string;
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: YouTubeThumbnails;
  };
  contentDetails?: {
    duration?: string;
  };
}

type YouTubeThumbnails = Record<string, { url?: string }>;

export default function HealthExerciseVideosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useT();
  const [youtubeVideos, setYoutubeVideos] = useState<Record<string, YouTubeVideoDetails>>({});
  const selectedVideo = getHealthExerciseVideo(searchParams.get("video"));
  const text = lang === "en"
    ? {
        title: "Healthy Movement",
        subtitle: "Health exercise YouTube videos",
        openVideo: "Open Video",
        back: "Back to Motor Training",
        youtube: "YouTube",
      }
    : {
        title: "健康動一動",
        subtitle: "健康操 YouTube 影片",
        openVideo: "開啟影片",
        back: "返回動作訓練",
        youtube: "YouTube",
      };
  const selectedAudience = lang === "en" ? selectedVideo.audienceEn ?? selectedVideo.audience : selectedVideo.audience;
  const selectedDescription = lang === "en" ? selectedVideo.descriptionEn ?? selectedVideo.description : selectedVideo.description;

  const videoId = useMemo(() => {
    return getYoutubeVideoId(selectedVideo.youtubeUrl) ?? "";
  }, [selectedVideo.youtubeUrl]);
  const selectedYoutubeVideo = videoId ? youtubeVideos[videoId] : undefined;
  const selectedTitle = selectedYoutubeVideo?.title ?? (lang === "en" ? selectedVideo.titleEn ?? selectedVideo.title : selectedVideo.title);
  const selectedProvider = selectedYoutubeVideo?.channelTitle ?? (lang === "en" ? selectedVideo.providerEn ?? selectedVideo.provider : selectedVideo.provider);
  const selectedDuration = selectedYoutubeVideo?.durationLabel ?? (lang === "en" ? selectedVideo.durationLabelEn ?? selectedVideo.durationLabel : selectedVideo.durationLabel);
  const selectedThumbnail = selectedYoutubeVideo?.thumbnailUrl ?? (videoId ? getFallbackThumbnailUrl(videoId) : undefined);

  useEffect(() => {
    const apiKey = youtubeApiKey ?? "";

    if (!apiKey || healthExerciseYoutubeIds.length === 0) {
      return;
    }

    const controller = new AbortController();

    async function loadYoutubeVideos() {
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        id: healthExerciseYoutubeIds.join(","),
        key: apiKey,
      });

      try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`YouTube API returned ${response.status}`);
        }

        const data = await response.json() as YouTubeVideosResponse;
        const videos = (data.items ?? []).reduce<Record<string, YouTubeVideoDetails>>((acc, item) => {
          if (!item.id) {
            return acc;
          }

          acc[item.id] = {
            id: item.id,
            title: item.snippet?.title,
            channelTitle: item.snippet?.channelTitle,
            durationLabel: item.contentDetails?.duration ? formatYouTubeDuration(item.contentDetails.duration) : undefined,
            thumbnailUrl: getBestThumbnailUrl(item.snippet?.thumbnails),
          };
          return acc;
        }, {});

        setYoutubeVideos(videos);
      } catch (error) {
        if (hasAbortErrorName(error)) {
          return;
        }

        setYoutubeVideos({});
      }
    }

    void loadYoutubeVideos();

    return () => controller.abort();
  }, []);

  const selectVideo = (id: string) => {
    setSearchParams({ video: id });
  };

  return (
    <main className="page-content training-page" aria-labelledby="health-exercise-title">
      <div className="training-page-stack">
        <header className="training-page-header">
          <h1 id="health-exercise-title" className="section-title fade-in-up">
            {text.title}
          </h1>
          <p className="section-subtitle fade-in-up">{text.subtitle}</p>
        </header>

        <section style={layoutStyle}>
          <div style={featurePanelStyle}>
            <div style={{ ...previewStyle, ...(selectedThumbnail ? getThumbnailPreviewStyle(selectedThumbnail) : {}) }}>
              <div style={playIconStyle} aria-hidden="true">
                ▶
              </div>
              <div style={youtubeLabelStyle}>{text.youtube}</div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <p style={eyebrowStyle}>{selectedProvider}</p>
                <h2 style={{ margin: "2px 0 0", fontSize: 28 }}>{selectedTitle}</h2>
              </div>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{selectedDescription}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[selectedAudience, selectedDuration]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} style={pillStyle}>{tag}</span>
                  ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                <a href={selectedVideo.youtubeUrl} target="_blank" rel="noreferrer" style={primaryButtonStyle}>
                  {text.openVideo}
                </a>
                <button type="button" onClick={() => navigate("/motor")} style={secondaryButtonStyle}>
                  {text.back}
                </button>
              </div>
            </div>
          </div>

          <div style={listStyle}>
            {HEALTH_EXERCISE_VIDEOS.map((video) => {
              const isSelected = video.id === selectedVideo.id;
              const listVideoId = getYoutubeVideoId(video.youtubeUrl) ?? "";
              const youtubeVideo = listVideoId ? youtubeVideos[listVideoId] : undefined;
              const listTitle = youtubeVideo?.title ?? (lang === "en" ? video.titleEn ?? video.title : video.title);
              const listProvider = youtubeVideo?.channelTitle ?? (lang === "en" ? video.providerEn ?? video.provider : video.provider);
              const listAudience = lang === "en" ? video.audienceEn ?? video.audience : video.audience;
              const listDuration = youtubeVideo?.durationLabel ?? (lang === "en" ? video.durationLabelEn ?? video.durationLabel : video.durationLabel);

              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => selectVideo(video.id)}
                  style={{
                    ...videoButtonStyle,
                    borderColor: isSelected ? "#2563eb" : "#d5dde8",
                    background: isSelected ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{listTitle}</span>
                  <span style={{ color: "#64748b", lineHeight: 1.5 }}>
                    {[listProvider, listAudience, listDuration].filter(Boolean).join(" / ")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function isString(value: string | undefined): value is string {
  return Boolean(value);
}

function getYoutubeVideoId(youtubeUrl: string) {
  try {
    const url = new URL(youtubeUrl);

    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0];
    }

    if (url.hostname.endsWith("youtube.com")) {
      return url.searchParams.get("v") ?? undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getBestThumbnailUrl(thumbnails: YouTubeThumbnails | undefined) {
  return thumbnails?.maxres?.url
    ?? thumbnails?.standard?.url
    ?? thumbnails?.high?.url
    ?? thumbnails?.medium?.url
    ?? thumbnails?.default?.url;
}

function getFallbackThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function formatYouTubeDuration(duration: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function hasAbortErrorName(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function getThumbnailPreviewStyle(thumbnailUrl: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.68)), url("${thumbnailUrl}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
  alignItems: "start",
};

const featurePanelStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  background: "#ffffff",
  border: "1px solid #d5dde8",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
};

const previewStyle: CSSProperties = {
  minHeight: 280,
  borderRadius: 8,
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 12,
};

const playIconStyle: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "#ef4444",
  color: "#ffffff",
  display: "grid",
  placeItems: "center",
  fontSize: 30,
  paddingLeft: 4,
  boxShadow: "0 18px 38px rgba(15, 23, 42, 0.34)",
};

const youtubeLabelStyle: CSSProperties = {
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 18,
  textShadow: "0 2px 10px rgba(15, 23, 42, 0.7)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#2563eb",
  fontSize: 14,
  fontWeight: 800,
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#334155",
  fontSize: 14,
  fontWeight: 700,
  padding: "6px 10px",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 6,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 16px",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 44,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 800,
  padding: "0 16px",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const videoButtonStyle: CSSProperties = {
  border: "1px solid #d5dde8",
  borderRadius: 8,
  cursor: "pointer",
  display: "grid",
  gap: 6,
  padding: 16,
  textAlign: "left",
};
