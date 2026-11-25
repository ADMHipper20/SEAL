'use client';

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { Forecast, Point } from '@/app/lib/data';
import {
  bentoStatusKey,
  formatDateTimeGmt7,
  formatPercent,
  formatTime,
  formatValue,
} from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, TARGET_SPECIES, limitingReason } from '@/app/lib/water';
import { TrendChart } from '@/components/dashboard/TrendChart';

interface ForecastViewProps {
  history24h: Point[];
  liveStream5s?: Point[];
  history7d?: Point[];
  forecast: Forecast | null;
  mode: 'live' | 'placeholder';
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  history24h,
  liveStream5s = [],
  history7d = [],
  forecast,
  mode,
}) => {
  if (!forecast || forecast.steps.length === 0) {
    return (
      <div className="forecast-view">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Predictive Water-Quality Forecasting
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.86rem' }}>
            No forecast file found. Run <code>python src/app/(core)/forecast.py</code> to generate
            30 min – 6 h forecasts.
          </p>
        </div>
      </div>
    );
  }

  const horizonSteps = [
    { label: '+30 Min Ahead', idx: 0 },
    { label: '+1 Hour Ahead', idx: Math.min(1, forecast.steps.length - 1) },
    { label: '+3 Hours Ahead', idx: Math.min(5, forecast.steps.length - 1) },
    { label: '+6 Hours Ahead', idx: Math.min(11, forecast.steps.length - 1) },
  ];

  const counts = forecast.testSampleCounts;
  const nonOptimalTestCount = counts.Warning + counts.Critical;

  return (
    <div className="forecast-view">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
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
            3-Sensor Time-Series Forecasting (30 min – 6 h Ahead)
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            ARIMA + daily harmonics &amp; VAR + daily harmonics forecasts evaluated via literature fuzzy rules (
            <em>{TARGET_SPECIES.scientificName}</em>) · Origin:{' '}
            <strong>{formatDateTimeGmt7(forecast.origin)}</strong> (
            {mode === 'placeholder' ? 'Placeholder Data' : 'Live Telemetry'})
          </p>
        </div>
      </div>

      {/* Rule R8 Sample-size reliability notice */}
      {(counts.Critical < 30 || nonOptimalTestCount < 30) && (
        <div className="forecast-view__r8-banner" role="note">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Sample-Size Notice (Rule R8):</strong> Test split contains{' '}
            <strong>{counts.testOrigins}</strong> hourly origins (
            <code>Optimal: {counts.Optimal}</code>, <code>Warning: {counts.Warning}</code>,{' '}
            <code>Critical: {counts.Critical}</code>). Because Critical has fewer than 30 cases (
            {counts.Critical}), class-level Critical forecast scores are provisional until more real episodes are
            logged.
          </div>
        </div>
      )}

      {/* 1. Predicted Status Cards across 30 min, 1 h, 3 h, 6 h */}
      <div className="forecast-view__cards">
        {horizonSteps.map(({ label, idx }) => {
          const pt = forecast.steps[idx];
          const { status, suitability, limiting } = pt.assessment;
          const stKey = bentoStatusKey(status);

          return (
            <div key={label} className="forecast-view__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {label} ·{' '}
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 500 }}>
                    {formatTime(pt.t)}
                  </span>
                </span>
                <span className={`condition-status-pill status-${stKey}`}>{status}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                    }}
                  >
                    {formatPercent(suitability)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    min(μ)
                  </span>
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Limiting:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {limiting ? SENSOR_INFO[limiting].shortLabel : 'None'}
                  </strong>
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {limiting
                  ? limitingReason(limiting, pt.values)
                  : 'All 3 forecasted sensors remain inside their published optimum range.'}
              </p>

              <div className="forecast-view__metrics">
                {SENSORS.map((k) => (
                  <div key={k}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {SENSOR_INFO[k].shortLabel}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '12.5px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                      }}
                    >
                      {formatValue(k, pt.values[k])} {SENSOR_INFO[k].unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. 24-Hour Observed Telemetry + 6-Hour Ahead Forecast Chart */}
      <TrendChart
        history={history24h}
        liveStream5s={liveStream5s}
        history7d={history7d}
        forecastSteps={forecast.steps}
        defaultRange="24h"
      />

      {/* 3. Validation-Selected Model per Sensor */}
      <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Validation-Selected Classical Model per Sensor (3-Sensor Notebook 02)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Lowest mean MAE across 30 min, 1 h, 3 h, and 6 h horizons on the chronological 60 / 20 / 20 validation split (Rules R5–R7).
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} /> 30-min steps (48 steps/day)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {SENSORS.map((k) => (
            <div
              key={k}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {SENSOR_INFO[k].label}
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: '3px',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                {forecast.models[k] ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Status Forecast Evaluation Table vs Persistence */}
      {forecast.statusEvaluation.length > 0 && (
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Water-Quality Status Forecast Evaluation vs. Persistence Baseline (Rule R7)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Out-of-sample test set ({counts.testOrigins} origins: Optimal={counts.Optimal}, Warning={counts.Warning}, Critical={counts.Critical} · placeholder 3-sensor dataset).
            </p>
          </div>

          <div className="forecast-view__table-wrap">
            <table className="forecast-view__table">
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>Model</th>
                  <th>Status Accuracy</th>
                  <th>Macro-F1</th>
                  <th>Alerts Caught</th>
                  <th>False Alarms</th>
                  <th>Suitability MAE</th>
                </tr>
              </thead>
              <tbody>
                {forecast.statusEvaluation.map((row, i) => {
                  const isSelected =
                    row.model === 'Selected on validation' || row.model === 'Persistence';
                  return (
                    <tr
                      key={`${row.horizon}-${row.model}-${i}`}
                      className={isSelected ? 'forecast-view__row-selected' : undefined}
                    >
                      <td>{row.horizon}</td>
                      <td>
                        {row.model}
                        {row.model === 'Persistence' ? ' (Baseline)' : ''}
                      </td>
                      <td>{(row.accuracy * 100).toFixed(1)}%</td>
                      <td>{row.macroF1.toFixed(3)}</td>
                      <td>{(row.alertsCaught * 100).toFixed(1)}%</td>
                      <td>{(row.falseAlarms * 100).toFixed(1)}%</td>
                      <td>{row.suitabilityMae.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Per-Sensor Forecast Skill vs Persistence */}
      {forecast.sensorSkill.length > 0 && (
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              3-Sensor Forecast Skill vs. Persistence across Horizons (Rule R7)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Skill ≤ 0% is explicitly reported as <em>no better than persistence</em> (&ldquo;next = last value&rdquo;).
            </p>
          </div>

          <div className="forecast-view__table-wrap">
            <table className="forecast-view__table">
              <thead>
                <tr>
                  <th>Sensor</th>
                  <th>Horizon</th>
                  <th>Selected Model MAE</th>
                  <th>Selected Model RMSE</th>
                  <th>Skill vs. Persistence (%)</th>
                  <th>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {forecast.sensorSkill
                  .filter((r) => r.model === 'Selected on validation')
                  .map((r, i) => {
                    const beats = r.skillPct > 0;
                    return (
                      <tr key={`${r.sensor}-${r.horizon}-${i}`}>
                        <td style={{ fontWeight: 600 }}>{SENSOR_INFO[r.sensor]?.shortLabel ?? r.sensor}</td>
                        <td>{r.horizon}</td>
                        <td>
                          {r.mae} {SENSOR_INFO[r.sensor]?.unit}
                        </td>
                        <td>
                          {r.rmse} {SENSOR_INFO[r.sensor]?.unit}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: beats ? 'var(--status-normal-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {r.skillPct > 0 ? `+${r.skillPct.toFixed(1)}%` : `${r.skillPct.toFixed(1)}%`}
                        </td>
                        <td>
                          {beats
                            ? 'Beats persistence baseline'
                            : 'No better than persistence (skill ≤ 0%)'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
