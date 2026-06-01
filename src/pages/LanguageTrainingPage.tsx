import TrainingModulesPage from "./TrainingModulesPage";
import { useT } from "../i18n";

export default function LanguageTrainingPage() {
  const { t } = useT();

  return (
    <TrainingModulesPage
      category="language"
      title={t("training.language.title")}
      subtitle={t("training.language.subtitle")}
    />
  );
}
