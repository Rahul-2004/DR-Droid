import type { Metadata } from "next";
import "@/app/globals.css";
import { QueryProvider } from "@/components/query-provider";

export const metadata: Metadata = {
  title: "MicroManus — Deep research",
  description: "Evidence-backed web research with your own AI provider.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><QueryProvider>{children}</QueryProvider></body></html>;
}
