import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => (
  <div className="min-h-screen bg-background starfield">
    <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />
    <div className="fixed inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

    <Header />

    <main className="relative pt-20 pb-8 px-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <StatusBar />
      </div>

      <div className="space-y-6">{children}</div>

      <footer className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-display">ASTRONEXUS</span> • Real-time space data
          visualization platform
        </p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          Data sources: NASA, NOAA SWPC, Open Notify, Launch Library 2
        </p>
      </footer>
    </main>
  </div>
);

