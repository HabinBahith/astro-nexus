import { Activity, Clock, Globe, Signal, Database } from "lucide-react";
import { useEffect, useState } from "react";

export const StatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dataPoints, setDataPoints] = useState(147892);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setDataPoints((prev) => prev + Math.floor(Math.random() * 10));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel px-4 py-2 flex items-center justify-between flex-wrap gap-4 text-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">UTC:</span>
          <span className="font-mono text-foreground">
            {currentTime.toISOString().slice(11, 19)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Local:</span>
          <span className="font-mono text-foreground">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-status-success" />
          <span className="text-muted-foreground">Data Points:</span>
          <span className="font-mono text-status-success">
            {dataPoints.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-4 h-4 text-status-success" />
          <span className="text-muted-foreground">Latency:</span>
          <span className="font-mono text-status-success">42ms</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-status-success status-pulse" />
          <span className="text-status-success uppercase tracking-wide">
            All Systems Nominal
          </span>
        </div>
      </div>
    </div>
  );
};
