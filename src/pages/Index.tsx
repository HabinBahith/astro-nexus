import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { ISSTracker } from "@/components/tracker/ISSTracker";
import { SpaceWeather } from "@/components/weather/SpaceWeather";
import { MissionsFeed } from "@/components/missions/MissionsFeed";
import { AIExplainer } from "@/components/ai/AIExplainer";

const Index = () => {
  const [activeSection, setActiveSection] = useState("tracker");

  return (
    <div className="min-h-screen bg-background starfield">
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />
      
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

      <Header activeSection={activeSection} onNavigate={setActiveSection} />

      <main className="relative pt-20 pb-8 px-4 max-w-7xl mx-auto">
        {/* Status Bar */}
        <div className="mb-6">
          <StatusBar />
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* ISS Tracker - Full Width */}
          <div
            id="tracker"
            className={activeSection === "tracker" ? "" : "hidden md:block"}
          >
            <ISSTracker />
          </div>

          {/* Weather and Missions - Two Column */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div
              id="weather"
              className={activeSection === "weather" ? "" : "hidden md:block"}
            >
              <SpaceWeather />
            </div>
            <div
              id="missions"
              className={activeSection === "missions" ? "" : "hidden md:block"}
            >
              <MissionsFeed />
            </div>
          </div>

          {/* AI Explainer - Full Width */}
          <div
            id="ai"
            className={activeSection === "ai" ? "" : "hidden md:block"}
          >
            <AIExplainer />
          </div>
        </div>

        {/* Footer */}
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
};

export default Index;
