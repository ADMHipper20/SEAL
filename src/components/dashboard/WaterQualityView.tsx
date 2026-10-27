'use client';

import React, { useState } from 'react';
import type { Point } from '@/app/lib/data';
import { formatDateTimeSecondsGmt7 } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, type SensorKey } from '@/app/lib/water';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { TrendChart } from '@/components/dashboard/TrendChart';

interface WaterQualityViewProps {
  current: Point;
  liveStream5s?: Point[];
  history24h: Point[];
  history7d?: Point[];
  forecastSteps?: Point[];
}

export const WaterQualityView: React.FC<WaterQualityViewProps> = ({
  current,
  liveStream5s = [],
  history24h,
  history7d = [],
  forecastSteps,
}) => {
  const [selectedKey, setSelectedKey] = useState<SensorKey>('temperature_c');
  const info = SENSOR_INFO[selectedKey];
  const [a, b, c, d] = info.mf;
  const fmtBound = (x: number) =>
    !Number.isFinite(x) ? (x < 0 ? '−∞' : '+∞') : String(x);

  return (
    <div className="water-quality-view">
      {/* Header */}
      <div className="water-quality-view__header">
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Water-Quality Parameter Analysis (5 Sensors)
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            Real-time 5-second live telemetry monitoring &amp; 30-minute median literature suitability functions (GMT+7)
          </p>
        </div>

        <div className="live-stream-pill" title="Latest 5-second telemetry tick timestamp">
          <span className="live-stream-pill__dot" />
          <span>Latest 5s Tick: {formatDateTimeSecondsGmt7(current.t)}</span>
        </div>
      </div>

      {/* 5 Sensor Parameter Cards (Fixed 5-column responsive grid) */}
      <div className="water-quality-view__sensors-grid">
        {SENSORS.map((sensor) => (
          <SensorCard
            key={sensor}
            sensor={sensor}
            values={current.values}
            suitability={current.assessment.perSensor[sensor]}
            trend={
              liveStream5s.length >= 12
                ? liveStream5s.slice(-24).map((pt) => pt.values[sensor])
                : history24h.map((pt) => pt.values[sensor])
            }
          />
        ))}
      </div>

      {/* Interactive Telemetry & Forecast Chart (Supports 5s Live Stream, 24h + Forecast, and 7d) */}
      <TrendChart
        history={history24h}
        liveStream5s={liveStream5s}
        history7d={history7d}
        forecastSteps={forecastSteps}
        defaultRange="5s"
      />

      {/* Literature-Based Fuzzy Specification Reference — Fixed 100% Width Container */}
      <div className="glass-panel fuzzy-spec-card">
        <div className="fuzzy-spec-card__header">
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Literature-Based Fuzzy Suitability Specification
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Trapezoid (zero, full, full, zero) · Overall suitability = MIN over the five parameters (Rule D5)
            </p>
          </div>

          <div className="param-tabs-row" role="tablist" aria-label="Inspect parameter fuzzy specification">
            {SENSORS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={selectedKey === k}
                className={`param-tab-btn ${selectedKey === k ? 'active' : ''}`}
                onClick={() => setSelectedKey(k)}
              >
                {SENSOR_INFO[k].shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Fixed 4-Column Specification Box */}
        <div className="fuzzy-spec-card__grid">
          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Full-Suitability Range (μ = 1)</div>
            <div className="fuzzy-spec-card__val" style={{ color: 'var(--status-normal-text)' }}>
              {info.optimalRangeText}
            </div>
          </div>

          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Tolerance Zero-Points (μ = 0)</div>
            <div className="fuzzy-spec-card__val" style={{ color: 'var(--text-primary)' }}>
              {fmtBound(a)} / {fmtBound(d)}{' '}
              {selectedKey === 'dissolved_oxygen_mgl' ? '% sat.' : info.unit}
            </div>
          </div>

          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Trapezoid (a, b, c, d)</div>
            <div
              className="fuzzy-spec-card__val"
              style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              ({fmtBound(a)}, {fmtBound(b)}, {fmtBound(c)}, {fmtBound(d)})
            </div>
          </div>

          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Monitoring vs. Forecast</div>
            <div className="fuzzy-spec-card__val" style={{ fontSize: '0.92rem' }}>
              5s Live Stream · 30m Median Bins
            </div>
          </div>
        </div>

        {/* Fixed-Width Citation Box (Clean Neutral Border) */}
        <div className="fuzzy-spec-card__citation">
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>
              Published Reference Source ({info.label}):{' '}
            </strong>
            <span>{info.source}</span>
          </div>
          {info.needsSource && (
            <div>
              <span className="needs-source-badge">{info.needsSource}</span>
            </div>
          )}
        </div>

        {/* Fixed-Layout All-5-Sensors Reference Matrix */}
        <div className="forecast-view__table-wrap">
          <table className="forecast-view__table fuzzy-spec-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Parameter</th>
                <th style={{ width: '18%' }}>Optimum (μ = 1)</th>
                <th style={{ width: '22%' }}>Trapezoid (a, b, c, d)</th>
                <th style={{ width: '40%' }}>Published Literature Reference</th>
              </tr>
            </thead>
            <tbody>
              {SENSORS.map((k) => {
                const sInfo = SENSOR_INFO[k];
                const [sa, sb, sc, sd] = sInfo.mf;
                const active = k === selectedKey;
                return (
                  <tr
                    key={k}
                    className={active ? 'forecast-view__row-selected' : undefined}
                    onClick={() => setSelectedKey(k)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700 }}>{sInfo.label}</td>
                    <td style={{ color: 'var(--status-normal-text)', fontWeight: 600 }}>
                      {sInfo.optimalRangeText}
                    </td>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '12px' }}>
                      ({fmtBound(sa)}, {fmtBound(sb)}, {fmtBound(sc)}, {fmtBound(sd)})
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {sInfo.source}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
