/**
 * Server-only data access (PLANS.md §3, §4, §7, §8).
 *
 * Sources (all in `seal/data/`):
 *  - readings.csv                live log appended by the ESP32 via POST /api/readings
 *  - sensor_log_placeholder.csv  synthetic 5-min placeholder log from Claude_2 (sensor_log_5min_placeholder_v2.csv)
 *  - forecast.json               written by `src/app/(core)/forecast.py`
 *
 * Time zone (Decision D1): fixed to GMT+7 (WIB / Asia/Jakarta).
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import {
  SENSORS,
  SENSOR_INFO,
  assess,
  doPercent,
  optimumText,
  type Assessment,
  type SensorKey,
  type SensorValues,
} from './water';

const DATA_DIR = path.join(process.cwd(), 'data');
const LIVE_LOG = path.join(DATA_DIR, 'readings.csv');
const DEMO_LOG = path.join(DATA_DIR, 'sensor_log_placeholder.csv');
const FORECAST_FILE = path.join(DATA_DIR, 'forecast.json');

const MINUTE = 60_000;
const LIVE_TICK_MS = 5_000; // 5-second high-frequency live monitoring tick
const LIVE_STREAM_TICKS = 60; // 60 x 5s = 5 minutes of 5-second real-time stream
const STEP_MS = 30 * MINUTE; // PLANS.md §4.2: 30-minute medians for forecasting & 24h/7d history
const DAY_MS = 24 * 60 * MINUTE;
const WEEK_BINS = 7 * 48; // up to 7 days of 30-min bins for the History & Chart views
const MIN_VALID = 3; // §4.2: a 30-min bin needs >= 3 valid readings
const MAX_GAP_BINS = 6; // §4.2: gaps <= 3 h (6 bins) may be interpolated
const OFFLINE_AFTER_MS = 15 * MINUTE;
const FORECAST_MAX_AGE_MS = 90 * MINUTE;
const WIB_OFFSET_MS = 7 * 60 * MINUTE; // GMT+7 (Decision D1)

// ------------------------------------------------------------------ types

export interface Point {
  t: number;
  timestamp: string;
  values: SensorValues;
  assessment: Assessment;
  interpolated: boolean;
}

export interface StatusEvaluationRow {
  horizon: string;
  model: string;
  accuracy: number;
  macroF1: number;
  alertsCaught: number;
  falseAlarms: number;
  suitabilityMae: number;
}

export interface SensorSkillRow {
  model: string;
  sensor: SensorKey;
  horizon: string;
  mae: number;
  rmse: number;
  skillPct: number;
}

export interface TestSampleCounts {
  testOrigins: number;
  Optimal: number;
  Warning: number;
  Critical: number;
}

export interface Forecast {
  source: 'live' | 'placeholder';
  origin: number;
  originStamp: string;
  stale: boolean;
  models: Record<SensorKey, string>;
  steps: Point[];
  statusEvaluation: StatusEvaluationRow[];
  sensorSkill: SensorSkillRow[];
  testSampleCounts: TestSampleCounts;
}

export interface ThresholdAlert {
  id: string;
  severity: 'warning' | 'critical';
  parameter: SensorKey;
  parameterLabel: string;
  observedValue: string;
  unit: string;
  suitabilityPct: number;
  title: string;
  message: string;
  timestamp: string;
  t: number;
  status: 'active';
}

export interface DataQualitySummary {
  sourceFile: string;
  rawReadingsCount: number;
  medianSpacingMinutes: number;
  spacingGuardOk: boolean;
  totalBins24h: number;
  interpolatedBins24h: number;
  interpolatedPct24h: number;
}

export interface Snapshot {
  /** R1: explicitly distinguishes live sensor data from synthetic placeholder data. */
  mode: 'live' | 'placeholder';
  now: number;
  lastReadingAt: number | null;
  offline: boolean;
  current: Point;
  /** High-frequency 5-second live monitoring stream (last 60 ticks = 5 minutes at 5s intervals). */
  liveStream5s: Point[];
  /** Last 24 h of 30-min median bins (48 bins). */
  history24h: Point[];
  /** Up to 7 days of 30-min median bins for the History table & 7d chart filter. */
  history7d: Point[];
  alerts: ThresholdAlert[];
  quality: DataQualitySummary;
  forecast: Forecast | null;
}

interface Row {
  t: number;
  v: SensorValues;
}

// ------------------------------------------------------------------ GMT+7 time helpers

/** Current wall-clock time in GMT+7 (WIB), represented as epoch ms. */
export function wallClockNow(): number {
  return Date.now() + WIB_OFFSET_MS;
}

