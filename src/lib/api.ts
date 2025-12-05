import * as satellite from "satellite.js";

const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY;

type FetchOptions = RequestInit & { timeoutMs?: number };

const DEFAULT_TIMEOUT = 8000;
const TLE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
// Fallback TLE (freshened, rev number aligned with ~2025 epoch)
const FALLBACK_TLE = `1 25544U 98067A   25064.50000000  .00016717  00000+0  30000-3 0  9991
2 25544  51.6410 120.0000 0004300 122.0000 312.0000 15.50000000155000`;

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

interface ISSTleResponse {
  tle?: string;
  requested_timestamp?: number;
}

let lastTleCache: { value: string; fetchedAt: number } | null = null;

function parseTleLines(tle: string): [string, string] | null {
  const lines = tle
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const [line1, line2] = lines.slice(-2);
  return [line1, line2];
}

async function fetchIssTle(timeoutMs = DEFAULT_TIMEOUT): Promise<string> {
  const url = "https://api.wheretheiss.at/v1/satellites/25544/tles";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // If a recent TLE is cached, prefer returning it when network fails
  const useCachedTleIfFresh = () => {
    if (lastTleCache && Date.now() - lastTleCache.fetchedAt < TLE_MAX_AGE_MS) {
      return lastTleCache.value;
    }
    return null;
  };

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`TLE request failed: ${res.status} ${res.statusText}`);
    const raw = await res.text();

    // Try JSON first (API may return object or array)
    let tleCandidate: string | undefined;
    try {
      const json = JSON.parse(raw) as ISSTleResponse | ISSTleResponse[];
      if (Array.isArray(json)) {
        tleCandidate = json.find((entry) => entry?.tle)?.tle;
      } else {
        tleCandidate = json.tle;
      }
    } catch {
      // not JSON; fall back to raw text parsing below
    }

    // If not found in JSON, attempt to pull the last two TLE lines from the body
    if (!tleCandidate) {
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const line1Index = lines.findIndex((l) => l.startsWith("1 "));
      if (line1Index >= 0 && lines[line1Index + 1]?.startsWith("2 ")) {
        tleCandidate = `${lines[line1Index]}\n${lines[line1Index + 1]}`;
      }
    }

    const tle = tleCandidate?.trim();
    if (!tle) {
      throw new Error("ISS TLE unavailable from wheretheiss.at");
    }
    lastTleCache = { value: tle, fetchedAt: Date.now() };
    return tle;
  } catch (err) {
    // Try a secondary text format endpoint
    try {
      const res = await fetch(`${url}?format=text`, { signal: controller.signal });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseTleLines(text);
        if (parsed) {
          const tle = `${parsed[0]}\n${parsed[1]}`;
          lastTleCache = { value: tle, fetchedAt: Date.now() };
          return tle;
        }
      }
    } catch {
      // ignore and fall through
    }

    const cached = useCachedTleIfFresh();
    if (cached) {
      return cached;
    }
    // As a final fallback, use a bundled TLE to avoid blocking UI
    lastTleCache = { value: FALLBACK_TLE, fetchedAt: 0 };
    return FALLBACK_TLE;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNextISSPass(
  lat: number,
  lon: number,
): Promise<ISSPass> {
  const tle = await fetchIssTle();
  const pass = computeNextPassFromTle(tle, lat, lon);
  if (pass) return pass;
  throw new Error(
    "Live orbit data is temporarily unavailable from wheretheiss.at. Please try again shortly.",
  );
}

