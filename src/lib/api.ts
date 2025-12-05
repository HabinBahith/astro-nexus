import * as satellite from "satellite.js";

const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY;

type FetchOptions = RequestInit & { timeoutMs?: number };

const DEFAULT_TIMEOUT = 8000;

async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export interface ISSPositionResponse {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

export async function fetchISSPosition(): Promise<ISSPositionResponse> {
  // wheretheiss.at provides live ISS telemetry over HTTPS without auth
  const data = await fetchJson<ISSPositionResponse>(
    "https://api.wheretheiss.at/v1/satellites/25544",
  );

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    // API already returns km/h; keep as-is
    velocity: data.velocity,
    timestamp: Date.now(),
  };
}

export interface ISSPass {
  risetime: number; // epoch seconds
  duration: number; // seconds
}

export async function fetchNextISSPass(
  lat: number,
  lon: number,
): Promise<ISSPass> {
  const openNotifyUrl = `https://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=1`;
  const satellitesApi = `https://satellites.fly.dev/passes/25544?lat=${lat}&lon=${lon}&alt=0&limit=1`;
  const tleUrl = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

  // Try multiple sources in parallel, take the first to succeed
  const attempts: Array<{ url: string; timeoutMs: number; kind: "open" | "proxy" | "sat" | "tle" }> = [
    { url: openNotifyUrl, timeoutMs: 6000, kind: "open" },
    {
      // allorigins proxy (CORS friendly)
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(
        openNotifyUrl.replace("https://", "http://"),
      )}`,
      timeoutMs: 8000,
      kind: "proxy",
    },
    {
      // secondary proxy
      url: `https://cors.isomorphic-git.org/http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=1`,
      timeoutMs: 8000,
      kind: "proxy",
    },
    {
      // satellites.fly.dev (open-source TLE propagation API)
      url: satellitesApi,
      timeoutMs: 9000,
      kind: "sat",
    },
    {
      // compute locally using latest TLE (satellite.js)
      url: tleUrl,
      timeoutMs: 7000,
      kind: "tle",
    },
  ];

  const tasks = attempts.map((attempt) =>
    (async () => {
      if (attempt.kind === "tle") {
        const tleText = await fetchTle(attempt.url, attempt.timeoutMs);
        const pass = computeNextPassFromTle(tleText, lat, lon);
        if (pass) return pass;
        throw new Error("No pass data returned");
      }

      if (attempt.kind === "sat") {
        const data = await fetchJson<{ passes: Array<{ aos: string; tca: string; los: string }> }>(
          attempt.url,
          { timeoutMs: attempt.timeoutMs },
        );
        if (data.passes?.length) {
          const first = data.passes[0];
          const risetime = Date.parse(first.aos);
          const los = Date.parse(first.los);
          const duration = Math.max(0, Math.round((los - risetime) / 1000));
          return { risetime: Math.floor(risetime / 1000), duration };
        }
        throw new Error("No pass data returned");
      }

      const data = await fetchJson<{ response: ISSPass[] }>(attempt.url, {
        timeoutMs: attempt.timeoutMs,
      });
      if (data.response?.length) {
        return data.response[0];
      }
      throw new Error("No pass data returned");
    })(),
  );

  const settled = await Promise.allSettled(tasks);
  const success = settled.find(
    (result): result is PromiseFulfilledResult<ISSPass> => result.status === "fulfilled",
  );

  if (success) {
    return success.value;
  }

  const firstError = settled.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  throw firstError?.reason instanceof Error
    ? firstError.reason
    : new Error("Could not fetch next pass for your location.");
}

