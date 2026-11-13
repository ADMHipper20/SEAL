/**
 * Water-quality domain logic: sensor definitions and the literature-based
 * fuzzy suitability assessment (`Claude_2/PLANS.md` §4 & §7).
 *
 * 1:1 TypeScript port of `trap`, `suitability`, `do_saturation_mgl`,
 * `fuzzy_assess`, and `fuzzy_final` from `Claude_2/01_data_exploration_and_plots.ipynb`
 * and `Claude_2/04_ml_dl_behind_fuzzy.ipynb`.
 */

export const SENSORS = [
  'temperature_c',
  'salinity_ppt',
  'ph',
  'dissolved_oxygen_mgl',
  'turbidity_ntu',
] as const;

export type SensorKey = (typeof SENSORS)[number];
export type SensorValues = Record<SensorKey, number | null>;
export type Status = 'Optimal' | 'Warning' | 'Critical' | 'No data';

export type NavigationTab =
  | 'overview'
  | 'forecast'
  | 'water_quality'
  | 'alerts'
  | 'history'
  | 'device';

export type PondVisualMode = 'image' | 'video' | 'off';

/** Confirmed target species in the campus holding tank (Decision D11). */
export const TARGET_SPECIES = {
  commonName: 'Pearl Lobster',
  scientificName: 'Panulirus ornatus',
  referenceNote: 'Thermal & salinity optima from Jones (2009), J. World Aquac. Soc. 40(6):744–752',
} as const;

/** Trapezoid (zero-point, full-point, full-point, zero-point). 1 = optimum, 0 = outside tolerance. */
type Trapezoid = readonly [number, number, number, number];

export interface SensorInfo {
  key: SensorKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  /** Membership function, applied to the value (DO: to % saturation via Weiss 1970). */
  mf: Trapezoid;
  /** 'trapezoid' (default) or 'step' (for turbidity_ntu per PLANS.md §7 & D7). */
  kind: 'trapezoid' | 'step';
  /** Minimum suitability floor for step functions (0.5 for turbidity_ntu: Warning only, never Critical). */
  floor?: number;
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
    kind: 'trapezoid',
    optimalRangeText: '25.0 – 31.0 °C',
    toleranceRangeText: '19.0 – 32.0 °C',
    source:
      'Jones (2009), J World Aquac Soc 40(6):744-752 (growth 25–31 °C, optimum 27 °C for Panulirus ornatus); P. ornatus thermal-physiology study (max non-lethal 32 °C).',
    needsSource:
      'NEEDS_SOURCE: 19 °C is only the coldest temperature tested, not a confirmed lower lethal limit.',
    probeNote: 'DS18B20 waterproof probe',
  },
  salinity_ppt: {
    key: 'salinity_ppt',
    label: 'Salinity',
    shortLabel: 'Salinity',
    unit: 'ppt',
    decimals: 1,
    mf: [25, 30, 34, 38],
    kind: 'trapezoid',
    optimalRangeText: '30.0 – 34.0 ppt',
    toleranceRangeText: '25.0 – 38.0 ppt',
    source:
      'Culture guideline 30–38 ppt; 25–34 ppt optimum for P. ornatus; Jones (2009): 35 ppt best growth but lowest survival.',
    needsSource: 'NEEDS_SOURCE: lower zero-point 25 ppt is provisional.',
    probeNote: 'DFRobot EC K=10 probe (verify with refractometer)',
  },
  ph: {
    key: 'ph',
    label: 'Acidity (pH)',
    shortLabel: 'pH',
    unit: 'pH',
    decimals: 2,
    mf: [7.0, 7.8, 8.4, 8.5],
    kind: 'trapezoid',
    optimalRangeText: '7.80 – 8.40 pH',
    toleranceRangeText: '7.00 – 8.50 pH',
    source: 'Culture guideline 7.8–8.4; marine-biota standard 7.0–8.5 (KepMen LH No. 51/2004).',
    needsSource: null,
    probeNote: 'PH-4502C electrode (verify with pH buffer powders)',
  },
  dissolved_oxygen_mgl: {
    key: 'dissolved_oxygen_mgl',
    label: 'Dissolved O₂',
    shortLabel: 'Dissolved O₂',
    unit: 'mg/L',
    decimals: 2,
    mf: [70, 80, Infinity, Infinity],
    kind: 'trapezoid',
    optimalRangeText: '≥ 80 % saturation (> 5.0 mg/L)',
    toleranceRangeText: '≥ 70 % saturation',
    source:
      'Culture guideline: ≥ 80 % saturation preferred, 70 % minimum; saturation computed from DO, temperature, and salinity via Weiss (1970). KepMen LH 51/2004 states > 5 mg/L.',
    needsSource: null,
    probeNote: 'DFRobot SEN0237 galvanic probe (Weiss 1970 % sat)',
  },
  turbidity_ntu: {
    key: 'turbidity_ntu',
    label: 'Turbidity',
    shortLabel: 'Turbidity',
    unit: 'NTU',
    decimals: 1,
    mf: [-Infinity, -Infinity, 5, 5],
    kind: 'step',
    floor: 0.5,
    optimalRangeText: '≤ 5.0 NTU',
    toleranceRangeText: '> 5.0 NTU → Warning (μ = 0.5)',
    source:
      'KepMen LH No. 51/2004 marine-biota standard (< 5 NTU, natural-seawater standard). Step rule: suitability 1.0 if ≤ 5 NTU, else 0.5 (Warning only, never Critical; Decision D7).',
    needsSource:
      'NEEDS_SOURCE: no tolerance limit found; a fed tank may exceed 5 NTU after feeding; analog NTU needs calibration.',
    probeNote: 'Analog turbidity sensor (NTU) via ESP32 + ADS1115 ADC',
  },
};

