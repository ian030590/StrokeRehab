import { useState } from "react";
import { getTrainingModules } from "../trainingModules";
import type { TrainingCategory, TrainingModuleId } from "../trainingModules";
import TrainingModuleCard from "../components/TrainingModuleCard";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

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
            onApply={(summary, values) => {
              if (expandedModule.id === "writing-defense" || expandedModule.id === "healthy-movement" || expandedModule.id === "connect-dots" || expandedModule.id === "chinese-crossword") {
                const params = new URLSearchParams(values);
                navigate(`/training/${expandedModule.id}?${params.toString()}`);
              } else {
                alert(`準備啟動 [${expandedModule.title}]\n\n${summary}`);
              }
            }}
          />
        )}
      </div>
    </main>
  );
}
