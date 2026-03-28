import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grove - Where Money Grows",
  description: "Tend your finances like a garden. Watch your money tree flourish.",
  keywords: ["finance", "budgeting", "money management", "savings", "personal finance"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans grove-texture">
        <a
          href="#main-content"
          className="skip-to-main"
        >
          Skip to main content
        </a>
        <AppShell>
          {children}
        </AppShell>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
