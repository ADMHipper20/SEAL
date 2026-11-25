'use client';

import React, { useState } from 'react';
import {
  Droplets,
  Thermometer,
  Eye,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from 'lucide-react';
import type { Point } from '@/app/lib/data';
import {
  bentoStatusKey,
  formatTimeSeconds,
  formatValue,
  getMonotoneAreaPath,
  getMonotoneSplinePath,
  sensorStatus,
} from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, optimumText, type SensorKey } from '@/app/lib/water';

interface CurrentConditionsCardProps {
  current: Point;
  liveStream5s?: Point[];
  history24h: Point[];
  selectedSensor: SensorKey;
  sparkWindow?: '5s' | '24h';
  onSparkWindowChange?: (window: '5s' | '24h') => void;
  onSelectSensor: (sensor: SensorKey, activeWindow: '5s' | '24h') => void;
  onViewDetails?: () => void;
}

const MiniSparkline: React.FC<{
  values: (number | null)[];
  statusKey: 'normal' | 'warning' | 'critical' | 'unknown';
}> = ({ values, statusKey }) => {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  const slice = valid.slice(-16);

  const strokeColor =
    statusKey === 'critical'
      ? 'var(--status-critical)'
      : statusKey === 'warning'
        ? 'var(--status-warning)'
        : 'var(--accent-primary)';

  if (slice.length < 2) {
    return (
      <svg width="68" height="22" viewBox="0 0 68 22" className="mini-sparkline-svg" aria-hidden="true">
        <path
          d="M 2,11 L 66,11"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeOpacity="0.45"
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 0.02;

  const width = 68;
  const height = 22;
  const paddingY = 3;
  const usableH = height - paddingY * 2;

  const coords = slice.map((val, idx) => {
    const x = (idx / (slice.length - 1)) * (width - 6) + 3;
    const y = height - paddingY - ((val - min) / range) * usableH;
    return { x, y };
  });

  const line = getMonotoneSplinePath(coords);
  const area = getMonotoneAreaPath(coords, height);
  const lastPt = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mini-sparkline-svg" aria-hidden="true">
      <path d={area} fill={strokeColor} fillOpacity="0.09" />
      <path
        d={line}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.1" fill={strokeColor} />
    </svg>
  );
};

const SENSOR_ICONS: Record<SensorKey, React.ReactNode> = {
  temperature_c: <Thermometer size={16} />,
  ph: <Droplets size={16} />,
  turbidity_ntu: <Eye size={16} />,
};

export const CurrentConditionsCard: React.FC<CurrentConditionsCardProps> = ({
  current,
  liveStream5s = [],
  history24h,
  selectedSensor,
  sparkWindow,
  onSparkWindowChange,
  onSelectSensor,
  onViewDetails,
}) => {
  const [internalMode, setInternalMode] = useState<'5s' | '24h'>('5s');
  const sparkMode = sparkWindow ?? internalMode;

  const handleModeChange = (next: '5s' | '24h') => {
    setInternalMode(next);
    onSparkWindowChange?.(next);
  };

  const activeSeriesPoints =
    sparkMode === '5s' && liveStream5s.length > 0 ? liveStream5s : history24h;

  const computeTrend = (key: SensorKey): 'up' | 'down' | 'stable' => {
    const valid = activeSeriesPoints
      .map((p) => p.values[key])
      .filter((v): v is number => v != null);
    if (valid.length < 2) return 'stable';
    const delta = valid[valid.length - 1] - valid[valid.length - 2];
    const threshold = sparkMode === '5s' ? 0.002 : 0.01;
    if (Math.abs(delta) < threshold) return 'stable';
    return delta > 0 ? 'up' : 'down';
  };

  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={12} className="trend-icon trend-up" />;
    if (trend === 'down') return <TrendingDown size={12} className="trend-icon trend-down" />;
    return <Minus size={12} className="trend-icon trend-stable" />;
  };

  return (
    <section className="conditions-shelf" aria-label="Current Conditions">
      {/* Header Toolbar */}
      <div className="conditions-shelf__header">
        <div className="conditions-shelf__title-group">
          <h2 className="conditions-shelf__title">Current Conditions</h2>
          <span className="manual-salinity-badge">
            <Info size={12} />
            <span>Salinity: Manual Check · DO: 24/7 Blower</span>
          </span>
        </div>

        <div className="conditions-shelf__actions">
          <div className="spark-mode-switch" role="group" aria-label="Telemetry window (5s live or 24h)">
            <button
              type="button"
              className={`spark-mode-btn ${sparkMode === '5s' ? 'active' : ''}`}
              onClick={() => handleModeChange('5s')}
              title={`5-second live stream (${formatTimeSeconds(current.t)} GMT+7)`}
            >
              <span className="live-stream-pill__dot" />
              <span>5s Live</span>
            </button>
            <button
              type="button"
              className={`spark-mode-btn ${sparkMode === '24h' ? 'active' : ''}`}
              onClick={() => handleModeChange('24h')}
              title="24-hour 30-minute median series"
            >
              <span>24h</span>
            </button>
          </div>

          {onViewDetails && (
            <button
              type="button"
              className="bento-action-btn-mini"
              onClick={onViewDetails}
              title="Open Water Quality Details"
            >
              <span>Water Quality</span>
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3 Compact Horizontal Sensor Cards */}
      <div className="conditions-shelf__grid">
        {SENSORS.map((key) => {
          const info = SENSOR_INFO[key];
          const suit = current.assessment.perSensor[key];
          const stLabel = sensorStatus(suit);
          const stKey = bentoStatusKey(stLabel);
          const trend = computeTrend(key);
          const series = activeSeriesPoints.map((p) => p.values[key]);
          const isSelected = selectedSensor === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectSensor(key, sparkMode)}
              aria-pressed={isSelected}
              className={`conditions-card ${isSelected ? 'conditions-card--selected' : ''}`}
              title={`Click to open ${info.label} (${sparkMode === '5s' ? '5s Live' : '24h'}) in the graph`}
            >
              <div className={`conditions-card__icon ${isSelected ? 'conditions-card__icon--active' : ''}`}>
                {SENSOR_ICONS[key]}
              </div>

              <div className="conditions-card__body">
                <div className="conditions-card__top">
                  <span className="conditions-card__label">{info.shortLabel}</span>
                  <span className="condition-trend-wrap">{renderTrendIcon(trend)}</span>
                </div>
                <div className="conditions-card__value-row">
                  <span className="conditions-card__val">
                    {formatValue(key, current.values[key])}
                  </span>
                  <span className="conditions-card__unit">{info.unit}</span>
                </div>
                <span className="conditions-card__target">
                  Optimum {optimumText(key)} · μ={suit != null ? `${Math.round(suit * 100)}%` : '—'}
                </span>
              </div>

              <div className="conditions-card__right">
                <span className={`condition-status-pill status-${stKey}`}>{stLabel}</span>
                <MiniSparkline values={series} statusKey={stKey} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
