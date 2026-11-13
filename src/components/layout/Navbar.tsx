'use client';

import React from 'react';
import { Bell, Play, Pause, Sun, Moon, Monitor } from 'lucide-react';
import { formatTimeSeconds } from '@/app/lib/format';
import type { NavigationTab } from '@/app/lib/water';

export type ThemeMode = 'system' | 'light' | 'dark';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  unreadAlertCount: number;
  mode: 'live' | 'placeholder';
  lastReadingAt: number | null;
  livePolling: boolean;
  secondsUntilNextPoll: number;
  onToggleLivePolling: () => void;
  onNavigateToAlerts: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  unreadAlertCount,
  mode,
  lastReadingAt,
  livePolling,
  secondsUntilNextPoll,
  onToggleLivePolling,
  onNavigateToAlerts,
  themeMode,
  onThemeChange,
}) => {
  const navTabs: Array<{ id: NavigationTab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'forecast', label: 'Forecast (1h / 3h)' },
    { id: 'water_quality', label: 'Water Quality' },
    { id: 'alerts', label: 'Alerts', badge: unreadAlertCount },
    { id: 'history', label: 'History' },
    { id: 'device', label: 'Device' },
  ];

  return (
    <header className="top-bar-bento">
      {/* Left: Minimal Geometric Brand Mark + Mode Pill + 5s Live Tick Pill */}
      <div className="top-bar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="top-brand-icon-minimal"
          onClick={() => onTabChange('overview')}
          title="SEAL — Pearl Lobster (Panulirus ornatus) Tank Monitoring"
          aria-label="SEAL — Pearl Lobster (Panulirus ornatus) Tank Monitoring"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <circle cx="12" cy="7.2" r="4.0" />
            <circle cx="7.2" cy="15.5" r="4.0" />
            <circle cx="16.8" cy="15.5" r="4.0" />
          </svg>
        </button>

        {/* R1: Explicit Placeholder vs Live Data badge + GMT+7 timezone */}
        <span
          className={`top-mode-pill ${
            mode === 'live' ? 'top-mode-pill--live' : 'top-mode-pill--placeholder'
          }`}
          title={
            mode === 'live'
              ? 'Live telemetry from data/readings.csv (GMT+7 / WIB)'
              : 'Synthetic placeholder v2 data from data/sensor_log_placeholder.csv (Rule R1 · GMT+7 / WIB)'
          }
        >
          <span className="top-mode-pill__dot" />
          {mode === 'live' ? 'LIVE TELEMETRY · GMT+7' : 'PLACEHOLDER V2 · GMT+7'}
        </span>

        {/* 5-Second Live Telemetry Monitor Pill (Pause/Resume) */}
        <button
          type="button"
          className={`top-live-poll-pill ${livePolling ? 'active' : 'paused'}`}
          onClick={onToggleLivePolling}
          title={
            livePolling
              ? '5-second live telemetry monitoring active. Click to pause.'
              : '5-second live telemetry monitoring paused. Click to resume.'
          }
        >
          {livePolling ? <Pause size={10} /> : <Play size={10} />}
          <span>
            {livePolling
              ? `5s Stream · ${lastReadingAt ? formatTimeSeconds(lastReadingAt) : ''} (${secondsUntilNextPoll}s)`
              : '5s Stream Paused'}
          </span>
        </button>
      </div>

      {/* Right: Navigation Pills + Notification Bell (No Login / Profile / RBAC) */}
      <div className="top-bar-right-group">
        <nav className="top-nav-pills" aria-label="Main Navigation">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`top-pill-btn ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="top-pill-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Theme Mode Segmented Setting: System (Auto) / Light / Dark */}
        <div className="top-theme-segmented" role="radiogroup" aria-label="Theme Mode Selection">
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'system' ? 'active' : ''}`}
            onClick={() => onThemeChange('system')}
            title="System Theme (Follow device setting)"
            aria-label="System Theme"
          >
            <Monitor size={11} />
            <span>Auto</span>
          </button>
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => onThemeChange('light')}
            title="Light Theme"
            aria-label="Light Theme"
          >
            <Sun size={11} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => onThemeChange('dark')}
            title="Dark Theme"
            aria-label="Dark Theme"
          >
            <Moon size={11} />
            <span>Dark</span>
          </button>
        </div>

        <button
          type="button"
          className="bento-bell-btn"
          onClick={onNavigateToAlerts}
          title="Open Threshold Alerts"
          aria-label="Open Threshold Alerts"
        >
          <Bell size={15} />
          {unreadAlertCount > 0 && (
            <span className="bell-badge-count">{unreadAlertCount}</span>
          )}
        </button>
      </div>
    </header>
  );
};
