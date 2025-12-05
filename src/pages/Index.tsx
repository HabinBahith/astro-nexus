import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Globe2, Rocket, Satellite, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarSystemScene } from "@/components/space/SolarSystemScene";
import { PageLayout } from "./PageLayout";

type CelestialBody = {
  id: string;
  name: string;
  summary: string;
  distance: string;
  radius: string;
  fact: string;
  orbit: number;
  size: number;
  tint: string;
  color: string;
  speed: number;
};

const celestialBodies: CelestialBody[] = [
  {
    id: "mercury",
    name: "Mercury",
    summary: "Airless rocky world with extreme day-night temperature swings.",
    distance: "57.9 million km",
    radius: "2,439 km",
    fact: "Year lasts just 88 Earth days.",
    orbit: 10,
    size: 0.7,
    tint: "from-slate-300/80 to-slate-500/60",
    color: "#cbd5e1",
    speed: 1.7,
  },
  {
    id: "venus",
    name: "Venus",
    summary: "Super-heated greenhouse planet with crushing atmospheric pressure.",
    distance: "108.2 million km",
    radius: "6,052 km",
    fact: "Spins retrograde and more slowly than it orbits.",
    orbit: 14,
    size: 0.95,
    tint: "from-amber-200/80 to-orange-400/60",
    color: "#f59e0b",
    speed: 1.2,
  },
  {
    id: "earth",
    name: "Earth",
    summary: "Ocean world with protective magnetosphere and a breathable atmosphere.",
    distance: "149.6 million km",
    radius: "6,371 km",
    fact: "Only known world with liquid surface water and life.",
    orbit: 18,
    size: 1,
    tint: "from-cyan-300/80 to-blue-500/60",
    color: "#22d3ee",
    speed: 1,
  },
  {
    id: "mars",
    name: "Mars",
    summary: "Cold desert planet with the largest volcano and canyon.",
    distance: "227.9 million km",
    radius: "3,390 km",
    fact: "Olympus Mons towers ~22 km high.",
    orbit: 22,
    size: 0.75,
    tint: "from-orange-300/80 to-red-500/60",
    color: "#f97316",
    speed: 0.8,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    summary: "Gas giant with intense storms and a powerful magnetic field.",
    distance: "778.5 million km",
    radius: "69,911 km",
    fact: "Has 90+ known moons and the iconic Great Red Spot.",
    orbit: 30,
    size: 2.6,
    tint: "from-amber-200/70 to-amber-500/60",
    color: "#f7c272",
    speed: 0.45,
  },
  {
    id: "saturn",
    name: "Saturn",
    summary: "Ringed gas giant with icy rings and diverse moon system.",
    distance: "1.43 billion km",
    radius: "58,232 km",
    fact: "Rings span ~273,000 km wide but are razor thin.",
    orbit: 36,
    size: 2.2,
    tint: "from-amber-100/80 to-amber-400/60",
    color: "#facc15",
    speed: 0.3,
  },
  {
    id: "uranus",
    name: "Uranus",
    summary: "Ice giant tilted on its side with pale cyan hue.",
    distance: "2.87 billion km",
    radius: "25,362 km",
    fact: "Axis tilt is ~98°, causing extreme seasonal lighting.",
    orbit: 42,
    size: 1.8,
    tint: "from-teal-200/80 to-cyan-400/60",
    color: "#5eead4",
    speed: 0.22,
  },
  {
    id: "neptune",
    name: "Neptune",
    summary: "Windy ice giant with supersonic storms and deep blue color.",
    distance: "4.5 billion km",
    radius: "24,622 km",
    fact: "Fastest winds in the solar system, >1,900 km/h.",
    orbit: 48,
    size: 1.7,
    tint: "from-blue-300/80 to-indigo-500/60",
    color: "#38bdf8",
    speed: 0.18,
  },
];

const Index = () => {
  const [activeBody, setActiveBody] = useState<CelestialBody>(celestialBodies[2]);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const sceneBodies = useMemo(
    () =>
      celestialBodies.map((body) => ({
        id: body.id,
        color: body.color,
        orbitRadius: body.orbit * 1.25,
        size: body.size * 3.2,
        speed: body.speed,
      })),
    [],
  );

  const handleSelect = (id: string) => {
    const match = celestialBodies.find((body) => body.id === id);
    if (match) setActiveBody(match);
  };

  const handlePlanetCardClick = (body: CelestialBody) => {
    setActiveBody(body);
    if (descriptionRef.current) {
      descriptionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <PageLayout>
      <section className="relative w-full overflow-hidden rounded-2xl glass-panel border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background/40 to-background pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          <div className="h-[420px] md:h-[520px] lg:h-[560px]">
            <SolarSystemScene bodies={sceneBodies} activeId={activeBody.id} onSelect={handleSelect} />
          </div>
          <div className="p-6 md:p-8 flex flex-col gap-4 justify-center">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Live heliocentric view
              </p>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight text-glow-cyan">
                Explore, select, and drill into any world in real time.
              </h1>
              <p className="text-muted-foreground">
                Tap a planet in the 3D scene to pin its profile. Use quick routes to jump into live trackers,
                space weather, and mission timelines.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/tracker">
                  Launch ISS Tracker
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/missions">
                  Upcoming Missions
                  <Rocket className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="gap-2">
                <Link to="/ai">
                  Ask the AI Explainer
                  <Compass className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <Card ref={descriptionRef} className="glass-panel border border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Active body
                    </p>
                    <h2 className="text-2xl font-bold text-glow-cyan">{activeBody.name}</h2>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link to="/weather">
                      Space Weather
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{activeBody.summary}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="glass-panel p-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Distance from Sun
                    </p>
                    <p className="font-semibold">{activeBody.distance}</p>
                  </div>
                  <div className="glass-panel p-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Mean radius
                    </p>
                    <p className="font-semibold">{activeBody.radius}</p>
                  </div>
                </div>
                <div className="glass-panel p-3 border border-primary/30">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Quick fact
                  </p>
                  <p className="font-semibold">{activeBody.fact}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {celestialBodies.map((body) => (
          <Card
            key={body.id}
            className={`glass-panel border border-border/50 hover:border-primary/50 transition-all cursor-pointer ${
              activeBody.id === body.id ? "ring-1 ring-primary/70" : ""
            }`}
            onClick={() => handlePlanetCardClick(body)}
            onFocus={() => setActiveBody(body)}
            tabIndex={0}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${body.tint} border border-white/20`}
              />
              <div>
                <CardTitle className="text-base">{body.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{body.distance}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{body.summary}</p>
              <div className="flex items-center gap-2 text-xs text-primary">
                <Globe2 className="w-4 h-4" />
                Click in the 3D view to pin
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageLayout>
  );
};

export default Index;