export const STATUS_ORDER: Status[] = ['Optimal', 'Warning', 'Critical'];

const EPS = 1e-9;

/** Trapezoidal membership, identical to the notebook's `trap()`. */
export function trap(x: number, [a, b, c, d]: Trapezoid): number {
  const up = b > a ? (x - a) / Math.max(b - a, EPS) : x >= b ? 1 : 0;
  const dn = d > c ? (d - x) / Math.max(d - c, EPS) : x <= c ? 1 : 0;
  return Math.min(Math.max(Math.min(up, dn), 0), 1);
}

/**
 * Suitability of sensor `key` at value `x` (0..1), identical to the notebook's `suitability()`.
 * Turbidity is a step function: 1.0 if <= 5 NTU, else 0.5 (Warning only, never Critical).
 */
export function suitabilityOf(key: SensorKey, x: number): number {
  const info = SENSOR_INFO[key];
  if (info.kind === 'step') {
    return x <= info.mf[2] ? 1.0 : (info.floor ?? 0.5);
  }
  return trap(x, info.mf);
}

/** Weiss (1970) oxygen solubility in mg/L. */
export function doSaturationMgl(tempC: number, salinityPpt: number): number {
  const t = (tempC + 273.15) / 100;
  return (
    Math.exp(
      -173.4292 +
        249.6339 / t +
        143.3483 * Math.log(t) -
        21.8492 * t +
        salinityPpt * (-0.033096 + 0.014259 * t - 0.0017 * t * t),
    ) * 1.4276
  );
}

/** DO as % saturation, or null when temperature/salinity are missing. */
export function doPercent(v: SensorValues): number | null {
  const { dissolved_oxygen_mgl: d, temperature_c: t, salinity_ppt: s } = v;
  if (d == null || t == null || s == null) return null;
  return (100 * d) / doSaturationMgl(t, s);
}

export interface Assessment {
  status: Status;
  /** Overall suitability = min over the 5 sensors (0–1, Decision D5). */
  suitability: number | null;
  /** Crisp Fuzzy Water-Quality Index: FWQI = 100 * (Π μ_i)^(1/5) (0–100, Decision D9 & Rule R17). */
  fwqi: number | null;
  perSensor: Record<SensorKey, number | null>;
  /** Sensor holding quality down, or null when everything is optimal. */
  limiting: SensorKey | null;
}

/** Port of the notebook's `fuzzy_assess()` + `fuzzy_final()` for a single reading. */
export function assess(v: SensorValues): Assessment {
  const perSensor = {} as Record<SensorKey, number | null>;
  for (const key of SENSORS) {
    const x = key === 'dissolved_oxygen_mgl' ? doPercent(v) : v[key];
    perSensor[key] = x == null ? null : suitabilityOf(key, x);
  }

  let suitability: number | null = null;
  let limiting: SensorKey | null = null;
  let prod = 1.0;
  let validCount = 0;

  for (const key of SENSORS) {
    const s = perSensor[key];
    if (s != null) {
      prod *= Math.max(0, s);
      validCount++;
      if (suitability == null || s < suitability) {
        suitability = s;
        limiting = key;
      }
    }
  }

  if (suitability == null || validCount === 0) {
    return { status: 'No data', suitability: null, fwqi: null, perSensor, limiting: null };
  }

  const fwqi = 100 * Math.pow(prod, 1 / validCount);
  const status: Status =
    suitability >= 1 - EPS ? 'Optimal' : suitability <= EPS ? 'Critical' : 'Warning';
  return {
    status,
    suitability,
    fwqi,
    perSensor,
    limiting: status === 'Optimal' ? null : limiting,
  };
}

/** Human-readable optimum range, e.g. "25–31 °C" or "≥ 80 % sat." or "≤ 5 NTU". */
export function optimumText(key: SensorKey): string {
  const { mf, unit } = SENSOR_INFO[key];
  if (key === 'dissolved_oxygen_mgl') return `≥ ${mf[1]} % sat.`;
  if (!Number.isFinite(mf[1])) return `≤ ${mf[2]} ${unit}`.trim();
  return `${mf[1]}–${mf[2]} ${unit}`.trim();
}

/**
 * Strictly informational explanation of why a sensor is limiting (PLANS.md R14, R15 & §7:
 * never describe Critical as "lethal" or advise hardware/tank actions).
 */
export function limitingReason(key: SensorKey, v: SensorValues): string {
  const info = SENSOR_INFO[key];
  const { mf, shortLabel, decimals, unit } = info;
  const x = key === 'dissolved_oxygen_mgl' ? doPercent(v) : v[key];
  if (x == null) return `${shortLabel} reading unavailable.`;
  const valStr =
    key === 'dissolved_oxygen_mgl' ? `${x.toFixed(0)}% sat` : `${x.toFixed(decimals)} ${unit}`;
  if (info.kind === 'step') {
    return `Elevated ${shortLabel} (${valStr} · step threshold ≤ ${mf[2]} ${unit}; Warning floor μ = ${info.floor ?? 0.5})`;
  }
  const dir = x < mf[1] ? 'Low' : 'High';
  const outside = x <= mf[0] || x >= mf[3];
  return outside
    ? `${dir} ${shortLabel} (${valStr} · tolerance ${info.toleranceRangeText})`
    : `${dir} ${shortLabel} (${valStr} · target ${optimumText(key)})`;
}
