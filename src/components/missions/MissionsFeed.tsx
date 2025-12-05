import { Rocket, Calendar, MapPin, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingLaunches, type Launch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

const mockMissions: Launch[] = [
  {
    id: "1",
    name: "Starlink Group 6-32",
    provider: "SpaceX",
    rocket: "Falcon 9 Block 5",
    launchSite: "Cape Canaveral SLC-40",
    launchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "go",
    payload: "23 Starlink v2 Mini satellites",
  },
  {
    id: "2",
    name: "ISRO PSLV-C58",
    provider: "ISRO",
    rocket: "PSLV-XL",
    launchSite: "Satish Dhawan Space Centre",
    launchDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "upcoming",
    payload: "XPoSat X-ray Polarimeter Satellite",
  },
  {
    id: "3",
    name: "Artemis II",
    provider: "NASA",
    rocket: "SLS Block 1",
    launchSite: "Kennedy Space Center LC-39B",
    launchDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    status: "upcoming",
    payload: "Crewed lunar flyby mission",
  },
  {
    id: "4",
    name: "New Glenn Maiden Flight",
    provider: "Blue Origin",
    rocket: "New Glenn",
    launchSite: "Cape Canaveral LC-36",
    launchDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    status: "tbd",
    payload: "Test payload",
  },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case "go":
      return "bg-status-success/20 text-status-success border-status-success/30";
    case "upcoming":
      return "bg-primary/20 text-primary border-primary/30";
    case "tbd":
      return "bg-status-warning/20 text-status-warning border-status-warning/30";
    case "hold":
      return "bg-alert-orange/20 text-alert-orange border-alert-orange/30";
    default:
      return "bg-muted/20 text-muted-foreground border-muted/30";
  }
};

const Countdown = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-2">
      {[
        { value: timeLeft.days, label: "D" },
        { value: timeLeft.hours, label: "H" },
        { value: timeLeft.minutes, label: "M" },
        { value: timeLeft.seconds, label: "S" },
      ].map((item, i) => (
        <div key={i} className="countdown-segment">
          <span className="font-display text-lg font-bold text-primary">
            {String(item.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const MissionCard = ({ mission }: { mission: Launch }) => {
  return (
    <div className="mission-card glass-panel p-4 border border-border/50 hover:border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold tracking-wide">
              {mission.name}
            </h3>
            <p className="text-sm text-muted-foreground">{mission.provider}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wide border ${getStatusStyle(
            mission.status
          )}`}
        >
          {mission.status}
        </span>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Rocket className="w-4 h-4" />
          <span>{mission.rocket}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{mission.launchSite}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {mission.launchDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        <span className="text-primary">Payload:</span> {mission.payload}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
            T-Minus
          </span>
          <Countdown targetDate={mission.launchDate} />
        </div>
        <Button variant="ghost" size="sm" className="gap-1">
          Details <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const MissionsFeed = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["missions"],
    queryFn: () => fetchUpcomingLaunches(4),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const missions = useMemo<Launch[]>(() => {
    if (!isError && data && data.length) return data;
    return mockMissions;
  }, [data, isError]);

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide">
              UPCOMING MISSIONS
            </h2>
            <p className="text-xs text-muted-foreground">
              Global Space Launch Schedule
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          View All <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </section>
  );
};
