import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 英語方法教練｜AI English Method Coach",
  description: "結合互動心智圖、七步教練流程、主動回想、間隔複習與學習分析的本機優先英語學習工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