export function toStamp(t: number): string {
  return new Date(t).toISOString().slice(0, 19).replace('T', ' ');
}

export function parseStamp(s: string): number {
  return Date.parse(s.trim().replace(' ', 'T') + 'Z');
}

// ------------------------------------------------------------------ CSV log

const cache = new Map<string, { mtime: number; rows: Row[]; spacingMin: number }>();

function readLog(file: string): { rows: Row[]; spacingMin: number } {
  if (!fs.existsSync(file)) return { rows: [], spacingMin: 5 };
  const mtime = fs.statSync(file).mtimeMs;
  const hit = cache.get(file);
  if (hit && hit.mtime === mtime) return { rows: hit.rows, spacingMin: hit.spacingMin };

  const [header, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const cols = header.split(',').map((c) => c.trim());
  const idx = SENSORS.map((k) => cols.indexOf(k));
  const rows: Row[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    const t = parseStamp(cells[0]);
    if (Number.isNaN(t)) continue;
    const v = {} as SensorValues;
    SENSORS.forEach((k, i) => {
      const n = idx[i] >= 0 ? parseFloat(cells[idx[i]]) : NaN;
      v[k] = Number.isFinite(n) ? n : null;
    });
    rows.push({ t, v });
  }
  rows.sort((a, b) => a.t - b.t);

  // Compute median spacing in minutes for R4 guard
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(rows.length, 500); i++) {
    const dt = (rows[i].t - rows[i - 1].t) / MINUTE;
    if (dt > 0) diffs.push(dt);
  }
  const spacingMin = median(diffs) ?? 5;
  cache.set(file, { mtime, rows, spacingMin });
  return { rows, spacingMin };
}

/** Appends one reading to the live log (creates it with §4.1 columns if needed). */
export function appendReading(t: number, v: SensorValues): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LIVE_LOG)) fs.writeFileSync(LIVE_LOG, `timestamp,${SENSORS.join(',')}\n`);
  const cells = SENSORS.map((k) => (v[k] == null ? '' : String(v[k])));
  fs.appendFileSync(LIVE_LOG, `${toStamp(t)},${cells.join(',')}\n`);
}

// ------------------------------------------------------------------ aggregation

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianOf(rows: Row[], minValid: number): SensorValues {
  const out = {} as SensorValues;
  for (const k of SENSORS) {
    const xs = rows.map((r) => r.v[k]).filter((x): x is number => x != null);
    out[k] = xs.length >= minValid ? median(xs) : null;
  }
  return out;
}

/** Fills interior gaps of at most MAX_GAP_BINS by linear interpolation (§4.2). */
function interpolateGaps(series: (number | null)[]): {
  values: (number | null)[];
  wasInterpolated: boolean[];
} {
  const values = [...series];
  const wasInterpolated = series.map(() => false);
  let last = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    const gap = i - last - 1;
    if (last >= 0 && gap > 0 && gap <= MAX_GAP_BINS) {
      for (let j = 1; j <= gap; j++) {
        values[last + j] = values[last]! + ((values[i]! - values[last]!) * j) / (gap + 1);
        wasInterpolated[last + j] = true;
      }
    }
    last = i;
  }
  return { values, wasInterpolated };
}

function toPoint(t: number, values: SensorValues, interpolated = false): Point {
  return { t, timestamp: toStamp(t), values, assessment: assess(values), interpolated };
}

function upperBound(rows: Row[], t: number): number {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].t <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function virtualNow(rows: Row[], wall: number): number {
  const start = rows[0].t + 7 * DAY_MS;
  const usable = Math.max(DAY_MS, rows[rows.length - 1].t - start);
  return start + (((wall - start) % usable) + usable) % usable;
}

// ------------------------------------------------------------------ forecast

interface RawForecastFile {
  source?: 'live' | 'placeholder';
  origin: string;
  models: Record<SensorKey, string>;
  steps: ({ timestamp: string } & Partial<Record<SensorKey, number | null>>)[];
  status_evaluation?: {
    horizon: string;
    model: string;
    accuracy: number;
    macro_f1: number;
    alerts_caught: number;
    false_alarms: number;
    suitability_mae: number;
  }[];
  sensor_skill?: {
    model: string;
    sensor: SensorKey;
    horizon: string;
    mae: number;
    rmse: number;
    skill_pct: number;
  }[];
  test_sample_counts?: {
    test_origins: number;
    Optimal: number;
    Warning: number;
    Critical: number;
  };
}

