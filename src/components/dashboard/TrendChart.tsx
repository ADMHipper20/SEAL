'use client';

import React, { useState, useMemo } from 'react';
import type { Point } from '@/app/lib/data';
import {
  bentoStatusKey,
  formatDateTimeGmt7,
  formatDateTimeSecondsGmt7,
  formatPercent,
  formatTime,
  formatTimeSeconds,
  getMonotoneAreaPath,
  getMonotoneSplinePath,
  paddedExtent,
  sensorStatus,
  statusModifier,
} from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, optimumText, type SensorKey } from '@/app/lib/water';

export type ChartTimeRange = '5s' | '24h' | '7d';

interface TrendChartProps {
  history: Point[];
  liveStream5s?: Point[];
  history7d?: Point[];
  forecastSteps?: Point[];
  defaultRange?: ChartTimeRange;
  /** Optional controlled time range (synced with CurrentConditionsCard 5s / 24h state). */
  range?: ChartTimeRange;
  onRangeChange?: (range: ChartTimeRange) => void;
  compact?: boolean;
  /** Optional controlled sensor selection (bound to Current Conditions cards on Overview). */
  selectedSensor?: SensorKey;
  onSelectSensor?: (sensor: SensorKey) => void;
}

const W = 760;
const H = 236;
const PAD_L = 54;
const PAD_R = 24;
const PAD_T = 22;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

interface InteractivePoint {
  idx: number;
  x: number;
  y: number;
  val: number;
  point: Point;
  kind: 'live5s' | 'observed30m' | 'forecast';
  horizonLabel?: string;
}

