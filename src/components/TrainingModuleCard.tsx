import type { TrainingModuleCardData, TrainingModuleId } from "../trainingModules";

interface TrainingModuleCardProps {
  module: TrainingModuleCardData;
  selectedModule: TrainingModuleId | null;
  onSelect: (moduleId: TrainingModuleId) => void;
}

export default function TrainingModuleCard({
  module,
  selectedModule,
  onSelect,
}: TrainingModuleCardProps) {
  const isSelected = selectedModule === module.id;

  return (
    <article
      className={`card training-module-card fade-in-up ${isSelected ? "card-active" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={isSelected}
      onClick={() => onSelect(module.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(module.id);
        }
      }}
    >
      <div className="card-icon training-module-icon">{module.icon}</div>
      <h2 className="card-title training-module-title">{module.title}</h2>
      <p className="card-desc training-module-desc">{module.description}</p>
      <div className="card-meta">
        {module.tags.map((tag) => (
          <span key={tag} className={`tag tag-${module.category}`}>
            {tag}
          </span>
        ))}
      </div>
      <div className="module-card-action">
        {isSelected ? "收合設定" : "設定模組"}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={isSelected ? "module-card-chevron is-open" : "module-card-chevron"}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </article>
  );
}
