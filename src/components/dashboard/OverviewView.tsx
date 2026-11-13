'use client';

import React from 'react';
import {
  TrendingUp,
  Database,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Clock,
} from 'lucide-react';
import type { Snapshot } from '@/app/lib/data';
import { bentoStatusKey, formatPercent, formatTime, formatValue } from '@/app/lib/format';
import { SENSOR_INFO, doPercent, type PondVisualMode } from '@/app/lib/water';
import { CurrentConditionsCard } from '@/components/dashboard/CurrentConditionsCard';
import { BentoAlertsList } from '@/components/dashboard/BentoAlertsList';
import { PondHeroVisualizer } from '@/components/dashboard/PondHeroVisualizer';
import { BentoStockMetricsCard } from '@/components/dashboard/BentoStockMetricsCard';

interface OverviewViewProps {
  snapshot: Snapshot;
  visualMode: PondVisualMode;
  onVisualModeChange: (mode: PondVisualMode) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  livePolling: boolean;
  onToggleLivePolling: () => void;
  secondsUntilNextPoll: number;
  onNavigateToForecast: () => void;
  onNavigateToWaterQuality: () => void;
  onNavigateToAlerts: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  snapshot,
  visualMode,
  onVisualModeChange,
  onRefresh,
  isRefreshing,
  livePolling,
  onToggleLivePolling,
  secondsUntilNextPoll,
  onNavigateToForecast,
  onNavigateToWaterQuality,
  onNavigateToAlerts,
}) => {
  const fc = snapshot.forecast;
  const steps = fc?.steps ?? [];
  const horizonTiles =
    steps.length > 0
      ? [
          { label: '+30 Min', pt: steps[0] },
          { label: '+1 Hour', pt: steps[Math.min(1, steps.length - 1)] },
          { label: '+3 Hours', pt: steps[Math.min(5, steps.length - 1)] },
          { label: '+6 Hours', pt: steps[Math.min(11, steps.length - 1)] },
        ]
      : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '8px' }}>
      {/* 3-Column Bento Grid Layout */}
      <div className="bento-dashboard-layout">
        {/* Column 1 (Left): Current Conditions (5 Sensors) + Threshold Alerts */}
        <div className="bento-col bento-col-left">
          <CurrentConditionsCard
            current={snapshot.current}
            liveStream5s={snapshot.liveStream5s}
            history24h={snapshot.history24h}
            onViewDetails={onNavigateToWaterQuality}
          />

          <BentoAlertsList
            alerts={snapshot.alerts}
            offline={snapshot.offline}
            mode={snapshot.mode}
            onNavigateToAlerts={onNavigateToAlerts}
          />
        </div>

        {/* Column 2 (Center Hero): 3D Isometric Pond (Static / Video / Off / 5s Live & 24h Chart) */}
        <div className="bento-col bento-col-center">
          <PondHeroVisualizer
            mode={snapshot.mode}
            offline={snapshot.offline}
            lastReadingAt={snapshot.lastReadingAt}
            visualMode={visualMode}
            onVisualModeChange={onVisualModeChange}
            liveStream5s={snapshot.liveStream5s}
            history24h={snapshot.history24h}
            history7d={snapshot.history7d}
            forecastSteps={snapshot.forecast?.steps.slice(0, 6)}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Column 3 (Right): Fuzzy Suitability & FWQI, 4-Horizon Forecast Matrix, Data Quality & 5s Sync */}
        <div className="bento-col bento-col-right">
          <BentoStockMetricsCard current={snapshot.current} />

          {/* Middle Right Bento Card: Multi-Horizon Forecast Matrix (+30m, +1h, +3h, +6h) */}
          <div className="bento-card consumption-card consumption-card-compact bento-forecast-mini">
            <div className="consumption-compact-header">
              <div className="card-title-with-info">
                <TrendingUp size={13} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="bento-card-title">Ahead Forecast (+30m to +6h)</h3>
              </div>
              <button
                type="button"
                onClick={onNavigateToForecast}
                className="consumption-pln-badge"
                style={{ cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                title="Open Full Forecast & Statistical Model Benchmarks"
              >
                <span>Benchmarks</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            {horizonTiles.length > 0 ? (
              <>
                <div className="bento-forecast-mini__grid">
                  {horizonTiles.map(({ label, pt }) => {
                    const stKey = bentoStatusKey(pt.assessment.status);
                    const lim = pt.assessment.limiting
                      ? SENSOR_INFO[pt.assessment.limiting].shortLabel
                      : 'All optimal';
                    const doSat = doPercent(pt.values);
                    const fwqiStr =
                      pt.assessment.fwqi != null ? `FWQI ${pt.assessment.fwqi.toFixed(0)}` : formatPercent(pt.assessment.suitability);
                    return (
                      <div
                        key={label}
                        className="bento-forecast-mini__tile"
                        onClick={onNavigateToForecast}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="bento-forecast-mini__top">
                          <span>
                            {label} <small style={{ fontWeight: 500, opacity: 0.8 }}>({formatTime(pt.t)})</small>
                          </span>
                          <span className={`condition-status-dot dot-${stKey}`} />
                        </div>
                        <div className="bento-forecast-mini__status-row">
                          <span className="bento-forecast-mini__status">{pt.assessment.status}</span>
                          <span className="bento-forecast-mini__sub">
                            {fwqiStr} · {lim}
                          </span>
                        </div>
                        <div className="bento-forecast-mini__metrics">
                          <span>{formatValue('temperature_c', pt.values.temperature_c)}°C</span>
                          <span>·</span>
                          <span>
                            {doSat != null
                              ? `${doSat.toFixed(0)}% DO`
                              : `${formatValue('dissolved_oxygen_mgl', pt.values.dissolved_oxygen_mgl)} mg/L`}
                          </span>
                          <span>·</span>
                          <span>{formatValue('turbidity_ntu', pt.values.turbidity_ntu)} NTU</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bento-forecast-mini__footer">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    30m Medians → SARIMA / VAR+Harmonics
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Origin {fc ? formatTime(fc.origin) : '—'} GMT+7
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Run <code>python src/app/(core)/forecast.py</code> to generate forecasts.
              </div>
            )}
          </div>

          {/* Bottom Right Bento Card: Telemetry Data Quality + 5s Live Stream Controls */}
          <div className="bento-card bento-controls-card">
            <div className="bento-card-header">
              <div className="card-title-with-info">
                <Database size={13} style={{ color: 'var(--text-secondary)' }} />
                <h3 className="bento-card-title">Data Quality &amp; 5s Stream</h3>
              </div>
              <span
                className="stock-metric-target-tag"
                title={snapshot.quality.sourceFile}
              >
                {snapshot.mode === 'live' ? 'readings.csv' : 'placeholder_v2.csv'}
              </span>
            </div>

            <div
              className="bento-controls-minimal-row"
              style={{ justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
            >
              <div style={{ fontSize: '11.2px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {snapshot.quality.spacingGuardOk ? (
                    <ShieldCheck size={12} style={{ color: 'var(--status-normal)' }} />
                  ) : (
                    <AlertTriangle size={12} style={{ color: 'var(--status-critical)' }} />
                  )}
                  <span>
                    5s Live Monitor · 30m Forecast Bins
                  </span>
                </div>
                <div>
                  Interpolated (24h):{' '}
                  <strong>
                    {snapshot.quality.interpolatedBins24h}/{snapshot.quality.totalBins24h} (
                    {snapshot.quality.interpolatedPct24h}%)
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  type="button"
                  className={`bento-action-btn-mini ${livePolling ? 'btn-live-active' : ''}`}
                  onClick={onToggleLivePolling}
                  title={
                    livePolling
                      ? 'Pause 5-second automatic telemetry refresh'
                      : 'Resume 5-second automatic telemetry refresh'
                  }
                >
                  {livePolling ? <Pause size={10} /> : <Play size={10} />}
                  <span>{livePolling ? `5s (${secondsUntilNextPoll}s)` : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  className="bento-action-btn-mini btn-refresh"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Refresh Server Telemetry Snapshot Now"
                >
                  <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
