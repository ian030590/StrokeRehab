import { useMemo, useState } from "react";
import ModuleSettingsModal from "../components/ModuleSettingsModal";
import TrainingModuleCard from "../components/TrainingModuleCard";
import {
  getTrainingModules,
  type TrainingCategory,
  type TrainingModuleId,
} from "../trainingModules";

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
  const modules = useMemo(() => getTrainingModules(category), [category]);
  const [selectedModuleId, setSelectedModuleId] = useState<TrainingModuleId | null>(null);
  const [appliedSummary, setAppliedSummary] = useState<string | null>(null);
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? null;

  return (
    <main className="page-content training-page" aria-labelledby={`${category}-page-title`}>
      <div className="training-page-stack">
        <header className="training-page-header">
          <h1 id={`${category}-page-title`} className="section-title fade-in-up">
            {title}
          </h1>
          <p className="section-subtitle fade-in-up">{subtitle}</p>
        </header>

        {appliedSummary && (
          <div className="status-banner training-selection-banner" role="status">
            <span className="ready-dot" aria-hidden="true" />
            <span>{appliedSummary}</span>
          </div>
        )}

        <div className="training-grid">
          {modules.map((module) => (
            <TrainingModuleCard
              key={module.id}
              module={module}
              selectedModule={selectedModuleId}
              onSelect={(moduleId) =>
                setSelectedModuleId((current) => (current === moduleId ? null : moduleId))
              }
            />
          ))}
        </div>
      </div>

      {selectedModule && (
        <ModuleSettingsModal
          module={selectedModule}
          onClose={() => setSelectedModuleId(null)}
          onApply={setAppliedSummary}
        />
      )}
    </main>
  );
}
