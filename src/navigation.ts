export type AppPage = "motor" | "cognitive" | "settings" | "credits" | "links";

export interface NavItem {
  page: AppPage;
  label: string;
}

export const navItems: NavItem[] = [
  { page: "motor", label: "動作訓練" },
  { page: "cognitive", label: "認知訓練" },
  { page: "settings", label: "設定" },
  { page: "credits", label: "致謝" },
  { page: "links", label: "相關網頁" },
];

const appPages = new Set<AppPage>([
  "motor",
  "cognitive",
  "settings",
  "credits",
  "links",
]);

export function parseHashPage(hash: string): AppPage {
  const page = hash.replace(/^#\/?/, "").split("?")[0];
  return appPages.has(page as AppPage) ? (page as AppPage) : "motor";
}

export function setHashPage(page: AppPage) {
  window.location.hash = `/${page}`;
}