async function fetchTle(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`TLE request failed: ${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("TLE request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function computeNextPassFromTle(tle: string, lat: number, lon: number): ISSPass | null {
  const lines = tle
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const [line1, line2] = lines.slice(-2);
  const satrec = satellite.twoline2satrec(line1, line2);

  const start = new Date();
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000); // 6 hours window
  const stepMs = 10_000; // 10-second steps
  const observerGd = {
    latitude: satellite.degreesToRadians(lat),
    longitude: satellite.degreesToRadians(lon),
    height: 0, // km
  };

  let inPass = false;
  let aos: Date | null = null;
  let los: Date | null = null;

  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    const time = new Date(t);
    const pv = satellite.propagate(satrec, time);
    if (!pv.position) continue;
    const gmst = satellite.gstime(time);
    const positionEcf = satellite.eciToEcf(pv.position, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
    const elev = lookAngles.elevation;

    if (elev > 0 && !inPass) {
      inPass = true;
      aos = time;
    }

    if (elev <= 0 && inPass) {
      los = time;
      break;
    }
  }

  if (aos && los) {
    const risetime = Math.floor(aos.getTime() / 1000);
    const duration = Math.max(0, Math.round((los.getTime() - aos.getTime()) / 1000));
    return { risetime, duration };
  }

  return null;
}

export interface Launch {
  id: string;
  name: string;
  provider: string;
  rocket: string;
  launchSite: string;
  launchDate: Date;
  status: string;
  payload?: string;
  missionName?: string;
  infoUrl?: string;
}

interface LaunchLibraryResponse {
  results: Array<{
    id: string;
    name: string;
    net: string;
    status?: { name?: string };
    rocket?: { configuration?: { name?: string } };
    launch_service_provider?: { name?: string };
    mission?: { name?: string; description?: string };
    pad?: { name?: string; location?: { name?: string } };
    infoURLs?: string[];
    vidURLs?: string[];
  }>;
}

export async function fetchUpcomingLaunches(limit = 4): Promise<Launch[]> {
  const data = await fetchJson<LaunchLibraryResponse>(
    `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=${limit}&hide_recent_previous=true&ordering=net`,
    { timeoutMs: 12000 },
  );

  return data.results.map((launch) => ({
    id: launch.id,
    name: launch.name,
    provider: launch.launch_service_provider?.name ?? "Unknown provider",
    rocket: launch.rocket?.configuration?.name ?? "Unknown vehicle",
    launchSite:
      launch.pad?.name ??
      launch.pad?.location?.name ??
      "Launch site TBA",
    launchDate: new Date(launch.net),
    status: launch.status?.name?.toLowerCase() ?? "tbd",
    payload: launch.mission?.description ?? "Payload details not provided",
    missionName: launch.mission?.name,
    infoUrl: launch.infoURLs?.[0] ?? launch.vidURLs?.[0],
  }));
}

export interface SpaceWeather {
  kpIndex: number;
  kpHistory: number[];
  solarWindSpeed: number;
  solarWindHistory: number[];
}

type KpRow = Array<string | number>;

export async function fetchSpaceWeather(): Promise<SpaceWeather> {
  // KP index (1-minute) & solar wind (DSCOVR) from NOAA SWPC
  const [kpRows, solarWindRows] = await Promise.all([
    fetchJson<KpRow[]>(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-1-minute.json",
    ),
    fetchJson<string[][]>(
      "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json",
    ),
  ]);

  const kpData = kpRows.slice(1); // drop header
  const lastKpRow = kpData[kpData.length - 1] ?? [];
  const kpValueRaw = Number(
    lastKpRow[1] ?? lastKpRow[lastKpRow.length - 1] ?? 0,
  );
  const kpIndex = Number.isFinite(kpValueRaw) ? kpValueRaw : 0;

  const kpHistory = kpData
    .slice(-12)
    .map((row) => Number(row[1]))
    .filter((v) => Number.isFinite(v) && v >= 0);

  // solar wind speed is column 2 (index 2) in plasma-1-day dataset
  const solarWindData = solarWindRows.slice(1); // drop header
  const lastPlasmaRow = solarWindData[solarWindData.length - 1] ?? [];
  const speedRaw = Number(lastPlasmaRow[2] ?? lastPlasmaRow[1]);
  const solarWindSpeed = Number.isFinite(speedRaw) ? speedRaw : 0;

  const solarWindHistory = solarWindData
    .slice(-12)
    .map((row) => Number(row[2]))
    .filter((v) => Number.isFinite(v) && v > 0);

  return {
    kpIndex,
    kpHistory,
    solarWindSpeed,
    solarWindHistory,
  };
}

export function getNasaApiKey(): string | undefined {
  return NASA_API_KEY;
}