function computeNextPassFromTle(tle: string, lat: number, lon: number): ISSPass | null {
  const lines = parseTleLines(tle);
  if (!lines) return null;

  const [line1, line2] = lines;
  const satrec = satellite.twoline2satrec(line1, line2);

  const start = new Date();
  const end = new Date(start.getTime() + 12 * 60 * 60 * 1000); // 12-hour window
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

export interface ISSOrbitalInfo {
  orbitNumber: number | null;
  inclinationDeg: number | null;
  periodMinutes: number | null;
  revsPerDay: number | null;
  updatedAt: number;
}

export async function fetchISSOrbitalInfo(): Promise<ISSOrbitalInfo> {
  const parseRev = (line2: string) => {
    const revRaw = line2.slice(63, 68).trim();
    const rev = parseInt(revRaw, 10);
    return Number.isFinite(rev) ? rev : null;
  };

  const ensureRevnum = (satrec: satellite.SatRec, line2: string) => {
    if (satrec.revnum == null) {
      const rev = parseRev(line2);
      if (rev !== null) satrec.revnum = rev;
    }
  };

  const buildFromTle = (tle: string) => {
    const lines = parseTleLines(tle);
    if (!lines) return null;
    const [line1, line2] = lines;
    const satrec = satellite.twoline2satrec(line1, line2);
    ensureRevnum(satrec, line2);
    return { satrec, line2 };
  };

  let satContext = buildFromTle(await fetchIssTle());
  if (!satContext) {
    satContext = buildFromTle(FALLBACK_TLE);
  }
  if (!satContext) {
    throw new Error("Unable to parse ISS TLE data.");
  }

  const { satrec, line2 } = satContext;

  const revsPerDay =
    satrec.no_kozai && satrec.no_kozai > 0
      ? (satrec.no_kozai * 1440) / (2 * Math.PI)
      : satrec.no && satrec.no > 0
        ? (satrec.no * 1440) / (2 * Math.PI)
        : null;

  const periodMinutes = revsPerDay ? 1440 / revsPerDay : null;
  const inclinationDeg = Number.isFinite(satrec.inclo)
    ? satellite.radiansToDegrees(satrec.inclo)
    : null;

  // Estimate rev count from launch date if the TLE rev is obviously stale
  const estimateRevFromLaunch = () => {
    const launch = Date.UTC(1998, 10, 20); // 1998-11-20
    const now = Date.now();
    const days = (now - launch) / (1000 * 60 * 60 * 24);
    const mm = revsPerDay ?? 15.54;
    return Math.floor(days * mm);
  };

  // Compute current orbit count from rev at epoch + elapsed revs
  const revAtEpoch = satrec.revnum ?? parseRev(line2);
  let currentOrbit: number | null = null;
  if (revAtEpoch !== null && revsPerDay) {
    const now = new Date();
    const jdNow = satellite.jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds() + now.getUTCMilliseconds() / 1000,
    );
    const deltaDays = jdNow - satrec.jdsatepoch;
    currentOrbit = Math.floor(revAtEpoch + deltaDays * revsPerDay);
  }
  if (currentOrbit !== null && currentOrbit < 90000) {
    currentOrbit = estimateRevFromLaunch();
  }

  return {
    orbitNumber: currentOrbit,
    inclinationDeg: inclinationDeg ?? null,
    periodMinutes: periodMinutes ?? null,
    revsPerDay: revsPerDay ?? null,
    updatedAt: Date.now(),
  };
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
  videoUrl?: string;
  description?: string;
  imageUrl?: string;
}

interface LaunchLibraryResponse {
  results: Array<{
    id: string;
    name: string;
    net: string;
    status?: { name?: string; abbrev?: string };
    rocket?: { configuration?: { name?: string; family?: string; variant?: string } };
    launch_service_provider?: { name?: string; type?: string };
    mission?: { name?: string; description?: string; type?: string };
    pad?: { name?: string; location?: { name?: string; country_code?: string } };
    infoURLs?: string[];
    vidURLs?: string[];
    image?: string;
    program?: Array<{ name?: string; description?: string }>;
  }>;
}

function mapLaunchData(launch: LaunchLibraryResponse["results"][0]): Launch {
  return {
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
    infoUrl: launch.infoURLs?.[0],
    videoUrl: launch.vidURLs?.[0],
    description: launch.mission?.description,
    imageUrl: launch.image,
  };
}

export async function fetchUpcomingLaunches(limit = 4): Promise<Launch[]> {
  const data = await fetchJson<LaunchLibraryResponse>(
    `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=${limit}&hide_recent_previous=true&ordering=net`,
    { timeoutMs: 12000 },
  );

  return data.results.map(mapLaunchData);
}

export async function fetchRecentLaunches(limit = 4): Promise<Launch[]> {
  const data = await fetchJson<LaunchLibraryResponse>(
    `https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=${limit}&ordering=-net`,
    { timeoutMs: 12000 },
  );

  return data.results.map(mapLaunchData);
}

export async function fetchLaunchDetails(id: string): Promise<Launch | null> {
  try {
    const data = await fetchJson<LaunchLibraryResponse["results"][0]>(
      `https://ll.thespacedevs.com/2.2.0/launch/${id}/`,
      { timeoutMs: 12000 },
    );
    return mapLaunchData(data);
  } catch {
    return null;
  }
}

export interface SpaceWeather {
  kpIndex: number;
  kpHistory: number[];
  solarWindSpeed: number;
  solarWindHistory: number[];
}

type KpRow = Array<string | number>;

export async function fetchSpaceWeather(): Promise<SpaceWeather> {
  // NASA DONKI notifications are used as a live feed; we extract simple
  // indicators from the most recent alerts (Kp mentions and solar-wind speeds).
  const apiKey = NASA_API_KEY ?? "DEMO_KEY";
  const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);

  type DonkiNotification = {
    messageType?: string;
    messageIssueTime?: string;
    messageBody?: string;
  };

  const notifications = await fetchJson<DonkiNotification[]>(
    `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=${apiKey}`,
    { timeoutMs: 12000 },
  );

  const kpValues: number[] = [];
  const windValues: number[] = [];

  for (const note of notifications || []) {
    const body = note.messageBody ?? "";
    const kpMatch = body.match(/Kp\s*=?\s*(\d(?:\.\d)?)/i);
    if (kpMatch) kpValues.push(Number(kpMatch[1]));
    const speedMatch = body.match(/(\d{3,4})\s*km\/s/i);
    if (speedMatch) windValues.push(Number(speedMatch[1]));
  }

  const kpIndex = kpValues.length ? kpValues[kpValues.length - 1] : 0;
  const kpHistory = kpValues.slice(-12);
  const solarWindSpeed = windValues.length ? windValues[windValues.length - 1] : 0;
  const solarWindHistory = windValues.slice(-12);

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

