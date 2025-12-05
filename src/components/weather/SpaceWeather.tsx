import { Activity, Sun, Wind, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchSpaceWeather } from "@/lib/api";

interface WeatherMetric {
  label: string;
  value: string | number;
  unit: string;
  status: "normal" | "elevated" | "high" | "extreme";
  icon: typeof Activity;
  trend?: "up" | "down" | "stable";
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "normal":
      return "text-status-success";
    case "elevated":
      return "text-status-warning";
    case "high":
      return "text-alert-orange";
    case "extreme":
      return "text-alert-magenta";
    default:
      return "text-muted-foreground";
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case "normal":
      return "bg-status-success/20 border-status-success/30";
    case "elevated":
      return "bg-status-warning/20 border-status-warning/30";
    case "high":
      return "bg-alert-orange/20 border-alert-orange/30";
    case "extreme":
      return "bg-alert-magenta/20 border-alert-magenta/30";
    default:
      return "bg-muted/20 border-muted/30";
  }
};

const GaugeChart = ({ value, max, status }: { value: number; max: number; status: string }) => {
  const percentage = (value / max) * 100;
  const statusColor = getStatusColor(status);

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.51} 251`}
          className={`${statusColor} transition-all duration-1000`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-display text-lg font-bold ${statusColor}`}>
          {value}
        </span>
      </div>
    </div>
  );
};

const SparkLine = ({ data, status }: { data: number[]; status: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="w-full h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={getStatusColor(status)}
      />
    </svg>
  );
};

const defaultMetrics: WeatherMetric[] = [
  {
    label: "KP Index",
    value: 3,
    unit: "",
    status: "normal",
    icon: Activity,
    trend: "stable",
  },
  {
    label: "Solar Wind",
    value: 412,
    unit: "km/s",
    status: "elevated",
    icon: Wind,
    trend: "up",
  },
  {
    label: "Solar Flare",
    value: "C2.1",
    unit: "class",
    status: "normal",
    icon: Sun,
    trend: "stable",
  },
  {
    label: "Radiation",
    value: 0.8,
    unit: "pfu",
    status: "normal",
    icon: Zap,
    trend: "down",
  },
];

const defaultHistoricalData = {
  kp: [2, 2, 3, 3, 2, 3, 4, 3, 3, 2, 3, 3],
  wind: [380, 395, 410, 420, 415, 425, 430, 412, 408, 415, 420, 412],
};

const getKpStatus = (value: number): WeatherMetric["status"] => {
  if (value >= 8) return "extreme";
  if (value >= 6) return "high";
  if (value >= 4) return "elevated";
  return "normal";
};

const getSolarWindStatus = (value: number): WeatherMetric["status"] => {
  if (value >= 600) return "extreme";
  if (value >= 500) return "high";
  if (value >= 400) return "elevated";
  return "normal";
};

export const SpaceWeather = () => {
  const { data } = useQuery({
    queryKey: ["space-weather"],
    queryFn: fetchSpaceWeather,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const metrics = useMemo<WeatherMetric[]>(() => {
    const kp = data?.kpIndex ?? (defaultMetrics[0].value as number);
    const solarWind = data?.solarWindSpeed ?? (defaultMetrics[1].value as number);

    return [
      {
        ...defaultMetrics[0],
        value: kp.toFixed(1),
        status: getKpStatus(kp),
      },
      {
        ...defaultMetrics[1],
        value: Math.round(solarWind),
        status: getSolarWindStatus(solarWind),
        trend:
          data?.solarWindHistory && data.solarWindHistory.length > 1
            ? data.solarWindHistory[data.solarWindHistory.length - 1] >
              data.solarWindHistory[0]
              ? "up"
              : "down"
            : defaultMetrics[1].trend,
      },
      defaultMetrics[2], // flare placeholder (NASA/NOAA flare class not yet wired)
      defaultMetrics[3],
    ];
  }, [data]);

  const historicalData = useMemo(
    () => ({
      kp: data?.kpHistory?.length ? data.kpHistory : defaultHistoricalData.kp,
      wind:
        data?.solarWindHistory?.length
          ? data.solarWindHistory
          : defaultHistoricalData.wind,
    }),
    [data],
  );

  const kpValueNumber = Number(metrics[0].value);
  const kpAverage =
    historicalData.kp.length > 0
      ? (historicalData.kp.reduce((a, b) => a + b, 0) / historicalData.kp.length).toFixed(1)
      : "–";
  const windAverage =
    historicalData.wind.length > 0
      ? Math.round(
          historicalData.wind.reduce((a, b) => a + b, 0) / historicalData.wind.length,
        )
      : "–";

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-alert-orange/20 flex items-center justify-center">
            <Sun className="w-5 h-5 text-alert-orange" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide">
              SPACE WEATHER
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time Solar & Geomagnetic Activity
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-success/10 border border-status-success/30">
          <span className="text-xs font-medium text-status-success uppercase tracking-wide">
            Conditions Stable
          </span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`glass-panel p-4 border ${getStatusBg(metric.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <metric.icon className={`w-4 h-4 ${getStatusColor(metric.status)}`} />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </span>
              </div>
              {metric.trend && (
                <TrendingUp
                  className={`w-3 h-3 ${
                    metric.trend === "up"
                      ? "text-alert-orange"
                      : metric.trend === "down"
                      ? "text-status-success rotate-180"
                      : "text-muted-foreground rotate-90"
                  }`}
                />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-display text-2xl font-bold ${getStatusColor(
                  metric.status
                )}`}
              >
                {metric.value}
              </span>
              <span className="text-xs text-muted-foreground">{metric.unit}</span>
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wide">
              <span className={getStatusColor(metric.status)}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* KP Index Detail */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
            KP Index Gauge
          </h3>
          <div className="flex items-center gap-6">
            <GaugeChart value={kpValueNumber} max={9} status={metrics[0].status} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">0-3</span>
                <span className="text-status-success">Quiet</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">4-5</span>
                <span className="text-status-warning">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">6-7</span>
                <span className="text-alert-orange">Storm</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">8-9</span>
                <span className="text-alert-magenta">Severe</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
            24-Hour Trend
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">KP Index</span>
                <span className="text-status-success">Avg: {kpAverage}</span>
              </div>
              <SparkLine data={historicalData.kp} status="normal" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Solar Wind</span>
                <span className="text-status-warning">Avg: {windAverage} km/s</span>
              </div>
              <SparkLine data={historicalData.wind} status="elevated" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="mt-4 p-3 rounded-lg bg-status-warning/10 border border-status-warning/30 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-status-warning font-medium">
            Minor G1 Geomagnetic Storm Watch
          </p>
          <p className="text-xs text-muted-foreground">
            Possible aurora viewing at high latitudes over the next 24 hours
          </p>
        </div>
      </div>
    </section>
  );
};
