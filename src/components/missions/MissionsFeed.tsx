import { Rocket, Calendar, MapPin, ExternalLink, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingLaunches, fetchRecentLaunches, fetchLaunchDetails, type Launch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    case "success":
      return "bg-status-success/20 text-status-success border-status-success/30";
    case "failure":
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

const MissionCard = ({ mission, onDetailsClick }: { mission: Launch; onDetailsClick: (id: string) => void }) => {
  const isPast = mission.launchDate.getTime() < Date.now();

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

      <div className="flex items-center justify-between">
        {!isPast && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
              T-Minus
            </span>
            <Countdown targetDate={mission.launchDate} />
          </div>
        )}
        {isPast && (
          <div className="text-xs text-muted-foreground">
            Launched {mission.launchDate.toLocaleDateString()}
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 ml-auto"
          onClick={() => onDetailsClick(mission.id)}
        >
          Details <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const MissionDetailsDialog = ({ missionId, open, onOpenChange }: { missionId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: mission, isLoading } = useQuery({
    queryKey: ["launch-details", missionId],
    queryFn: () => missionId ? fetchLaunchDetails(missionId) : null,
    enabled: !!missionId && open,
  });

  if (!missionId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            {isLoading ? "Loading..." : mission?.name || "Mission Details"}
          </DialogTitle>
          <DialogDescription>
            Complete mission information from Launch Library API
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading mission details...</div>
        ) : mission ? (
          <div className="space-y-4 mt-4">
            {mission.imageUrl && (
              <img 
                src={mission.imageUrl} 
                alt={mission.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Provider</span>
                <p className="text-sm font-semibold mt-1">{mission.provider}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                <p className="text-sm font-semibold mt-1 capitalize">{mission.status}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Rocket</span>
                <p className="text-sm font-semibold mt-1">{mission.rocket}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Launch Site</span>
                <p className="text-sm font-semibold mt-1">{mission.launchSite}</p>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Launch Date</span>
              <p className="text-sm font-semibold mt-1">
                {mission.launchDate.toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {mission.missionName && (
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Mission Name</span>
                <p className="text-sm font-semibold mt-1">{mission.missionName}</p>
              </div>
            )}

            {mission.description && (
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Description</span>
                <p className="text-sm mt-1">{mission.description}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {mission.infoUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={mission.infoUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <Info className="w-4 h-4" />
                    More Info
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {mission.videoUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={mission.videoUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                    Watch Video
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Failed to load mission details</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const MissionsFeed = () => {
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: upcomingData, isLoading: upcomingLoading, isError: upcomingError } = useQuery({
    queryKey: ["upcoming-missions"],
    queryFn: () => fetchUpcomingLaunches(4),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: recentData, isLoading: recentLoading, isError: recentError } = useQuery({
    queryKey: ["recent-missions"],
    queryFn: () => fetchRecentLaunches(4),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const upcomingMissions = useMemo<Launch[]>(() => {
    if (!upcomingError && upcomingData && upcomingData.length) return upcomingData;
    return [];
  }, [upcomingData, upcomingError]);

  const recentMissions = useMemo<Launch[]>(() => {
    if (!recentError && recentData && recentData.length) return recentData;
    return [];
  }, [recentData, recentError]);

  const handleDetailsClick = (id: string) => {
    setSelectedMissionId(id);
    setDetailsOpen(true);
  };

  return (
    <>
      <section className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide">
                MISSIONS
              </h2>
              <p className="text-xs text-muted-foreground">
                Upcoming & Recent Launches
              </p>
            </div>
          </div>
        </div>

        {upcomingMissions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Upcoming Missions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingMissions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} onDetailsClick={handleDetailsClick} />
              ))}
            </div>
          </div>
        )}

        {recentMissions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Recent Missions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {recentMissions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} onDetailsClick={handleDetailsClick} />
              ))}
            </div>
          </div>
        )}

        {(upcomingLoading || recentLoading) && (
          <div className="text-center py-8 text-muted-foreground">Loading missions...</div>
        )}

        {!upcomingLoading && !recentLoading && upcomingMissions.length === 0 && recentMissions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No missions available</div>
        )}
      </section>

      <MissionDetailsDialog 
        missionId={selectedMissionId} 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
      />
    </>
  );
};
