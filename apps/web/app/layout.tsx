import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://convex-credits.vercel.app"),
  openGraph: {
    images: [
      {
        url: "/directory-thumbnail.png",
        width: 1536,
        height: 864,
        alt: "Convex Credits: one debit for a completed job",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
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
