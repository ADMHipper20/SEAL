'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  BarChart2,
  Activity,
  Image as ImageIcon,
  Film,
  EyeOff,
  MapPin,
  Clock,
  Waves,
} from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { formatDateTimeSecondsGmt7 } from '@/app/lib/format';
import { TARGET_SPECIES, type PondVisualMode, type SensorKey } from '@/app/lib/water';
import { PondWaterOverlay } from '@/components/dashboard/PondWaterOverlay';
import { TrendChart, type ChartTimeRange } from '@/components/dashboard/TrendChart';

const pondVideoMute = '/pond_3d_mute.mp4';
const pondPoster = '/pond_video_poster.jpg';
const pondImg = '/pond_3d.png';

interface PondHeroVisualizerProps {
  mode: 'live' | 'placeholder';
  offline: boolean;
  lastReadingAt: number | null;
  visualMode: PondVisualMode;
  onVisualModeChange: (mode: PondVisualMode) => void;
  liveStream5s?: Point[];
  history24h: Point[];
  history7d?: Point[];
  forecastSteps?: Point[];
  onRefresh: () => void;
  isRefreshing: boolean;
  selectedSensor?: SensorKey;
  onSelectSensor?: (sensor: SensorKey) => void;
  activeRange?: ChartTimeRange;
  onRangeChange?: (range: ChartTimeRange) => void;
  chartOverlayOpen?: boolean;
  onChartOverlayOpenChange?: (open: boolean) => void;
}

