import { useState } from "react";
import { getTrainingModules } from "../trainingModules";
import type { TrainingCategory, TrainingModuleId } from "../trainingModules";
import TrainingModuleCard from "../components/TrainingModuleCard";
import ModuleSettingsModal from "../components/ModuleSettingsModal";

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
  const modules = getTrainingModules(category);
  const [expandedModuleId, setExpandedModuleId] = useState<TrainingModuleId | null>(null);

  const expandedModule = modules.find((m) => m.id === expandedModuleId);

  return (
    <main className="page-content training-page" aria-labelledby={`${category}-page-title`}>
      <div className="training-page-stack">
        <header className="training-page-header">
          <h1 id={`${category}-page-title`} className="section-title fade-in-up">
            {title}
          </h1>
          <p className="section-subtitle fade-in-up">{subtitle}</p>
        </header>

        <div className="training-grid">
          {modules.map((module) => (
            <TrainingModuleCard
              key={module.id}
              module={module}
              selectedModule={expandedModuleId}
              onSelect={(id) => setExpandedModuleId(expandedModuleId === id ? null : id)}
            />
          ))}
        </div>

        {expandedModule && (
          <ModuleSettingsModal
            module={expandedModule}
            onClose={() => setExpandedModuleId(null)}
            onApply={(summary) => {
              alert(`準備啟動 [${expandedModule.title}]\n\n${summary}`);
              // 這裡可以加入實際導向到訓練畫面的邏輯，例如 navigate(`/training?module=${expandedModule.id}...`)
            }}
          />
        )}
      </div>
    </main>
  );
}
