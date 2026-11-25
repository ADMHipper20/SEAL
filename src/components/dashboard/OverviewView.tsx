'use client';

import React, { useState } from 'react';
import {
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
import { SENSOR_INFO, type PondVisualMode, type SensorKey } from '@/app/lib/water';
import { CurrentConditionsCard } from '@/components/dashboard/CurrentConditionsCard';
import { BentoAlertsList } from '@/components/dashboard/BentoAlertsList';
import { PondHeroVisualizer } from '@/components/dashboard/PondHeroVisualizer';
import { BentoStockMetricsCard } from '@/components/dashboard/BentoStockMetricsCard';
import { TrendChart, type ChartTimeRange } from '@/components/dashboard/TrendChart';

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
  const [selectedSensor, setSelectedSensor] = useState<SensorKey>('temperature_c');
  // Shared time-range state ('5s' | '24h' | '7d') synced across CurrentConditionsCard, PondHero, and TrendChart
  const [chartRange, setChartRange] = useState<ChartTimeRange>('5s');
  // Controls whether the PondHero graph overlay is open (opens automatically when a sensor card is clicked)
  const [heroChartOpen, setHeroChartOpen] = useState<boolean>(false);

  const sparkWindow: '5s' | '24h' = chartRange === '5s' ? '5s' : '24h';

  const handleSelectSensorFromShelf = (sensor: SensorKey, activeSparkWindow: '5s' | '24h') => {
    setSelectedSensor(sensor);
    setChartRange(activeSparkWindow);
    setHeroChartOpen(true);
  };

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
    <div className="overview-page">
      {/* 1. FULL-BLEED TOP POND HERO STAGE (Generous vertical height + smooth bottom fade) */}
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
        selectedSensor={selectedSensor}
        onSelectSensor={setSelectedSensor}
        activeRange={chartRange}
        onRangeChange={setChartRange}
        chartOverlayOpen={heroChartOpen}
        onChartOverlayOpenChange={setHeroChartOpen}
      />

      {/* 2. SCROLLABLE TELEMETRY SHEET BELOW THE POND HERO FADE */}
      <div className="overview-sheet">
        {/* A. 3-Sensor Current Conditions Shelf (Clicking any sensor opens its 5s or 24h graph based on current state) */}
        <CurrentConditionsCard
          current={snapshot.current}
          liveStream5s={snapshot.liveStream5s}
          history24h={snapshot.history24h}
          selectedSensor={selectedSensor}
          sparkWindow={sparkWindow}
          onSparkWindowChange={(w) => setChartRange(w)}
          onSelectSensor={handleSelectSensorFromShelf}
          onViewDetails={onNavigateToWaterQuality}
        />

        {/* B. Compact Single-Row Fuzzy Suitability Bar */}
        <BentoStockMetricsCard
          current={snapshot.current}
          selectedSensor={selectedSensor}
          onSelectSensor={(s) => {
            setSelectedSensor(s);
            setHeroChartOpen(true);
          }}
        />

        {/* C. Interactive Trend Chart (Controlled by selectedSensor AND chartRange: 5s / 24h / 7d) */}
        <div className="overview-chart-section">
          <TrendChart
            history={snapshot.history24h}
            liveStream5s={snapshot.liveStream5s}
            history7d={snapshot.history7d}
            forecastSteps={snapshot.forecast?.steps.slice(0, 6)}
            range={chartRange}
            onRangeChange={setChartRange}
            selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor}
          />
        </div>

        {/* D. Two-Column Lower Analytics Grid: Ahead Forecast + Threshold Alerts */}
        <div className="overview-lower-grid">
          {/* Left Panel: Ahead Forecast (+30m to +6h) & Data Quality */}
          <section className="bento-card overview-panel" aria-label="Ahead Forecast and Data Quality">
            <div className="overview-panel__header">
              <div>
                <h2 className="overview-panel__title">Ahead Forecast (+30m to +6h)</h2>
                <span className="overview-panel__subtitle">
                  30-min medians → ARIMA / VAR + daily harmonics · Origin{' '}
                  {fc ? formatTime(fc.origin) : '—'} GMT+7
                </span>
              </div>
              <button
                type="button"
                onClick={onNavigateToForecast}
                className="bento-action-btn-mini"
              >
                <span>Benchmarks</span>
                <ArrowUpRight size={12} />
              </button>
            </div>

            {horizonTiles.length > 0 ? (
              <div className="forecast-list">
                {horizonTiles.map(({ label, pt }) => {
                  const stKey = bentoStatusKey(pt.assessment.status);
                  const lim = pt.assessment.limiting
                    ? SENSOR_INFO[pt.assessment.limiting].shortLabel
                    : 'All optimal';
                  return (
                    <div
                      key={label}
                      className="forecast-row"
                      onClick={onNavigateToForecast}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigateToForecast();
                        }
                      }}
                    >
                      <div className="forecast-row__horizon">
                        <strong>{label}</strong>
                        <span>{formatTime(pt.t)} GMT+7</span>
                      </div>

                      <div className="forecast-row__values">
                        <span>{formatValue('temperature_c', pt.values.temperature_c)}°C</span>
                        <span className="forecast-row__sep">·</span>
                        <span>pH {formatValue('ph', pt.values.ph)}</span>
                        <span className="forecast-row__sep">·</span>
                        <span>{formatValue('turbidity_ntu', pt.values.turbidity_ntu)} NTU</span>
                      </div>

                      <div className="forecast-row__status">
                        <span className="forecast-row__lim">
                          μ={formatPercent(pt.assessment.suitability)} ({lim})
                        </span>
                        <span className={`condition-status-pill status-${stKey}`}>
                          {pt.assessment.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Run <code>python src/app/(core)/forecast.py</code> to generate forecasts.
              </p>
            )}

            {/* Data Quality & 5s Stream Footer */}
            <div className="quality-bar">
              <div className="quality-bar__info">
                {snapshot.quality.spacingGuardOk ? (
                  <ShieldCheck size={14} style={{ color: 'var(--status-normal)', flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: 'var(--status-critical)', flexShrink: 0 }} />
                )}
                <span>
                  <strong>{snapshot.mode === 'live' ? 'readings.csv' : 'placeholder_3sensors.csv'}</strong>
                  {' · '}Interpolated 24h: {snapshot.quality.interpolatedBins24h}/
                  {snapshot.quality.totalBins24h} ({snapshot.quality.interpolatedPct24h}%)
                </span>
              </div>

              <div className="quality-bar__actions">
                <button
                  type="button"
                  className={`bento-action-btn-mini ${livePolling ? 'btn-live-active' : ''}`}
                  onClick={onToggleLivePolling}
                >
                  {livePolling ? <Pause size={11} /> : <Play size={11} />}
                  <span>{livePolling ? `5s (${secondsUntilNextPoll}s)` : 'Paused'}</span>
                </button>
                <button
                  type="button"
                  className="bento-action-btn-mini"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Sync</span>
                </button>
                <span className="quality-bar__tz">
                  <Clock size={11} /> GMT+7
                </span>
              </div>
            </div>
          </section>

          {/* Right Panel: Threshold Alerts */}
          <BentoAlertsList
            alerts={snapshot.alerts}
            offline={snapshot.offline}
            mode={snapshot.mode}
            onNavigateToAlerts={onNavigateToAlerts}
          />
        </div>
      </div>
    </div>
  );
};
