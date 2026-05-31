import { ExternalLink } from "lucide-react";

const links = [
  {
    title: "World Stroke Organization",
    description: "全球中風倡議、衛教與復健相關資訊。",
    href: "https://www.world-stroke.org/",
  },
  {
    title: "American Stroke Association",
    description: "中風後照護、復健與生活調整資源。",
    href: "https://www.stroke.org/",
  },
  {
    title: "CDC Stroke",
    description: "中風風險、預防與公共衛生資訊。",
    href: "https://www.cdc.gov/stroke/",
  },
  {
    title: "MediaPipe Hand Landmarker",
    description: "手部 21 點追蹤模型與網頁實作文件。",
    href: "https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker",
  },
];

export default function RelatedLinksPage() {
  return (
    <main className="page-content page-stack">
      <section className="section-header">
        <p className="page-kicker">外部資源</p>
        <h1 className="section-title">相關網頁</h1>
        <p className="section-subtitle">
          這裡整理復健、衛教與技術實作相關網站，方便治療師或開發者延伸查閱。
        </p>
      </section>

      <section className="link-list" aria-label="相關網頁清單">
        {links.map((link) => (
          <a
            key={link.href}
            className="link-card"
            href={link.href}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>{link.title}</strong>
              <small>{link.description}</small>
            </span>
            <ExternalLink size={20} />
          </a>
        ))}
      </section>
    </main>
  );
}
