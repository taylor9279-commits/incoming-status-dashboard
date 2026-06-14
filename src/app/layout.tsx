import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Import Order Dashboard — 산펠레그리노·아쿠아파나",
  description: "산펠레그리노·아쿠아파나 수입 오더 운영 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-density="regular" data-kpi="cards">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
