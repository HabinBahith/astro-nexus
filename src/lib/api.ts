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
  // open-notify ISS pass predictions (returns up to n passes, we use the first)
  const data = await fetchJson<{ response: ISSPass[] }>(
    `https://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=1`,
    { timeoutMs: 8000 },
  );

  if (!data.response?.length) {
    throw new Error("No pass data returned");
  }

  return data.response[0];
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