export const PondHeroVisualizer: React.FC<PondHeroVisualizerProps> = ({
  mode,
  offline,
  lastReadingAt,
  visualMode,
  onVisualModeChange,
  liveStream5s = [],
  history24h,
  history7d = [],
  forecastSteps,
  onRefresh,
  isRefreshing,
  selectedSensor,
  onSelectSensor,
  activeRange,
  onRangeChange,
  chartOverlayOpen: controlledOverlayOpen,
  onChartOverlayOpenChange,
}) => {
  const [internalOverlayOpen, setInternalOverlayOpen] = useState(false);
  const [internalOverlayRange, setInternalOverlayRange] = useState<ChartTimeRange>('5s');
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const chartOverlayOpen = controlledOverlayOpen ?? internalOverlayOpen;
  const setChartOverlayOpen = (open: boolean) => {
    setInternalOverlayOpen(open);
    onChartOverlayOpenChange?.(open);
  };

  const effectiveRange = activeRange ?? internalOverlayRange;

  const handleToggleOverlayRange = (target: '5s' | '24h') => {
    if (chartOverlayOpen && effectiveRange === target) {
      setChartOverlayOpen(false);
    } else {
      setInternalOverlayRange(target);
      onRangeChange?.(target);
      setChartOverlayOpen(true);
    }
  };

  useEffect(() => {
    if (visualMode === 'video' && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Autoplay fallback handled silently
      });
    }
  }, [visualMode]);

  const isConnected = !offline;

  return (
    <section className="pond-hero-container pond-hero--stage" aria-label="3D Holding Tank Hero">
      <div className="pond-hero__top-bar">
        {/* Top-Right Floating Controls: 3-Way Media Toggle + 5s Live Graph + 24h Chart + Sync */}
        <div className="pond-floating-controls">
          <div className="pond-toggle-glass-pill" role="group" aria-label="Pond Visualizer Mode">
            <button
              type="button"
              className={`pond-toggle-sub-btn ${!chartOverlayOpen && visualMode === 'image' ? 'active' : ''}`}
              onClick={() => {
                setChartOverlayOpen(false);
                onVisualModeChange('image');
              }}
              title="Static 3D Render (Lightest, Default)"
            >
              <ImageIcon size={13} />
              <span>Static 3D</span>
            </button>

            <button
              type="button"
              className={`pond-toggle-sub-btn ${!chartOverlayOpen && visualMode === 'video' ? 'active' : ''}`}
              onClick={() => {
                setChartOverlayOpen(false);
                setVideoError(false);
                onVisualModeChange('video');
              }}
              title="3D Animated Loop Video"
            >
              <Film size={13} />
              <span>Video</span>
            </button>

            <button
              type="button"
              className={`pond-toggle-sub-btn ${!chartOverlayOpen && visualMode === 'off' ? 'active' : ''}`}
              onClick={() => {
                setChartOverlayOpen(false);
                onVisualModeChange('off');
              }}
              title="Turn Off 3D Media (Minimal Mode)"
            >
              <EyeOff size={13} />
              <span>Off</span>
            </button>

            <button
              type="button"
              className={`pond-toggle-sub-btn ${chartOverlayOpen && effectiveRange === '5s' ? 'active' : ''}`}
              onClick={() => handleToggleOverlayRange('5s')}
              title="Real-Time 5-Second Live Telemetry Graph Overlay"
            >
              <Activity size={13} />
              <span>5s Live Graph</span>
            </button>

            <button
              type="button"
              className={`pond-toggle-sub-btn ${chartOverlayOpen && effectiveRange === '24h' ? 'active' : ''}`}
              onClick={() => handleToggleOverlayRange('24h')}
              title="24h Telemetry & Ahead Forecast Chart Overlay"
            >
              <BarChart2 size={13} />
              <span>24h Chart</span>
            </button>
          </div>

          <button
            type="button"
            className="pond-refresh-glass-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sync Telemetry Now"
            aria-label="Sync Telemetry Now"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Full-Bleed Pond Visual Viewport */}
      <div className="pond-visual-viewport">
        <div className={`pond-3d-wrapper ${chartOverlayOpen ? 'chart-mode-dimmed' : ''}`}>
          <div className="pond-3d-scene-container">
            {visualMode === 'video' && !videoError ? (
              <video
                ref={videoRef}
                src={pondVideoMute}
                poster={pondPoster}
                autoPlay
                loop
                muted
                playsInline
                className="pond-media-element pond-media-video"
                onError={() => setVideoError(true)}
                aria-label="3D Marine Lobster Holding Tank Loop"
              />
            ) : visualMode === 'image' || (visualMode === 'video' && videoError) ? (
              <>
                <img
                  src={pondImg}
                  alt="Isometric 3D Marine Lobster Holding Tank"
                  className="pond-media-element pond-media-image"
                />
                {visualMode === 'video' && videoError && <PondWaterOverlay />}
              </>
            ) : (
              <div className="pond-media-off-backdrop">
                <span className="pond-media-off-backdrop__badge">
                  <EyeOff size={14} /> 3D Media Disabled (Lightweight Mode)
                </span>
                <p style={{ fontSize: '13px', maxWidth: '380px', margin: 0 }}>
                  Switch to <strong>Static 3D</strong>, <strong>Video</strong>,{' '}
                  <strong>5s Live Graph</strong>, or <strong>24h Chart</strong> in the top-right pill at any time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Chart Overlay inside Full-Bleed Hero */}
        {chartOverlayOpen && (
          <div className="pond-chart-wrapper">
            <div className="pond-chart-inner">
              <TrendChart
                history={history24h}
                liveStream5s={liveStream5s}
                history7d={history7d}
                forecastSteps={forecastSteps}
                range={effectiveRange}
                onRangeChange={(r) => {
                  setInternalOverlayRange(r);
                  onRangeChange?.(r);
                }}
                selectedSensor={selectedSensor}
                onSelectSensor={onSelectSensor}
                compact
              />
            </div>
          </div>
        )}

        {/* Identity Dock (Positioned cleanly above the bottom fade) */}
        <div className="pond-seamless-identity-overlay pond-hero__identity">
          <div className="pond-hero__identity-inner">
            <div className="pond-blend-left">
              <div className="pond-badge-avatar">
                <Waves size={18} />
              </div>

              <div className="pond-blend-identity-text">
                <div className="pond-title-interactive-row">
                  <h1 className="pond-seamless-title">Campus Holding Tank</h1>

                  <span
                    className={`pond-live-indicator-pill ${mode === 'placeholder' ? 'pill-demo' : 'pill-live'}`}
                    title={
                      mode === 'placeholder'
                        ? 'Synthetic 3-sensor placeholder telemetry (Rule R1)'
                        : 'Live ESP32 3-sensor telemetry'
                    }
                  >
                    <span
                      className="live-dot"
                      style={{ background: isConnected ? '#1a7f37' : '#cf222e' }}
                    />
                    {mode === 'placeholder' ? 'PLACEHOLDER · 3 SENSORS' : 'LIVE · 3 SENSORS'}
                  </span>
                </div>

                <div className="pond-subspecies-text">
                  {TARGET_SPECIES.commonName} (<em>{TARGET_SPECIES.scientificName}</em>) · ESP32S CH340 + ADS1115
                </div>

                <div className="pond-meta-location-row">
                  <MapPin size={12} className="meta-pin-icon" />
                  <span>Telkom University Surabaya · 24/7 Blower &amp; Protein Skimmer · Manual Salinity Check</span>
                </div>
              </div>
            </div>

            <div className="pond-blend-metrics-group">
              <div className="pond-metric-stat">
                <div className="pond-metric-main-val">
                  5s <small>live</small> / 30m <small>fc</small>
                </div>
                <div className="pond-metric-sublabel">Monitoring vs Forecast</div>
              </div>

              <div className="pond-metric-stat stat-update">
                <div className="pond-update-header">
                  <Clock size={12} />
                  <span>Latest Tick (GMT+7)</span>
                </div>
                <div className="pond-update-val">{formatDateTimeSecondsGmt7(lastReadingAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Smooth Bottom Gradient Fade into Page Background */}
        <div className="pond-hero__fade" aria-hidden="true" />
      </div>
    </section>
  );
};
