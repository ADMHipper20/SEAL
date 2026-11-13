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
import { SENSORS, SENSOR_INFO, TARGET_SPECIES, doPercent, limitingReason } from '@/app/lib/water';
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
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Predictive Water-Quality Forecasting
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.84rem' }}>
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
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Classical Statistical Time-Series Forecasting (30 min – 6 h Ahead)
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            ARIMA / SARIMA (s=48) / VAR + daily harmonics forecasts passed through literature fuzzy rules ({TARGET_SPECIES.scientificName}) · Origin:{' '}
            <strong>{formatDateTimeGmt7(forecast.origin)}</strong> (
            {mode === 'placeholder' ? 'Placeholder Data' : 'Live Telemetry'})
          </p>
        </div>
      </div>

      {/* Rule R8 Sample-size reliability notice */}
      {(counts.Critical < 30 || nonOptimalTestCount < 30) && (
        <div className="forecast-view__r8-banner" role="note">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <div>
            <strong>Sample-Size Notice (Rule R8):</strong> Test split contains{' '}
            <strong>{counts.testOrigins}</strong> hourly origins (
            <code>Optimal: {counts.Optimal}</code>, <code>Warning: {counts.Warning}</code>,{' '}
            <code>Critical: {counts.Critical}</code>). Because Critical has fewer than 30 cases (
            {counts.Critical}), class-level status forecast scores are provisional until more episodes are logged.
          </div>
        </div>
      )}

      {/* 1. Predicted Status Cards across 30 min, 1 h, 3 h, 6 h */}
      <div className="forecast-view__cards">
        {horizonSteps.map(({ label, idx }) => {
          const pt = forecast.steps[idx];
          const { status, suitability, fwqi, limiting } = pt.assessment;
          const stKey = bentoStatusKey(status);
          const doSat = doPercent(pt.values);

          return (
            <div key={label} className="forecast-view__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {label} ·{' '}
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 500 }}>
                    {formatTime(pt.t)}
                  </span>
                </span>
                <span className={`condition-status-pill status-${stKey}`}>{status}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                    }}
                  >
                    {fwqi != null ? fwqi.toFixed(1) : '—'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    FWQI · min(μ)={formatPercent(suitability)}
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Limiting:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {limiting ? SENSOR_INFO[limiting].shortLabel : 'None'}
                  </strong>
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                {limiting
                  ? limitingReason(limiting, pt.values)
                  : 'All 5 forecasted sensors remain inside their published optimum range.'}
              </p>

              <div className="forecast-view__metrics">
                {SENSORS.map((k) => (
                  <div key={k}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {SENSOR_INFO[k].shortLabel}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '11.5px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                      }}
                    >
                      {formatValue(k, pt.values[k])} {SENSOR_INFO[k].unit}
                      {k === 'dissolved_oxygen_mgl' && doSat != null
                        ? ` (${doSat.toFixed(0)}%)`
                        : ''}
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

      {/* 3. Selected Classical Statistical Models per Sensor (chosen on validation MAE, Decision D12) */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Validation-Selected Classical Statistical Model per Sensor (Notebook 02 · Decision D12)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Lowest mean MAE across 30 min, 1 h, 3 h, and 6 h horizons on the chronological validation split (60 / 20 / 20). ML/DL models (LightGBM, Random Forest, GRU, LSTM, TCN) in Notebook 04 did not pass the ≥ +2.0 FWQI skill threshold on validation and are excluded (Rule R16 &amp; R17).
            </p>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} /> 30-min steps (48 steps/day)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
          {SENSORS.map((k) => (
            <div
              key={k}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {SENSOR_INFO[k].label}
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginTop: '2px',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                {forecast.models[k] ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Rule R7 & R8 Status Forecast Evaluation Table (Always compared with Persistence) */}
      {forecast.statusEvaluation.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Water-Quality Status Forecast Evaluation vs. Persistence Baseline (Notebook 02 §8)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Out-of-sample test set ({counts.testOrigins} origins: Optimal={counts.Optimal}, Warning={counts.Warning}, Critical={counts.Critical} · placeholder_v2 data).
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

      {/* 5. Rule R7 Per-Sensor Forecast Skill vs Persistence */}
      {forecast.sensorSkill.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Sensor Forecast Skill vs. Persistence across Horizons (Rule R7)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
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
                            fontWeight: 600,
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
