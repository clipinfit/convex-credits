import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "convex-credits" },
    links: [
      { text: "Documentation", url: "/docs", active: "nested-url" },
      { text: "Release status", url: "/docs/release-status" },
    ],
    githubUrl: "https://github.com/clipinfit/convex-credits",
  };
}
