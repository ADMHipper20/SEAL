'use client';

import React, { useId, useState } from 'react';
import {
  Droplets,
  Thermometer,
  Waves,
  Wind,
  FlaskConical,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
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
import { SENSORS, SENSOR_INFO, doPercent, type SensorKey } from '@/app/lib/water';

interface CurrentConditionsCardProps {
  current: Point;
  liveStream5s?: Point[];
  history24h: Point[];
  onViewDetails?: () => void;
}

const MiniSparkline: React.FC<{
  values: (number | null)[];
  color: string;
  statusKey: 'normal' | 'warning' | 'critical' | 'unknown';
}> = ({ values, color, statusKey }) => {
  const reactId = useId();
  const gradId = `mini-spark-${reactId.replace(/:/g, '')}`;

  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  const slice = valid.slice(-16);

  const strokeColor =
    statusKey === 'critical' ? '#ef4444' : statusKey === 'warning' ? '#f59e0b' : color;

  if (slice.length < 2) {
    return (
      <svg width="72" height="22" viewBox="0 0 72 22" className="mini-sparkline-svg" aria-hidden="true">
        <path
          d="M 2,11 Q 36,9 70,11"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 0.02;

  const width = 72;
  const height = 22;
  const paddingY = 2;
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
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="65%" stopColor={strokeColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill={strokeColor} />
      <circle cx={lastPt.x} cy={lastPt.y} r="4.5" fill={strokeColor} opacity="0.22" />
    </svg>
  );
};

const SENSOR_STYLE: Record<
  SensorKey,
  {
    itemClass: string;
    icon: React.ReactNode;
    color: string;
    wide?: boolean;
  }
> = {
  temperature_c: {
    itemClass: 'condition-temp',
    icon: <Thermometer size={13} className="condition-icon icon-temp" />,
    color: '#0284c7',
  },
  salinity_ppt: {
    itemClass: 'condition-salinity',
    icon: <Waves size={13} className="condition-icon icon-salinity" />,
    color: '#06b6d4',
  },
  dissolved_oxygen_mgl: {
    itemClass: 'condition-oxygen',
    icon: <Wind size={13} className="condition-icon icon-oxygen" />,
    color: '#8b5cf6',
  },
  ph: {
    itemClass: 'condition-ph',
    icon: <Droplets size={13} className="condition-icon icon-ph" />,
    color: '#f59e0b',
  },
  ammonia_mgl: {
    itemClass: 'condition-temp condition-item--wide',
    icon: <FlaskConical size={13} className="condition-icon icon-temp" />,
    color: '#0d9488',
    wide: true,
  },
};

export const CurrentConditionsCard: React.FC<CurrentConditionsCardProps> = ({
  current,
  liveStream5s = [],
  history24h,
  onViewDetails,
}) => {
  const [sparkMode, setSparkMode] = useState<'5s' | '24h'>('5s');
  const doSat = doPercent(current.values);

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
    if (trend === 'up') return <TrendingUp size={11} className="trend-icon trend-up" />;
    if (trend === 'down') return <TrendingDown size={11} className="trend-icon trend-down" />;
    return <Minus size={11} className="trend-icon trend-stable" />;
  };

  return (
    <div className="bento-card current-conditions-card">
      <div className="bento-card-header">
        <div className="card-title-with-info">
          <Droplets size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
          <h3 className="bento-card-title">Current Conditions (5 Sensors)</h3>
        </div>

        <div className="spark-mode-switch" role="group" aria-label="Sparkline window">
          <button
            type="button"
            className={`spark-mode-btn ${sparkMode === '5s' ? 'active' : ''}`}
            onClick={() => setSparkMode('5s')}
            title={`Show 5-second live telemetry stream sparklines (Latest: ${formatTimeSeconds(current.t)} GMT+7)`}
          >
            <span className="live-stream-pill__dot" />
            <span>5s</span>
          </button>
          <button
            type="button"
            className={`spark-mode-btn ${sparkMode === '24h' ? 'active' : ''}`}
            onClick={() => setSparkMode('24h')}
            title="Show 24-hour 30-minute median sparklines"
          >
            <span>24h</span>
          </button>
        </div>
      </div>

      {/* 5 Parameters (§4.1: temperature_c, salinity_ppt, dissolved_oxygen_mgl, ph, ammonia_mgl) */}
      <div className="current-conditions-grid current-conditions-grid--five">
        {SENSORS.map((key) => {
          const info = SENSOR_INFO[key];
          const style = SENSOR_STYLE[key];
          const suit = current.assessment.perSensor[key];
          const stLabel = sensorStatus(suit);
          const stKey = bentoStatusKey(stLabel);
          const trend = computeTrend(key);
          const series = activeSeriesPoints.map((p) => p.values[key]);

          return (
            <div key={key} className={`condition-item ${style.itemClass}`}>
              <div className="condition-item-content">
                <div className="condition-item-top">
                  <span className="condition-label" title={info.source}>
                    {style.icon}
                    {info.shortLabel}
                  </span>
                  <div className="condition-meta-right">
                    <span
                      className="condition-trend-wrap"
                      title={`${sparkMode === '5s' ? '5-sec' : '30-min'} trend: ${trend}`}
                    >
                      {renderTrendIcon(trend)}
                    </span>
                    <span
                      className={`condition-status-dot dot-${stKey}`}
                      title={`Status: ${stLabel} (μ = ${suit != null ? suit.toFixed(2) : '—'})`}
                    />
                  </div>
                </div>

                <div className="condition-val-group">
                  <span className="condition-val">{formatValue(key, current.values[key])}</span>
                  <span className="condition-unit">
                    {info.unit}
                    {key === 'dissolved_oxygen_mgl' && doSat != null
                      ? ` (${doSat.toFixed(0)}% sat)`
                      : ''}
                  </span>
                </div>

                <div className="condition-bottom-row">
                  <span className={`condition-status-pill status-${stKey}`}>{stLabel}</span>
                  <div className="condition-sparkline-wrap">
                    <MiniSparkline values={series} color={style.color} statusKey={stKey} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn-bento-dark" onClick={onViewDetails}>
        <span>View Detailed Water Quality &amp; Interactive Chart</span>
        <ArrowUpRight size={13} className="btn-bento-arrow" />
      </button>
    </div>
  );
};
