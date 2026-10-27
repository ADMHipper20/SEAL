import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./styles/styles.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SEAL — Marine Lobster Tank Water-Quality Monitoring & Forecasting",
  description:
    "Literature-grounded fuzzy suitability inference and classical time-series forecasting (ARIMA / SARIMA / VAR) for marine lobster holding tank telemetry (GMT+7).",
};

export const viewport: Viewport = {
  themeColor: "#cbc6c2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
