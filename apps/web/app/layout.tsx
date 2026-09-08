import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
export const metadata: Metadata = {
  title: {
    default: "Convex Credits · Every charge accounted for",
    template: "%s · Convex Credits",
  },
  description:
    "Reserve credits for background jobs. Complete once, release on failure, and keep a clear ledger. An open-source Convex component by CLIPIN.",
};
export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
