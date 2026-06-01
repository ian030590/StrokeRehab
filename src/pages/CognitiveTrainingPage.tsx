import TrainingModulesPage from "./TrainingModulesPage";
import { useT } from "../i18n";

export default function CognitiveTrainingPage() {
  const { t } = useT();

  return (
    <TrainingModulesPage
      category="cognitive"
      title={t("training.cognitive.title")}
      subtitle={t("training.cognitive.subtitle")}
    />
  );
}
