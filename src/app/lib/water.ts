/**
 * Water-quality domain logic: 3 automated ESP32 sensors and literature-based
 * fuzzy suitability assessment (`PLANS.md` §4 & §7, Decision D7).
 *
 * 1:1 TypeScript port of `trap()` and `to_modelling_table()` from
 * `Claude_3/lobster_3sensor_package/src/make_modelling_tables.py`.
 *
 * Automated sensors (Decision D7): temperature_c, ph, turbidity_ntu.
 * Manual / Mechanical: Salinity (manual refractometer check), Dissolved Oxygen
 * (maintained by 24/7 campus blower), Ammonia (not sensed; 24/7 protein skimmer).
 */

export const SENSORS = ['temperature_c', 'ph', 'turbidity_ntu'] as const;

export type SensorKey = (typeof SENSORS)[number];
export type SensorValues = Record<SensorKey, number | null>;
export type Status = 'Optimal' | 'Warning' | 'Critical' | 'No data';

/** Top-level navigation menus per Supervisor Mr. Nizar's UI review (Decision D8). */
export type PrimaryTab = 'overview' | 'about';

/** Sub-menu tabs shown inside the horizontal segmented bar when `about` is active. */
export type AboutSubTab = 'forecast' | 'water_quality' | 'alerts' | 'history' | 'device';

export type PondVisualMode = 'image' | 'video' | 'off';

/** Confirmed target species in the Telkom University Surabaya campus holding tank. */
export const TARGET_SPECIES = {
  commonName: 'Pearl Lobster',
  scientificName: 'Panulirus ornatus',
  referenceNote:
    'Thermal optima from Jones (2009), J. World Aquac. Soc. 40(6):744–752; marine pH & clarity from KepMen LH No. 51/2004',
} as const;

/** Trapezoid (zero-point, full-point, full-point, zero-point). 1 = optimum, 0 = outside tolerance. */
type Trapezoid = readonly [number, number, number, number];

export interface SensorInfo {
  key: SensorKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  /** Trapezoidal membership function (a, b, c, d) per PLANS.md §7. */
  mf: Trapezoid;
  optimalRangeText: string;
  toleranceRangeText: string;
  source: string;
  /** Open issue from PLANS.md §7 (flagged transparently per R2 & R9). */
  needsSource: string | null;
  probeNote: string;
}

export const SENSOR_INFO: Record<SensorKey, SensorInfo> = {
  temperature_c: {
    key: 'temperature_c',
    label: 'Water Temperature',
    shortLabel: 'Temperature',
    unit: '°C',
    decimals: 1,
    mf: [19, 25, 31, 32],
    optimalRangeText: '25.0 – 31.0 °C',
    toleranceRangeText: '19.0 – 32.0 °C',
    source:
      'Jones (2009), J World Aquac Soc 40(6):744–752 (growth 25–31 °C, optimum 27 °C for Panulirus ornatus); upper non-lethal limit 32 °C.',
    needsSource:
      'NEEDS_SOURCE: 19 °C is only the coldest temperature tested, not a confirmed lower lethal limit.',
    probeNote: 'DS18B20 Waterproof (1-Wire digital) → ESP32S CH340',
  },
  ph: {
    key: 'ph',
    label: 'Acidity (pH)',
    shortLabel: 'pH',
    unit: 'pH',
    decimals: 2,
    mf: [7.0, 7.8, 8.4, 8.5],
    optimalRangeText: '7.80 – 8.40 pH',
    toleranceRangeText: '7.00 – 8.50 pH',
    source:
      'Marine culture guideline 7.8–8.4; marine-biota standard 7.0–8.5 (KepMen LH No. 51/2004).',
    needsSource: null,
    probeNote: 'PH-4502C + electrode probe → ADS1115 16-bit ADC',
  },
  turbidity_ntu: {
    key: 'turbidity_ntu',
    label: 'Turbidity',
    shortLabel: 'Turbidity',
    unit: 'NTU',
    decimals: 1,
    mf: [-Infinity, -Infinity, 5.0, 25.0],
    optimalRangeText: '≤ 5.0 NTU',
    toleranceRangeText: '< 25.0 NTU (Warning: 5.0–25.0)',
    source:
      'KepMen LH No. 51/2004 marine clarity standard (≤ 5.0 NTU optimum); trapezoidal ramp to 25.0 NTU zero-point.',
    needsSource:
      'NEEDS_SOURCE: 25.0 NTU upper zero-point is provisional; optical Turbidity Red Board requires calibration.',
    probeNote: 'Turbidity Red Board (optical) → ADS1115 16-bit ADC',
  },
};

