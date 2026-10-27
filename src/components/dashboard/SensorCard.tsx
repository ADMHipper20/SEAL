import { formatValue, linePath, paddedExtent, sensorStatus, statusModifier } from '@/app/lib/format';
import { SENSOR_INFO, doPercent, optimumText, type SensorKey, type SensorValues } from '@/app/lib/water';

interface SensorCardProps {
  sensor: SensorKey;
  values: SensorValues;
  suitability: number | null;
  /** Last 24 h of 30-min medians for the sparkline. */
  trend: (number | null)[];
}

const W = 120;
const H = 32;

export function SensorCard({ sensor, values, suitability, trend }: SensorCardProps) {
  const info = SENSOR_INFO[sensor];
  const status = sensorStatus(suitability);
  const [lo, hi] = paddedExtent(trend);
  const spark = linePath(
    trend,
    (i) => (i / Math.max(trend.length - 1, 1)) * W,
    (v) => H - ((v - lo) / (hi - lo)) * H,
  );
  const saturation = sensor === 'dissolved_oxygen_mgl' ? doPercent(values) : null;

  return (
    <article className={`sensor sensor--${statusModifier(status)}`}>
      <header className="sensor__head">
        <h3 className="sensor__label">{info.label}</h3>
        <span className="sensor__pill">{status}</span>
      </header>

      <p className="sensor__value">
        {formatValue(sensor, values[sensor])}
        {info.unit && <span className="sensor__unit">{info.unit}</span>}
      </p>
      <p className="sensor__extra">
        {saturation != null ? `${saturation.toFixed(0)} % saturation` : ' '}
      </p>

      <svg className="sensor__spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path d={spark} />
      </svg>

      <div className="sensor__bar" title={`Suitability ${Math.round((suitability ?? 0) * 100)}%`}>
        <span className="sensor__bar-fill" style={{ width: `${(suitability ?? 0) * 100}%` }} />
      </div>
      <p className="sensor__range" title={info.source}>
        Optimum {optimumText(sensor)}
      </p>
    </article>
  );
}
