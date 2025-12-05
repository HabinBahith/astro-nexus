import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Satellite, MapPin, Clock, ArrowUp, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchISSPosition, fetchNextISSPass, type ISSPass } from "@/lib/api";

interface ISSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

export const ISSTracker = () => {
  const [position, setPosition] = useState<ISSPosition>({
    latitude: 51.5074,
    longitude: -0.1278,
    altitude: 420,
    velocity: 27600,
    timestamp: Date.now(),
  });
  const [isLive, setIsLive] = useState(true);
  const [pass, setPass] = useState<ISSPass | null>(null);
  const [passStatus, setPassStatus] = useState<"idle" | "locating" | "loading" | "error">(
    "idle",
  );
  const [passError, setPassError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    data: livePosition,
    isError: isIssError,
  } = useQuery({
    queryKey: ["iss-position"],
    queryFn: fetchISSPosition,
    refetchInterval: 2000,
    staleTime: 1500,
    retry: 1,
  });

  useEffect(() => {
    if (livePosition) {
      setPosition(livePosition);
      setIsLive(true);
    } else if (isIssError) {
      setIsLive(false);
    }
  }, [livePosition, isIssError]);

  const requestNextPass = () => {
    if (!navigator.geolocation) {
      setPassError("Geolocation not supported in this browser.");
      setPassStatus("error");
      return;
    }

    setPassStatus("locating");
    setPassError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setPassStatus("loading");
          const next = await fetchNextISSPass(pos.coords.latitude, pos.coords.longitude);
          setPass(next);
          setPassStatus("idle");
        } catch (err) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Could not fetch next pass for your location.";
          setPassError(message);
          setPassStatus("error");
        }
      },
      () => {
        setPassError("Location permission denied.");
        setPassStatus("error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const nextPassCountdown = useMemo(() => {
    if (!pass) return null;
    const ms = pass.risetime * 1000 - Date.now();
    if (ms <= 0) return "Passing now";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")} until visible`;
  }, [pass]);

  // Draw Earth visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw glow effect
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.8,
      centerX,
      centerY,
      radius * 1.3
    );
    gradient.addColorStop(0, "rgba(0, 229, 255, 0.1)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw Earth
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    const earthGradient = ctx.createRadialGradient(
      centerX - radius * 0.3,
      centerY - radius * 0.3,
      0,
      centerX,
      centerY,
      radius
    );
    earthGradient.addColorStop(0, "#1a3a5c");
    earthGradient.addColorStop(0.5, "#0d2137");
    earthGradient.addColorStop(1, "#051525");
    ctx.fillStyle = earthGradient;
    ctx.fill();

    // Draw grid lines
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
    ctx.lineWidth = 0.5;

    // Latitude lines
    for (let i = -60; i <= 60; i += 30) {
      const y = centerY - (i / 90) * radius;
      const halfWidth = Math.sqrt(radius * radius - Math.pow(y - centerY, 2));
      ctx.beginPath();
      ctx.moveTo(centerX - halfWidth, y);
      ctx.lineTo(centerX + halfWidth, y);
      ctx.stroke();
    }

    // Longitude lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        radius * Math.abs(Math.cos(angle)),
        radius,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Draw orbit path
    ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius * 1.15, radius * 0.4, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate ISS position on screen
    const issX =
      centerX +
      (position.longitude / 180) * radius * Math.cos(position.latitude * (Math.PI / 180));
    const issY = centerY - (position.latitude / 90) * radius * 0.8;

    // Draw ISS marker with glow
    const issGlow = ctx.createRadialGradient(issX, issY, 0, issX, issY, 20);
    issGlow.addColorStop(0, "rgba(0, 229, 255, 0.8)");
    issGlow.addColorStop(0.5, "rgba(0, 229, 255, 0.3)");
    issGlow.addColorStop(1, "transparent");
    ctx.fillStyle = issGlow;
    ctx.fillRect(issX - 20, issY - 20, 40, 40);

    // ISS icon
    ctx.fillStyle = "#00E5FF";
    ctx.beginPath();
    ctx.arc(issX, issY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Pulse ring
    const pulseRadius = 10 + Math.sin(Date.now() / 200) * 5;
    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(issX, issY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }, [position]);

  const formatCoordinate = (value: number, isLat: boolean) => {
    const direction = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    // Show signed value and direction for clarity
    return `${value.toFixed(4)}° (${direction})`;
  };

  return (
    <section className="glass-panel p-6 border-glow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Satellite className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide">
              ISS LIVE TRACKER
            </h2>
            <p className="text-xs text-muted-foreground">
              International Space Station Position
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-status-success status-pulse" : "bg-muted"
            }`}
          />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {isLive ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Globe Visualization */}
        <div className="relative aspect-square bg-space-deep rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full"
          />
          <div className="absolute bottom-3 left-3 right-3 flex justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Orbital View
            </span>
            <span className="text-[10px] text-primary font-mono">
              {new Date(position.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Data Readouts */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Latitude */}
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Latitude
                </span>
              </div>
              <p className="data-readout text-xl">
                {formatCoordinate(position.latitude, true)}
              </p>
            </div>

            {/* Longitude */}
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Longitude
                </span>
              </div>
              <p className="data-readout text-xl">
                {formatCoordinate(position.longitude, false)}
              </p>
            </div>

            {/* Altitude */}
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Altitude
                </span>
              </div>
              <p className="data-readout text-xl">
                {position.altitude.toFixed(1)} <span className="text-sm">km</span>
              </p>
            </div>

            {/* Velocity */}
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Velocity
                </span>
              </div>
              <p className="data-readout text-xl">
                {position.velocity.toFixed(0)}{" "}
                <span className="text-sm">km/h</span>
              </p>
            </div>
          </div>

          {/* Next Pass Info */}
          <div className="glass-panel p-4 border-primary/30">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-status-warning" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Next Visible Pass
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-status-warning hover:text-status-warning"
                onClick={requestNextPass}
                disabled={passStatus === "locating" || passStatus === "loading"}
              >
                {passStatus === "locating"
                  ? "Locating..."
                  : passStatus === "loading"
                  ? "Fetching..."
                  : "Use My Location"}
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-2xl text-status-warning">
                {nextPassCountdown ?? "--:--:--"}
              </p>
              {pass && (
                <span className="text-xs text-muted-foreground">
                  for {Math.round(pass.duration / 60)} min
                </span>
              )}
            </div>
            {passError ? (
              <p className="text-xs text-alert-orange mt-2">{passError}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Uses your location to calculate the next visible ISS pass.
              </p>
            )}
          </div>

          {/* Orbit Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Orbit #{" "}
              <span className="text-primary font-mono">147,892</span> • Inclination:{" "}
              <span className="text-primary font-mono">51.6°</span>
            </p>
            <p>
              Period:{" "}
              <span className="text-primary font-mono">92.68 min</span> • Revolutions/day:{" "}
              <span className="text-primary font-mono">15.54</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
