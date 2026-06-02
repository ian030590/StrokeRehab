import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HEALTH_EXERCISE_VIDEOS, getHealthExerciseVideo } from "../../healthExerciseVideos";
import { useT } from "../../i18n";

export default function HealthExerciseVideosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useT();
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
  const selectedTitle = lang === "en" ? selectedVideo.titleEn ?? selectedVideo.title : selectedVideo.title;
  const selectedProvider = lang === "en" ? selectedVideo.providerEn ?? selectedVideo.provider : selectedVideo.provider;
  const selectedAudience = lang === "en" ? selectedVideo.audienceEn ?? selectedVideo.audience : selectedVideo.audience;
  const selectedDescription = lang === "en" ? selectedVideo.descriptionEn ?? selectedVideo.description : selectedVideo.description;
  const selectedDuration = lang === "en" ? selectedVideo.durationLabelEn ?? selectedVideo.durationLabel : selectedVideo.durationLabel;

  const videoId = useMemo(() => {
    const url = new URL(selectedVideo.youtubeUrl);
    return url.searchParams.get("v") ?? "";
  }, [selectedVideo.youtubeUrl]);

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
            <div style={previewStyle}>
              <div style={playIconStyle} aria-hidden="true">
                ▶
              </div>
              <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>
                {videoId ? `${text.youtube} ID: ${videoId}` : text.youtube}
              </div>
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
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{lang === "en" ? video.titleEn ?? video.title : video.title}</span>
                  <span style={{ color: "#64748b", lineHeight: 1.5 }}>
                    {lang === "en" ? video.providerEn ?? video.provider : video.provider} / {lang === "en" ? video.audienceEn ?? video.audience : video.audience}
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
