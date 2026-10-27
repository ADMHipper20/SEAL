/**
 * Display, GMT+7 (WIB) date/time formatting, and monotone cubic spline SVG helpers.
 */
import { SENSOR_INFO, type SensorKey, type Status } from './water';

export interface SplinePoint {
  x: number;
  y: number;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatValue(key: SensorKey, v: number | null): string {
  return v == null ? '—' : v.toFixed(SENSOR_INFO[key].decimals);
}

/** "HH:MM" of a GMT+7 wall-clock timestamp (stored as UTC ms, see data.ts). */
export function formatTime(t: number): string {
  return new Date(t).toISOString().slice(11, 16);
}

/** "HH:MM:SS" of a GMT+7 wall-clock timestamp for 5-second live stream monitoring. */
export function formatTimeSeconds(t: number): string {
  return new Date(t).toISOString().slice(11, 19);
}

/** "DD Mon YYYY • HH:MM GMT+7" of a GMT+7 wall-clock timestamp. */
export function formatDateTimeGmt7(t: number | null): string {
  if (t == null || Number.isNaN(t)) return 'No timestamp';
  const iso = new Date(t).toISOString();
  const year = iso.slice(0, 4);
  const monthIdx = parseInt(iso.slice(5, 7), 10) - 1;
  const day = parseInt(iso.slice(8, 10), 10);
  const hhmm = iso.slice(11, 16);
  return `${day} ${MONTHS_EN[monthIdx] ?? ''} ${year} • ${hhmm} GMT+7`;
}

/** "DD Mon YYYY • HH:MM:SS GMT+7" with visible seconds for 5-second live monitoring. */
export function formatDateTimeSecondsGmt7(t: number | null): string {
  if (t == null || Number.isNaN(t)) return 'No timestamp';
  const iso = new Date(t).toISOString();
  const year = iso.slice(0, 4);
  const monthIdx = parseInt(iso.slice(5, 7), 10) - 1;
  const day = parseInt(iso.slice(8, 10), 10);
  const hhmmss = iso.slice(11, 19);
  return `${day} ${MONTHS_EN[monthIdx] ?? ''} ${year} • ${hhmmss} GMT+7`;
}

export function formatShortDateGmt7(t: number): string {
  const iso = new Date(t).toISOString();
  const monthIdx = parseInt(iso.slice(5, 7), 10) - 1;
  const day = parseInt(iso.slice(8, 10), 10);
  const hhmm = iso.slice(11, 16);
  return `${day} ${MONTHS_EN[monthIdx] ?? ''}, ${hhmm}`;
}

export function formatPercent(x: number | null): string {
  return x == null ? '—' : `${Math.round(x * 100)}%`;
}

/** BEM modifier for a status: `optimal`, `warning`, `critical`, `none`. */
export function statusModifier(s: Status): 'optimal' | 'warning' | 'critical' | 'none' {
  if (s === 'Optimal') return 'optimal';
  if (s === 'Warning') return 'warning';
  if (s === 'Critical') return 'critical';
  return 'none';
}

/** Maps a notebook Status to the legacy Bento CSS status class (`normal | warning | critical | unknown`). */
export function bentoStatusKey(s: Status): 'normal' | 'warning' | 'critical' | 'unknown' {
  if (s === 'Optimal') return 'normal';
  if (s === 'Warning') return 'warning';
  if (s === 'Critical') return 'critical';
  return 'unknown';
}

/** Status of a single sensor from its suitability (same thresholds as the overall status). */
export function sensorStatus(suitability: number | null): Status {
  if (suitability == null) return 'No data';
  if (suitability >= 1 - 1e-9) return 'Optimal';
  if (suitability <= 1e-9) return 'Critical';
  return 'Warning';
}

/** SVG path through the points; breaks where a value is missing. */
export function linePath(
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** [min, max] of the non-null values with padding so flat lines stay visible. */
export function paddedExtent(values: (number | null)[], pad = 0.15): [number, number] {
  const xs = values.filter((v): v is number => v != null);
  if (!xs.length) return [0, 1];
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const span = hi - lo || Math.abs(hi) * 0.05 || 1;
  return [lo - span * pad, hi + span * pad];
}

/**
 * Monotone cubic Hermite spline path (`M ... C ...`) used by the Bento sparklines and charts.
 */
export function getMonotoneSplinePath(points: SplinePoint[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dxi = points[i + 1].x - points[i].x;
    const dyi = points[i + 1].y - points[i].y;
    dx.push(dxi);
    dy.push(dyi);
    m.push(dxi !== 0 ? dyi / dxi : 0);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = m[0];
  tangents[n - 1] = m[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (m[i - 1] + m[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / m[i];
      const beta = tangents[i + 1] / m[i];
      const sq = alpha * alpha + beta * beta;
      if (sq > 9) {
        const tau = 3 / Math.sqrt(sq);
        tangents[i] = tau * alpha * m[i];
        tangents[i + 1] = tau * beta * m[i];
      }
    }
  }

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const step = dx[i] / 3;
    const cp1x = p0.x + step;
    const cp1y = p0.y + tangents[i] * step;
    const cp2x = p1.x - step;
    const cp2y = p1.y - tangents[i + 1] * step;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  return d;
}

export function getMonotoneAreaPath(points: SplinePoint[], baselineY: number): string {
  if (!points || points.length < 2) return '';
  const line = getMonotoneSplinePath(points);
  const firstX = points[0].x.toFixed(2);
  const lastX = points[points.length - 1].x.toFixed(2);
  const base = baselineY.toFixed(2);
  return `${line} L ${lastX},${base} L ${firstX},${base} Z`;
}
