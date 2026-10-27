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
import type { PondVisualMode } from '@/app/lib/water';
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
}) => {
  const [chartOverlayRange, setChartOverlayRange] = useState<ChartTimeRange | null>(null);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const showChartOverlay = chartOverlayRange !== null;

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
    <div className="pond-hero-container">
      {/* Top-Right Floating Controls: 3-Way Media Toggle + 5s Live Chart + 24h Forecast Chart + Sync */}
      <div className="pond-floating-controls">
        <div className="pond-toggle-glass-pill" role="group" aria-label="Pond Visualizer Mode">
          <button
            type="button"
            className={`pond-toggle-sub-btn ${!showChartOverlay && visualMode === 'image' ? 'active' : ''}`}
            onClick={() => {
              setChartOverlayRange(null);
              onVisualModeChange('image');
            }}
            title="Static 3D Render (Lightest, Default)"
          >
            <ImageIcon size={13} />
            <span>Static 3D</span>
          </button>

          <button
            type="button"
            className={`pond-toggle-sub-btn ${!showChartOverlay && visualMode === 'video' ? 'active' : ''}`}
            onClick={() => {
              setChartOverlayRange(null);
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
            className={`pond-toggle-sub-btn ${!showChartOverlay && visualMode === 'off' ? 'active' : ''}`}
            onClick={() => {
              setChartOverlayRange(null);
              onVisualModeChange('off');
            }}
            title="Turn Off 3D Media (Minimal Mode)"
          >
            <EyeOff size={13} />
            <span>Off</span>
          </button>

          <button
            type="button"
            className={`pond-toggle-sub-btn ${chartOverlayRange === '5s' ? 'active' : ''}`}
            onClick={() =>
              setChartOverlayRange((prev) => (prev === '5s' ? null : '5s'))
            }
            title="Real-Time 5-Second Live Telemetry Graph Overlay"
          >
            <Activity size={13} />
            <span>5s Live Graph</span>
          </button>

          <button
            type="button"
            className={`pond-toggle-sub-btn ${chartOverlayRange === '24h' ? 'active' : ''}`}
            onClick={() =>
              setChartOverlayRange((prev) => (prev === '24h' ? null : '24h'))
            }
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

      {/* Main Pond Visual Viewport */}
      <div className="pond-visual-viewport">
        <div className={`pond-3d-wrapper ${showChartOverlay ? 'chart-mode-dimmed' : ''}`}>
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
                <p style={{ fontSize: '12.5px', maxWidth: '340px', margin: 0 }}>
                  Switch to <strong>Static 3D</strong>, <strong>Video</strong>,{' '}
                  <strong>5s Live Graph</strong>, or <strong>24h Chart</strong> in the top-right pill at any time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Chart Overlay (5s Live Stream / 24h 30-min medians + forecast / 7d) */}
        {showChartOverlay && (
          <div className="pond-chart-wrapper" style={{ overflowY: 'auto', padding: '52px 14px 110px' }}>
            <TrendChart
              key={chartOverlayRange}
              history={history24h}
              liveStream5s={liveStream5s}
              history7d={history7d}
              forecastSteps={forecastSteps}
              defaultRange={chartOverlayRange ?? '5s'}
              compact
            />
          </div>
        )}

        {/* Seamless Glassmorphism Identity Dock (Single Campus Holding Tank per PLANS.md §1 & §2) */}
        <div className="pond-seamless-identity-overlay">
          <div className="pond-blend-left">
            <div className="pond-badge-avatar">
              <Waves size={20} />
            </div>

            <div className="pond-blend-identity-text">
              <div className="pond-title-interactive-row">
                <h2 className="pond-seamless-title">Campus Holding Tank</h2>

                <span
                  className={`pond-live-indicator-pill ${mode === 'placeholder' ? 'pill-demo' : 'pill-live'}`}
                  title={
                    mode === 'placeholder'
                      ? 'Synthetic placeholder telemetry (Rule R1)'
                      : 'Live ESP32 sensor telemetry'
                  }
                >
                  <span
                    className="live-dot"
                    style={{ background: isConnected ? '#10b981' : '#ef4444' }}
                  />
                  {mode === 'placeholder' ? 'PLACEHOLDER · 5s STREAM' : 'LIVE · 5s STREAM'}
                </span>
              </div>

              <div className="pond-subspecies-text">
                Marine Lobster (<em>Panulirus spp.</em> — exact species <code>NEEDS_INFO</code>)
              </div>

              <div className="pond-meta-location-row">
                <MapPin size={12} className="meta-pin-icon" />
                <span>University Campus · Cemented Tank with PVC Shelters · 24/7 Blower &amp; Skimmer</span>
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
    </div>
  );
};
