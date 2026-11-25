'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { formatDateTimeSecondsGmt7, formatPercent } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, TARGET_SPECIES, type SensorKey } from '@/app/lib/water';
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
  const fmtBound = (x: number) => (!Number.isFinite(x) ? (x < 0 ? '−∞' : '+∞') : String(x));

  return (
    <div className="water-quality-view">
      {/* Header */}
      <div className="water-quality-view__header">
        <div>
          <h1
            style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Water-Quality Parameter Analysis — {TARGET_SPECIES.commonName} (
            <em>{TARGET_SPECIES.scientificName}</em>)
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Real-time 5-second live stream &amp; 30-minute median fuzzy suitability (Overall μ ={' '}
            {formatPercent(current.assessment.suitability)} · GMT+7)
          </p>
        </div>

        <div className="live-stream-pill" title="Latest 5-second telemetry tick timestamp">
          <span className="live-stream-pill__dot" />
          <span>Latest 5s Tick: {formatDateTimeSecondsGmt7(current.t)}</span>
        </div>
      </div>

      {/* Decision D7 Mandatory Scope Notice: 3 Automated ESP32 Sensors Only */}
      <div className="forecast-view__r8-banner" role="note">
        <Info size={16} style={{ flexShrink: 0 }} />
        <div>
          <strong>Hardware Scope (Decision D7 &amp; Rule R3):</strong> Automated ESP32S CH340 + ADS1115 telemetry
          covers <strong>3 probes only</strong>: <strong>DS18B20 (Temperature)</strong>,{' '}
          <strong>PH-4502C (pH)</strong>, and <strong>Turbidity Red Board (NTU)</strong>.{' '}
          <strong>Salinity</strong> is monitored manually via refractometer, <strong>Dissolved Oxygen</strong> is
          maintained continuously by the 24/7 campus blower, and organic/ammonia load is managed by the 24/7 protein
          skimmer. Fuzzy status reflects only these 3 monitored parameters (Rule R14).
        </div>
      </div>

      {/* 3 Automated Sensor Cards (Horizontal 3-column responsive grid; clickable to sync chart) */}
      <div className="water-quality-view__sensors-grid water-quality-view__sensors-grid--three">
        {SENSORS.map((sensor) => (
          <SensorCard
            key={sensor}
            sensor={sensor}
            values={current.values}
            suitability={current.assessment.perSensor[sensor]}
            selected={selectedKey === sensor}
            onSelect={() => setSelectedKey(sensor)}
            trend={
              liveStream5s.length >= 12
                ? liveStream5s.slice(-24).map((pt) => pt.values[sensor])
                : history24h.map((pt) => pt.values[sensor])
            }
          />
        ))}
      </div>

      {/* Interactive Telemetry & Forecast Chart */}
      <TrendChart
        history={history24h}
        liveStream5s={liveStream5s}
        history7d={history7d}
        forecastSteps={forecastSteps}
        defaultRange="5s"
        selectedSensor={selectedKey}
        onSelectSensor={setSelectedKey}
      />

      {/* Literature-Based Fuzzy Specification Reference */}
      <div className="glass-panel fuzzy-spec-card">
        <div className="fuzzy-spec-card__header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Literature-Based Fuzzy Suitability Specification (<em>{TARGET_SPECIES.scientificName}</em>)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Trapezoidal membership (a, b, c, d) · Overall suitability = MIN(μ_temp, μ_pH, μ_turbidity) (Decision D5)
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

        {/* 4-Column Specification Summary */}
        <div className="fuzzy-spec-card__grid">
          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Full-Suitability Optimum (μ = 1)</div>
            <div className="fuzzy-spec-card__val" style={{ color: 'var(--status-normal-text)' }}>
              {info.optimalRangeText}
            </div>
          </div>

          <div className="fuzzy-spec-card__cell">
            <div className="fuzzy-spec-card__label">Tolerance Zero-Points (μ = 0)</div>
            <div className="fuzzy-spec-card__val" style={{ color: 'var(--text-primary)' }}>
              {fmtBound(a)} / {fmtBound(d)} {info.unit}
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
            <div className="fuzzy-spec-card__label">Hardware Probe (EE BOM)</div>
            <div className="fuzzy-spec-card__val" style={{ fontSize: '0.88rem', whiteSpace: 'normal' }}>
              {info.probeNote}
            </div>
          </div>
        </div>

        {/* Citation Box */}
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

        {/* All-3-Sensors Reference Matrix */}
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
                    <td style={{ fontWeight: 600 }}>{sInfo.label}</td>
                    <td style={{ color: 'var(--status-normal-text)', fontWeight: 600 }}>
                      {sInfo.optimalRangeText}
                    </td>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '12.5px' }}>
                      ({fmtBound(sa)}, {fmtBound(sb)}, {fmtBound(sc)}, {fmtBound(sd)})
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
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
