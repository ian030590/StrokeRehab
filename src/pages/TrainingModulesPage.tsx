import type { TrainingCategory } from "../trainingModules";

interface TrainingModulesPageProps {
  category: TrainingCategory;
  title: string;
  subtitle: string;
}

export default function TrainingModulesPage({
  category,
  title,
  subtitle,
}: TrainingModulesPageProps) {
  return (
    <main className="page-content training-page" aria-labelledby={`${category}-page-title`}>
      <div className="training-page-stack">
        <header className="training-page-header">
          <h1 id={`${category}-page-title`} className="section-title fade-in-up">
            {title}
          </h1>
          <p className="section-subtitle fade-in-up">{subtitle}</p>
        </header>

        <section className="blank-surface training-blank-surface" aria-label={`${title}內容`} />
      </div>
    </main>
  );
}
