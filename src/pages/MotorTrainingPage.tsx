import TrainingModulesPage from "./TrainingModulesPage";
import { useT } from "../i18n";

export default function MotorTrainingPage() {
  const { t } = useT();

  return (
    <TrainingModulesPage
      category="motor"
      title={t("training.motor.title")}
      subtitle={t("training.motor.subtitle")}
    />
  );
}