export const RANGES: Record<SensorKey, Trapezoid> = {
  temperature_c: SENSOR_INFO.temperature_c.mf,
  ph: SENSOR_INFO.ph.mf,
  turbidity_ntu: SENSOR_INFO.turbidity_ntu.mf,
};

export const STATUS_ORDER: Status[] = ['Optimal', 'Warning', 'Critical'];

const EPS = 1e-9;

/** Trapezoidal membership, identical to `make_modelling_tables.py::trap()`. */
export function trap(x: number, [a, b, c, d]: Trapezoid): number {
  const up = b > a ? (x - a) / Math.max(b - a, EPS) : x >= b ? 1 : 0;
  const dn = d > c ? (d - x) / Math.max(d - c, EPS) : x <= c ? 1 : 0;
  return Math.min(Math.max(Math.min(up, dn), 0), 1);
}

/** Suitability of sensor `key` at value `x` (0..1). */
export function suitabilityOf(key: SensorKey, x: number): number {
  return trap(x, SENSOR_INFO[key].mf);
}

export interface Assessment {
  status: Status;
  /** Overall suitability = MIN over the 3 automated sensors (0–1, Decision D5). */
  suitability: number | null;
  perSensor: Record<SensorKey, number | null>;
  /** Sensor holding quality down, or null when everything is optimal. */
  limiting: SensorKey | null;
}

/** Port of the 3-sensor `fuzzy_assess()` rule set (PLANS.md §7 & D5). */
export function assess(v: SensorValues): Assessment {
  const perSensor = {} as Record<SensorKey, number | null>;
  for (const key of SENSORS) {
    const x = v[key];
    perSensor[key] = x == null ? null : suitabilityOf(key, x);
  }

  let suitability: number | null = null;
  let limiting: SensorKey | null = null;

  for (const key of SENSORS) {
    const s = perSensor[key];
    if (s != null) {
      if (suitability == null || s < suitability) {
        suitability = s;
        limiting = key;
      }
    }
  }

  if (suitability == null) {
    return { status: 'No data', suitability: null, perSensor, limiting: null };
  }

  const status: Status =
    suitability >= 1 - EPS ? 'Optimal' : suitability <= EPS ? 'Critical' : 'Warning';
  return {
    status,
    suitability,
    perSensor,
    limiting: status === 'Optimal' ? null : limiting,
  };
}

/** Human-readable optimum range, e.g. "25–31 °C" or "≤ 5 NTU". */
export function optimumText(key: SensorKey): string {
  const { mf, unit } = SENSOR_INFO[key];
  if (!Number.isFinite(mf[1])) return `≤ ${mf[2]} ${unit}`.trim();
  return `${mf[1]}–${mf[2]} ${unit}`.trim();
}

/**
 * Strictly informational explanation of why a sensor is limiting (PLANS.md R14 & §7:
 * never describe Critical as medical diagnosis or advise hardware control actions).
 */
export function limitingReason(key: SensorKey, v: SensorValues): string {
  const info = SENSOR_INFO[key];
  const { mf, shortLabel, decimals, unit } = info;
  const x = v[key];
  if (x == null) return `${shortLabel} reading unavailable.`;
  const valStr = `${x.toFixed(decimals)} ${unit}`;
  const dir = Number.isFinite(mf[1]) && x < mf[1] ? 'Low' : 'High';
  const outside = (Number.isFinite(mf[0]) && x <= mf[0]) || (Number.isFinite(mf[3]) && x >= mf[3]);
  return outside
    ? `${dir} ${shortLabel} (${valStr} · tolerance ${info.toleranceRangeText})`
    : `${dir} ${shortLabel} (${valStr} · target ${optimumText(key)})`;
}
