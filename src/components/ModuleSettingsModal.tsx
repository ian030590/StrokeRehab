import { useEffect, useMemo, useState } from "react";
import type { TrainingModuleCardData } from "../trainingModules";
import { useT } from "../i18n";

interface ModuleSettingsModalProps {
  module: TrainingModuleCardData;
  onClose: () => void;
  onApply: (summary: string, values: Record<string, string>) => void;
}

function getDefaultValues(module: TrainingModuleCardData) {
  return Object.fromEntries(
    module.settings.map((setting) => [setting.id, setting.options[0]?.value ?? ""]),
  ) as Record<string, string>;
}

export default function ModuleSettingsModal({
  module,
  onClose,
  onApply,
}: ModuleSettingsModalProps) {
  const { t, lang } = useT();
  const [values, setValues] = useState<Record<string, string>>(() => getDefaultValues(module));
  const modalText = lang === "en"
    ? { title: "Module Settings", close: "Close settings", current: "Current settings" }
    : { title: "模組設定", close: "關閉設定", current: "目前設定" };

  useEffect(() => {
    setValues(getDefaultValues(module));
  }, [module]);

  const selectedOptions = useMemo(
    () =>
      module.settings.map((setting) => {
        const selectedValue = values[setting.id];
        return setting.options.find((option) => option.value === selectedValue) ?? setting.options[0];
      }),
    [module, values],
  );

  const summary = selectedOptions
    .filter(Boolean)
    .map((option) => option.label)
    .join(" / ");

  return (
    <div className="config-modal-overlay fade-in" role="presentation" onClick={onClose}>
      <section
        className="module-config-panel config-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="config-modal-header">
          <div>
            <p className="config-eyebrow">{modalText.title}</p>
            <h2 id="module-settings-title">{module.title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" type="button" aria-label={modalText.close} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {module.settings.map((setting) => (
          <div key={setting.id} className="config-section">
            <div className="config-label">{setting.label}</div>
            <div className="difficulty-selector">
              {setting.options.map((option) => {
                const isActive = values[setting.id] === option.value;
                return (
                  <button
                    key={option.value}
                    className={`diff-btn ${isActive ? "active" : ""}`}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        [setting.id]: option.value,
                      }))
                    }
                  >
                    <span className="diff-btn-label">{option.label}</span>
                    {option.description && <span className="diff-btn-desc">{option.description}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="config-actions">
          <button
            className="btn btn-primary btn-lg config-start-btn"
            type="button"
            onClick={() => {
              onApply(`${module.title}：${summary}`, values);
              onClose();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            {t("btn.startTraining")}
          </button>
          <button className="btn btn-ghost btn-lg" type="button" onClick={onClose}>
            {t("btn.cancel")}
          </button>
        </div>

        <div className="config-summary">
          {modalText.current} <strong>{summary}</strong>
        </div>

        {/* Preload text glyphs for WritingDefenseGame to prevent in-game stutter */}
        {module.id === "writing-defense" && (
          <div aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
            <span style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}>
              天古元右左夫吉
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
