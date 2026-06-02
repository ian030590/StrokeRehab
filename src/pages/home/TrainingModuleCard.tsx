import type { CSSProperties } from 'react';
import type { TranslationKey } from '../../i18n';
import type { TrainingModuleCardData, TrainingModuleId } from './trainingModules';

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface TrainingModuleCardProps {
  module: TrainingModuleCardData;
  expandedModule: TrainingModuleId | null;
  onSelect: (moduleId: TrainingModuleId) => void;
  t: TFunction;
}

const moduleCardActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 16,
  fontSize: 13,
  color: 'var(--accent)',
  fontWeight: 600,
};

export function TrainingModuleCard({ module, expandedModule, onSelect, t }: TrainingModuleCardProps) {
  const isExpanded = expandedModule === module.id;

  return (
    <div
      className={`card fade-in-up ${isExpanded ? 'card-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => onSelect(module.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(module.id);
        }
      }}
    >
      <div className="card-icon">{module.icon}</div>
      <div className="card-title">{t(module.titleKey)}</div>
      <div className="card-desc">{t(module.descKey)}</div>
      <div style={moduleCardActionStyle}>
        {isExpanded ? t('btn.collapseSettings') : t('btn.selectModule')}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
