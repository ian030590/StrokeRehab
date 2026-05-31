import {
  Brain,
  Hand,
  HeartHandshake,
  Link,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type MainPage = "motor" | "cognitive" | "settings" | "credits" | "links";
export type AppPage = MainPage | "training" | "results";

export interface NavItem {
  page: MainPage;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { page: "motor", label: "動作訓練", icon: Hand },
  { page: "cognitive", label: "認知訓練", icon: Brain },
  { page: "settings", label: "設定", icon: Settings },
  { page: "credits", label: "致謝", icon: HeartHandshake },
  { page: "links", label: "相關網頁", icon: Link },
];

export const pageTitles: Record<AppPage, string> = {
  motor: "動作訓練",
  cognitive: "認知訓練",
  settings: "設定",
  credits: "致謝",
  links: "相關網頁",
  training: "Café Barista",
  results: "成績結算",
};

const appPages = new Set<AppPage>([
  "motor",
  "cognitive",
  "settings",
  "credits",
  "links",
  "training",
  "results",
]);

export function parseHashPage(hash: string): AppPage {
  const page = hash.replace(/^#\/?/, "").split("?")[0];
  return appPages.has(page as AppPage) ? (page as AppPage) : "motor";
}

export function setHashPage(page: AppPage) {
  window.location.hash = `/${page}`;
}