export function TrendChart({
  history,
  liveStream5s = [],
  history7d = [],
  forecastSteps = [],
  defaultRange = '5s',
  range: controlledRange,
  onRangeChange,
  compact = false,
  selectedSensor,
  onSelectSensor,
}: TrendChartProps) {
  const [internalSelected, setInternalSelected] = useState<SensorKey>('temperature_c');
  const [internalRange, setInternalRange] = useState<ChartTimeRange>(defaultRange);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const selected = selectedSensor ?? internalSelected;
  const range = controlledRange ?? internalRange;

  const handleSelectSensor = (key: SensorKey) => {
    setInternalSelected(key);
    onSelectSensor?.(key);
    setHoverIndex(null);
  };

  const handleSelectRange = (nextRange: ChartTimeRange) => {
    setInternalRange(nextRange);
    onRangeChange?.(nextRange);
    setHoverIndex(null);
  };

  const info = SENSOR_INFO[selected];
  const observedColor = 'var(--accent-primary)';
  const forecastColor = 'var(--text-secondary)';

  const activeHistory = useMemo(() => {
    if (range === '5s' && liveStream5s.length > 0) return liveStream5s;
    if (range === '7d' && history7d.length > 0) return history7d;
    return history;
  }, [range, liveStream5s, history7d, history]);

  const activeForecast = useMemo(() => {
    return range === '24h' ? forecastSteps : [];
  }, [range, forecastSteps]);

  const allSeriesPoints = useMemo(
    () => [...activeHistory, ...activeForecast],
    [activeHistory, activeForecast],
  );

  const histVals = useMemo(
    () => activeHistory.map((p) => p.values[selected]),
    [activeHistory, selected],
  );
  const fcVals = useMemo(
    () => activeForecast.map((p) => p.values[selected]),
    [activeForecast, selected],
  );

  const allVals = useMemo(() => [...histVals, ...fcVals], [histVals, fcVals]);
  const [lo, hi] = useMemo(() => paddedExtent(allVals, 0.18), [allVals]);

  const totalSteps = Math.max(allSeriesPoints.length - 1, 1);
  const xOf = (i: number) => PAD_L + (i / totalSteps) * PLOT_W;
  const yOf = (v: number) => PAD_T + PLOT_H - ((v - lo) / (hi - lo || 1)) * PLOT_H;

  const histCoords = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    histVals.forEach((v, i) => {
      if (v != null && Number.isFinite(v)) {
        pts.push({ x: xOf(i), y: yOf(v) });
      }
    });
    return pts;
  }, [histVals, totalSteps, lo, hi]);

  const histSplinePath = useMemo(() => getMonotoneSplinePath(histCoords), [histCoords]);
  const histAreaPath = useMemo(
    () => getMonotoneAreaPath(histCoords, PAD_T + PLOT_H),
    [histCoords],
  );

  const lastHistIdx = activeHistory.length - 1;
  const lastHistVal = lastHistIdx >= 0 ? histVals[lastHistIdx] : null;
  const fcCoords = useMemo(() => {
    if (activeForecast.length === 0) return [];
    const pts: { x: number; y: number }[] = [];
    if (lastHistVal != null && Number.isFinite(lastHistVal)) {
      pts.push({ x: xOf(lastHistIdx), y: yOf(lastHistVal) });
    }
    fcVals.forEach((v, j) => {
      if (v != null && Number.isFinite(v)) {
        pts.push({ x: xOf(activeHistory.length + j), y: yOf(v) });
      }
    });
    return pts;
  }, [activeForecast, lastHistVal, lastHistIdx, fcVals, activeHistory.length, totalSteps, lo, hi]);

  const fcSplinePath = useMemo(() => getMonotoneSplinePath(fcCoords), [fcCoords]);

  const interactivePoints = useMemo<InteractivePoint[]>(() => {
    const pts: InteractivePoint[] = [];
    activeHistory.forEach((pt, i) => {
      const v = pt.values[selected];
      if (v != null && Number.isFinite(v)) {
        pts.push({
          idx: pts.length,
          x: xOf(i),
          y: yOf(v),
          val: v,
          point: pt,
          kind: range === '5s' ? 'live5s' : 'observed30m',
        });
      }
    });
    activeForecast.forEach((pt, j) => {
      const v = pt.values[selected];
      if (v != null && Number.isFinite(v)) {
        const minsAhead = (j + 1) * 30;
        const horizonLabel =
          minsAhead % 60 === 0 ? `+${minsAhead / 60}h Forecast` : `+${minsAhead}m Forecast`;
        pts.push({
          idx: pts.length,
          x: xOf(activeHistory.length + j),
          y: yOf(v),
          val: v,
          point: pt,
          kind: 'forecast',
          horizonLabel,
        });
      }
    });
    return pts;
  }, [activeHistory, activeForecast, selected, range, totalSteps, lo, hi]);

  const stats = useMemo(() => {
    const valid = histVals.filter((v): v is number => v != null && Number.isFinite(v));
    if (valid.length === 0) return { avg: 0, min: 0, max: 0, latest: 0 };
    const sum = valid.reduce((a, b) => a + b, 0);
    return {
      avg: sum / valid.length,
      min: Math.min(...valid),
      max: Math.max(...valid),
      latest: valid[valid.length - 1],
    };
  }, [histVals]);

  const [, optLo, optHi] = info.mf;
  const bandTop = Number.isFinite(optHi)
    ? Math.max(PAD_T, Math.min(PAD_T + PLOT_H, yOf(optHi)))
    : PAD_T;
  const bandBot = Number.isFinite(optLo)
    ? Math.max(PAD_T, Math.min(PAD_T + PLOT_H, yOf(optLo)))
    : PAD_T + PLOT_H;

  const yTicks = [lo, (lo + hi) / 2, hi];

  const xTickIndices = useMemo(() => {
    if (allSeriesPoints.length === 0) return [];
    const last = allSeriesPoints.length - 1;
    const raw = [0, Math.round(last * 0.33), Math.round(last * 0.66), last];
    return raw.filter((idx, pos, arr) => idx >= 0 && idx <= last && arr.indexOf(idx) === pos);
  }, [allSeriesPoints.length]);

  const updateHoverFromClientX = (clientX: number, svgEl: SVGSVGElement) => {
    if (interactivePoints.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    const relX = ((clientX - rect.left) / Math.max(1, rect.width)) * W;
    let closestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < interactivePoints.length; i++) {
      const dist = Math.abs(interactivePoints[i].x - relX);
      if (dist < bestDist) {
        bestDist = dist;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverFromClientX(e.clientX, e.currentTarget);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      updateHoverFromClientX(e.touches[0].clientX, e.currentTarget);
    }
  };

  const hovered =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < interactivePoints.length
      ? interactivePoints[hoverIndex]
      : null;

  const hoveredSuit = hovered ? hovered.point.assessment.perSensor[selected] : null;
  const hoveredStatus = hovered ? sensorStatus(hoveredSuit) : 'Optimal';
  const hoveredStatusKey = bentoStatusKey(hoveredStatus);

  const forecastHours = Math.round((activeForecast.length * 30) / 60);

  return (
    <section className="glass-panel chart-card" style={{ padding: compact ? '14px 16px' : '16px 20px' }}>
      {/* Row 1: Title + Time Range Pills */}
      <div className="chart-header">
        <div className="chart-title-group">
          <h2>
            {range === '5s'
              ? `Real-Time 5-Second Telemetry (${info.label})`
              : range === '7d'
                ? `7-Day Telemetry Trajectory (${info.label})`
                : `24-Hour Telemetry & Forecast (${info.label})`}
          </h2>
          <p>
            {range === '5s'
              ? `5-second live stream (last 5 mins) · Optimum ${optimumText(selected)} · GMT+7`
              : `30-minute medians · Optimum ${optimumText(selected)} · GMT+7`}
          </p>
        </div>

        <div className="chart-controls-row">
          <div className="time-range-pills" role="group" aria-label="Select chart time range">
            {liveStream5s.length > 0 && (
              <button
                type="button"
                className={`range-pill-btn ${range === '5s' ? 'active' : ''}`}
                onClick={() => handleSelectRange('5s')}
              >
                Live 5s
              </button>
            )}
            <button
              type="button"
              className={`range-pill-btn ${range === '24h' ? 'active' : ''}`}
              onClick={() => handleSelectRange('24h')}
            >
              24h {forecastSteps.length > 0 ? `+ ${Math.round((forecastSteps.length * 30) / 60)}h Fc` : ''}
            </button>
            {history7d.length > 0 && (
              <button
                type="button"
                className={`range-pill-btn ${range === '7d' ? 'active' : ''}`}
                onClick={() => handleSelectRange('7d')}
              >
                7d
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Horizontal 3-Sensor Parameter Selector Tabs */}
      <div className="param-tabs-row" role="tablist" aria-label="Select sensor parameter">
        {SENSORS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected === key}
            className={`param-tab-btn ${selected === key ? 'active' : ''}`}
            onClick={() => handleSelectSensor(key)}
          >
            {SENSOR_INFO[key].shortLabel} ({SENSOR_INFO[key].unit})
          </button>
        ))}
      </div>

      {/* Interactive SVG Chart Area */}
      <div className="interactive-chart-container" style={{ height: compact ? '200px' : '225px' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={handleTouchMove}
          role="img"
          aria-label={`${info.label} interactive telemetry chart`}
        >
          {/* Non-optimal fuzzy status vertical bands */}
          {activeHistory.map((pt, i) => {
            if (pt.assessment.status === 'Optimal' || pt.assessment.status === 'No data') return null;
            const x1 = xOf(Math.max(0, i - 0.5));
            const x2 = xOf(Math.min(totalSteps, i + 0.5));
            const mod = statusModifier(pt.assessment.status);
            return (
              <rect
                key={pt.t}
                x={x1}
                y={PAD_T}
                width={Math.max(1, x2 - x1)}
                height={PLOT_H}
                fill={mod === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)'}
                opacity={mod === 'critical' ? 0.12 : 0.08}
              />
            );
          })}

          {/* Literature Optimum Band */}
          {bandBot > bandTop && (
            <rect
              x={PAD_L}
              y={bandTop}
              width={PLOT_W}
              height={bandBot - bandTop}
              fill="var(--status-normal)"
              opacity={0.07}
            />
          )}

          {/* Horizontal Y Grid Lines & Labels */}
          {yTicks.map((val, idx) => {
            const y = yOf(val);
            return (
              <g key={idx}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="var(--border-light)"
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11.5"
                  fill="var(--text-secondary)"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                >
                  {val.toFixed(info.decimals)}
                </text>
              </g>
            );
          })}

          {/* Forecast Origin Divider Line & Top Label */}
          {activeForecast.length > 0 && activeHistory.length > 0 && (
            <g>
              <rect
                x={xOf(lastHistIdx)}
                y={PAD_T}
                width={Math.max(0, W - PAD_R - xOf(lastHistIdx))}
                height={PLOT_H}
                fill="var(--text-secondary)"
                opacity="0.05"
              />
              <line
                x1={xOf(lastHistIdx)}
                x2={xOf(lastHistIdx)}
                y1={PAD_T}
                y2={PAD_T + PLOT_H}
                stroke="var(--border-medium)"
                strokeWidth="1.3"
                strokeDasharray="4 4"
              />
              <text
                x={Math.min(W - PAD_R - 4, xOf(lastHistIdx) + 6)}
                y={PAD_T + 12}
                textAnchor={xOf(lastHistIdx) > W - 135 ? 'end' : 'start'}
                fontSize="11"
                fontWeight="600"
                fill="var(--text-secondary)"
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                +{forecastHours}h Forecast →
              </text>
            </g>
          )}

          {/* Observed / 5s Live Stream Area & Monotone Spline */}
          {histAreaPath && <path d={histAreaPath} fill={observedColor} fillOpacity="0.09" />}
          {histSplinePath && (
            <path
              d={histSplinePath}
              fill="none"
              stroke={observedColor}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dashed Forecast Spline */}
          {fcSplinePath && (
            <path
              d={fcSplinePath}
              fill="none"
              stroke={forecastColor}
              strokeWidth="1.9"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Latest Observed Point Indicator in 5s Live Mode */}
          {range === '5s' && histCoords.length > 0 && hovered === null && (
            <g>
              <circle
                cx={histCoords[histCoords.length - 1].x}
                cy={histCoords[histCoords.length - 1].y}
                r="5.5"
                fill={observedColor}
                opacity="0.2"
              />
              <circle
                cx={histCoords[histCoords.length - 1].x}
                cy={histCoords[histCoords.length - 1].y}
                r="3"
                fill={observedColor}
                stroke="var(--bg-surface)"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Interactive Hover Crosshair & Point */}
          {hovered && (
            <g className="hover-elements">
              <line
                x1={hovered.x}
                y1={PAD_T}
                x2={hovered.x}
                y2={PAD_T + PLOT_H}
                stroke={hovered.kind === 'forecast' ? forecastColor : observedColor}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r="6.5"
                fill={hovered.kind === 'forecast' ? forecastColor : observedColor}
                opacity="0.2"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r="3.8"
                fill="var(--bg-surface)"
                stroke={hovered.kind === 'forecast' ? forecastColor : observedColor}
                strokeWidth="2.2"
              />
            </g>
          )}

          {/* Evenly-Spaced X-Axis Timestamp Labels */}
          {xTickIndices.map((idx, pos) => {
            const pt = allSeriesPoints[idx];
            if (!pt) return null;
            const isFirst = pos === 0;
            const isLast = pos === xTickIndices.length - 1;
            const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
            const isFcTick = idx >= activeHistory.length;
            return (
              <text
                key={idx}
                x={xOf(idx)}
                y={H - 8}
                textAnchor={anchor}
                fontSize="11"
                fill={isFcTick ? 'var(--text-primary)' : 'var(--text-secondary)'}
                fontWeight={isFcTick ? '600' : '500'}
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                {range === '5s'
                  ? formatTimeSeconds(pt.t)
                  : `${formatTime(pt.t)}${isFcTick ? ' (Fc)' : ' GMT+7'}`}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip on Hover / Drag */}
        {hovered && (
          <div
            className="chart-tooltip-floating"
            style={{
              left: `${Math.min(82, Math.max(18, (hovered.x / W) * 100))}%`,
              top: '14%',
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="tooltip-header-pill" style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span
                  className="tooltip-indicator-dot"
                  style={{ background: hovered.kind === 'forecast' ? forecastColor : observedColor }}
                />
                <span className="tooltip-param-name">{info.shortLabel}</span>
              </span>
              <span className={`tooltip-kind-badge tooltip-kind-badge--${hovered.kind}`}>
                {hovered.kind === 'forecast'
                  ? hovered.horizonLabel ?? 'Forecast'
                  : hovered.kind === 'live5s'
                    ? 'Live 5s'
                    : 'Observed'}
              </span>
            </div>

            <div className="tooltip-value-row">
              <span className="tooltip-val">{hovered.val.toFixed(info.decimals)}</span>
              <span className="tooltip-unit">{info.unit}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`condition-status-pill status-${hoveredStatusKey}`}>
                {hoveredStatus}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                μ={formatPercent(hoveredSuit)}
              </span>
            </div>

            <div className="tooltip-time">
              {range === '5s'
                ? formatDateTimeSecondsGmt7(hovered.point.t)
                : formatDateTimeGmt7(hovered.point.t)}
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics Footer */}
      <div className="chart-stats-footer">
        <div className="chart-stat-item">
          <span className="stat-label">Latest ({range === '5s' ? '5s Live' : '30m'})</span>
          <span className="stat-value">
            {stats.latest.toFixed(info.decimals)} <small>{info.unit}</small>
          </span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Average</span>
          <span className="stat-value">
            {stats.avg.toFixed(info.decimals)} <small>{info.unit}</small>
          </span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Peak (Max)</span>
          <span className="stat-value">
            {stats.max.toFixed(info.decimals)} <small>{info.unit}</small>
          </span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Low (Min)</span>
          <span className="stat-value">
            {stats.min.toFixed(info.decimals)} <small>{info.unit}</small>
          </span>
        </div>
      </div>
    </section>
  );
}