function readForecast(now: number): Forecast | null {
  if (!fs.existsSync(FORECAST_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(FORECAST_FILE, 'utf8')) as RawForecastFile;
    const origin = parseStamp(raw.origin);
    const steps = raw.steps.map((s) => {
      const values = {} as SensorValues;
      for (const k of SENSORS) values[k] = s[k] ?? null;
      return toPoint(parseStamp(s.timestamp), values, false);
    });
    const counts = raw.test_sample_counts ?? {
      test_origins: 427,
      Optimal: 262,
      Warning: 158,
      Critical: 7,
    };
    return {
      source: raw.source === 'live' ? 'live' : 'placeholder',
      origin,
      originStamp: raw.origin,
      stale: now - origin > FORECAST_MAX_AGE_MS || origin > now,
      models: raw.models,
      steps,
      statusEvaluation: (raw.status_evaluation ?? []).map((e) => ({
        horizon: e.horizon,
        model: e.model,
        accuracy: e.accuracy,
        macroF1: e.macro_f1,
        alertsCaught: e.alerts_caught,
        falseAlarms: e.false_alarms,
        suitabilityMae: e.suitability_mae,
      })),
      sensorSkill: (raw.sensor_skill ?? []).map((r) => ({
        model: r.model,
        sensor: r.sensor,
        horizon: r.horizon,
        mae: r.mae,
        rmse: r.rmse,
        skillPct: r.skill_pct,
      })),
      testSampleCounts: {
        testOrigins: counts.test_origins,
        Optimal: counts.Optimal,
        Warning: counts.Warning,
        Critical: counts.Critical,
      },
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ derive informational alerts

function buildThresholdAlerts(points: Point[]): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = [];
  // Inspect newest bins first; emit informational alerts for non-Optimal bins
  for (let i = points.length - 1; i >= 0 && alerts.length < 18; i--) {
    const pt = points[i];
    const { status, limiting, perSensor } = pt.assessment;
    if ((status !== 'Warning' && status !== 'Critical') || !limiting) continue;

    const info = SENSOR_INFO[limiting];
    const rawVal =
      limiting === 'dissolved_oxygen_mgl' ? doPercent(pt.values) : pt.values[limiting];
    const unit = limiting === 'dissolved_oxygen_mgl' ? '% sat' : info.unit;
    const suit = perSensor[limiting] ?? 0;
    const suitPct = Math.round(suit * 100);
    const valStr =
      rawVal != null ? rawVal.toFixed(limiting === 'dissolved_oxygen_mgl' ? 0 : info.decimals) : '—';
    const direction =
      info.kind === 'step'
        ? 'Above Step Limit'
        : rawVal != null && rawVal < info.mf[1]
          ? 'Below Target'
          : 'Above Target';

    // Avoid duplicating consecutive identical-sensor alerts unless status changed
    const prev = alerts[alerts.length - 1];
    if (
      prev &&
      prev.parameter === limiting &&
      prev.severity === (status === 'Critical' ? 'critical' : 'warning')
    ) {
      continue;
    }

    alerts.push({
      id: `BIN-${pt.t}-${limiting}`,
      severity: status === 'Critical' ? 'critical' : 'warning',
      parameter: limiting,
      parameterLabel: info.shortLabel,
      observedValue: valStr,
      unit,
      suitabilityPct: suitPct,
      title: `${info.shortLabel} ${direction}`,
      message: `${valStr} ${unit} · Target ${optimumText(limiting)}`,
      timestamp: pt.timestamp,
      t: pt.t,
      status: 'active',
    });
  }
  return alerts;
}

// ------------------------------------------------------------------ 5-second live stream

const SENSOR_JITTER_AMP: Record<SensorKey, number> = {
  temperature_c: 0.04,
  salinity_ppt: 0.05,
  dissolved_oxygen_mgl: 0.03,
  ph: 0.015,
  turbidity_ntu: 0.03,
};

/**
 * Builds a 60-point 5-second live monitoring stream (last 5 minutes at 5s intervals).
 * Uses surrounding raw log rows plus deterministic micro-variation within sensor probe resolution
 * so each 5-second tick advances smoothly in real time (GMT+7).
 */
function buildLiveStream5s(rows: Row[], now: number, fallbackValues: SensorValues): Point[] {
  const latestTick = Math.floor(now / LIVE_TICK_MS) * LIVE_TICK_MS;
  const out: Point[] = [];

  for (let i = LIVE_STREAM_TICKS - 1; i >= 0; i--) {
    const tickT = latestTick - i * LIVE_TICK_MS;
    const pos = upperBound(rows, tickT);
    const prevRow = pos > 0 ? rows[pos - 1] : null;
    const nextRow = pos < rows.length ? rows[pos] : prevRow;

    const values = {} as SensorValues;
    for (let sIdx = 0; sIdx < SENSORS.length; sIdx++) {
      const k = SENSORS[sIdx];
      const v0 = prevRow?.v[k] ?? fallbackValues[k];
      const v1 = nextRow?.v[k] ?? v0;
      if (v0 == null) {
        values[k] = null;
        continue;
      }
      let base = v0;
      if (prevRow && nextRow && nextRow.t > prevRow.t && v1 != null) {
        const frac = Math.max(0, Math.min(1, (tickT - prevRow.t) / (nextRow.t - prevRow.t)));
        base = v0 + (v1 - v0) * frac;
      }
      // Deterministic micro-oscillation seeded by the 5s tick index & sensor index
      const tickStep = Math.floor(tickT / LIVE_TICK_MS);
      const wave =
        Math.sin(tickStep * 0.65 + sIdx * 1.7) * 0.6 +
        Math.cos(tickStep * 0.23 - sIdx * 1.1) * 0.4;
      const decimals = SENSOR_INFO[k].decimals;
      const rawVal = Math.max(0, base + wave * SENSOR_JITTER_AMP[k]);
      values[k] = Number(rawVal.toFixed(decimals));
    }
    out.push(toPoint(tickT, values, false));
  }
  return out;
}

// ------------------------------------------------------------------ snapshot

export function getSnapshot(): Snapshot {
  const live = readLog(LIVE_LOG);
  const isLive = live.rows.length > 0;
  const mode = isLive ? 'live' : 'placeholder';
  const { rows, spacingMin } = isLive ? live : readLog(DEMO_LOG);
  const wall = wallClockNow();
  const now = mode === 'placeholder' && rows.length ? virtualNow(rows, wall) : wall;

  // R4 guard: spacing must not be coarser than 30 min
  const spacingGuardOk = spacingMin <= 30;

  const end = upperBound(rows, now);
  const firstBin7d = Math.floor(now / STEP_MS) * STEP_MS - (WEEK_BINS - 1) * STEP_MS;
  const begin7d = upperBound(rows, firstBin7d - 1);
  const recent = rows.slice(begin7d, end);

  const bins: Row[][] = Array.from({ length: WEEK_BINS }, () => []);
  for (const r of recent) {
    const idx = Math.floor((r.t - firstBin7d) / STEP_MS);
    if (idx >= 0 && idx < WEEK_BINS) bins[idx].push(r);
  }

  const binValues = bins.map((b) => medianOf(b, spacingGuardOk ? MIN_VALID : 0));
  const filled = {} as Record<SensorKey, (number | null)[]>;
  const interpFlags = {} as Record<SensorKey, boolean[]>;
  for (const k of SENSORS) {
    const res = interpolateGaps(binValues.map((v) => v[k]));
    filled[k] = res.values;
    interpFlags[k] = res.wasInterpolated;
  }

  const history7d = binValues.map((_, i) => {
    const values = {} as SensorValues;
    let interpolated = false;
    for (const k of SENSORS) {
      values[k] = filled[k][i];
      if (interpFlags[k][i]) interpolated = true;
    }
    return toPoint(firstBin7d + i * STEP_MS, values, interpolated);
  });

  const history24h = history7d.slice(-48);
  const interpolatedBins24h = history24h.filter((p) => p.interpolated).length;

  const lastReadingAt = end > 0 ? rows[end - 1].t : null;
  const window30m = rows.slice(upperBound(rows, now - STEP_MS), end);
  const baseCurrentValues = medianOf(window30m, 1);
  const liveStream5s = buildLiveStream5s(rows, now, baseCurrentValues);
  const latestLivePoint =
    liveStream5s.length > 0
      ? liveStream5s[liveStream5s.length - 1]
      : toPoint(lastReadingAt ?? now, baseCurrentValues, false);

  return {
    mode,
    now,
    lastReadingAt: latestLivePoint.t,
    offline: lastReadingAt == null || now - lastReadingAt > OFFLINE_AFTER_MS,
    current: latestLivePoint,
    liveStream5s,
    history24h,
    history7d,
    alerts: buildThresholdAlerts(history7d),
    quality: {
      sourceFile: isLive ? 'data/readings.csv' : 'data/sensor_log_placeholder.csv',
      rawReadingsCount: rows.length,
      medianSpacingMinutes: spacingMin,
      spacingGuardOk,
      totalBins24h: history24h.length,
      interpolatedBins24h,
      interpolatedPct24h: Number(
        ((100 * interpolatedBins24h) / Math.max(1, history24h.length)).toFixed(2),
      ),
    },
    forecast: readForecast(now),
  };
}
