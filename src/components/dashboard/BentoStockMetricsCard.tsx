'use client';

import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { bentoStatusKey, formatValue } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, limitingReason, type SensorKey } from '@/app/lib/water';

interface BentoStockMetricsCardProps {
  current: Point;
  selectedSensor?: SensorKey;
  onSelectSensor?: (sensor: SensorKey) => void;
}

export const BentoStockMetricsCard: React.FC<BentoStockMetricsCardProps> = ({
  current,
  selectedSensor,
  onSelectSensor,
}) => {
  const { status, suitability, perSensor, limiting } = current.assessment;
  const level = bentoStatusKey(status);
  const score = suitability != null ? Math.round(suitability * 100) : null;

  const statusIcon =
    level === 'critical' ? (
      <AlertOctagon size={15} style={{ color: 'var(--status-critical)', flexShrink: 0 }} />
    ) : level === 'warning' ? (
      <AlertTriangle size={15} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
    ) : (
      <CheckCircle2 size={15} style={{ color: 'var(--status-normal)', flexShrink: 0 }} />
    );

  const summaryText = limiting
    ? `${limitingReason(limiting, current.values)} (Rule D5 MIN)`
    : 'All 3 automated parameters sit within published optimum bounds (Jones 2009 / KepMen LH 51/2004).';

  return (
    <section className="fuzzy-compact-bar" aria-label="Fuzzy Suitability Summary">
      <div className="fuzzy-compact-bar__left">
        <span className={`bento-status-pill pill-${level === 'unknown' ? 'pending' : level}`}>
          {status.toUpperCase()} · min(μ)={score != null ? `${score}%` : '—'}
        </span>

        <div className="fuzzy-compact-bar__summary">
          {statusIcon}
          <span>{summaryText}</span>
        </div>
      </div>

      <div className="fuzzy-compact-bar__chips" role="group" aria-label="Per-sensor suitability">
        <span className="fuzzy-compact-bar__label">
          <Activity size={12} />
          <span>Per-Sensor μ:</span>
        </span>
        {SENSORS.map((k) => {
          const info = SENSOR_INFO[k];
          const mu = perSensor[k];
          const muPct = mu != null ? `${Math.round(mu * 100)}%` : '—';
          const isSelected = selectedSensor === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSelectSensor?.(k)}
              className={`fuzzy-inline-chip ${isSelected ? 'fuzzy-inline-chip--active' : ''}`}
              title={`${info.label}: ${formatValue(k, current.values[k])} ${info.unit} (Click to view in chart)`}
            >
              <span>{info.shortLabel}</span>
              <strong>{muPct}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
};
