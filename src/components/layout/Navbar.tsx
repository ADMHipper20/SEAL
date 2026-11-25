'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Play,
  Pause,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  LayoutDashboard,
  TrendingUp,
  Droplets,
  AlertTriangle,
  History,
  Cpu,
} from 'lucide-react';
import { formatTimeSeconds } from '@/app/lib/format';
import type { AboutSubTab, PrimaryTab } from '@/app/lib/water';

export type ThemeMode = 'system' | 'light' | 'dark';

interface NavbarProps {
  primaryTab: PrimaryTab;
  aboutSubTab: AboutSubTab;
  onPrimaryTabChange: (tab: PrimaryTab) => void;
  onOpenAboutSubTab: (sub: AboutSubTab) => void;
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
  primaryTab,
  aboutSubTab,
  onPrimaryTabChange,
  onOpenAboutSubTab,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <header className="top-bar-bento seal-navbar" ref={navRef}>
      {/* Left: Brand Mark + Mode Badge (Rule R1) + 5s Live Stream Pill */}
      <div className="top-bar-brand seal-navbar__left">
        <button
          type="button"
          className="top-brand-icon-minimal"
          onClick={() => {
            onPrimaryTabChange('overview');
            setIsMobileMenuOpen(false);
          }}
          title="SEAL — Pearl Lobster (Panulirus ornatus) Tank Monitoring"
          aria-label="SEAL — Pearl Lobster (Panulirus ornatus) Tank Monitoring"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="7.2" r="4.0" />
            <circle cx="7.2" cy="15.5" r="4.0" />
            <circle cx="16.8" cy="15.5" r="4.0" />
          </svg>
          <span className="top-brand-wordmark">SEAL</span>
        </button>

        {/* Rule R1: Explicit Placeholder vs Live Data badge + GMT+7 timezone */}
        <span
          className={`top-mode-pill ${
            mode === 'live' ? 'top-mode-pill--live' : 'top-mode-pill--placeholder'
          }`}
          title={
            mode === 'live'
              ? 'Live 3-sensor telemetry from data/readings.csv (GMT+7 / WIB)'
              : 'Synthetic 3-sensor placeholder data from data/sensor_log_placeholder.csv (Rule R1 · GMT+7 / WIB)'
          }
        >
          <span className="top-mode-pill__dot" />
          <span className="top-mode-pill__text">
            {mode === 'live' ? 'LIVE · 3 SENSORS · GMT+7' : 'PLACEHOLDER · 3 SENSORS · GMT+7'}
          </span>
        </span>

        {/* 5-Second Live Telemetry Monitor Pill (Hidden on very small screens; available in drawer) */}
        <button
          type="button"
          className={`top-live-poll-pill seal-navbar__poll-desktop ${livePolling ? 'active' : 'paused'}`}
          onClick={onToggleLivePolling}
          title={
            livePolling
              ? '5-second live telemetry monitoring active. Click to pause.'
              : '5-second live telemetry monitoring paused. Click to resume.'
          }
        >
          {livePolling ? <Pause size={12} /> : <Play size={12} />}
          <span>
            {livePolling
              ? `5s Stream · ${lastReadingAt ? formatTimeSeconds(lastReadingAt) : ''} (${secondsUntilNextPoll}s)`
              : '5s Stream Paused'}
          </span>
        </button>
      </div>

      {/* Right: Desktop 2-Tab Navigation + Theme Toggle + Alerts Bell + Mobile Hamburger Toggle */}
      <div className="top-bar-right-group seal-navbar__right">
        <nav className="top-nav-pills seal-navbar__desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`top-pill-btn ${primaryTab === 'overview' ? 'active' : ''}`}
            onClick={() => onPrimaryTabChange('overview')}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`top-pill-btn ${primaryTab === 'about' ? 'active' : ''}`}
            onClick={() => onPrimaryTabChange('about')}
          >
            <span>About</span>
            {unreadAlertCount > 0 && (
              <span className="top-pill-badge" title={`${unreadAlertCount} active threshold alerts`}>
                {unreadAlertCount}
              </span>
            )}
          </button>
        </nav>

        {/* Theme Mode Segmented Setting: Auto / Light / Dark */}
        <div
          className="top-theme-segmented seal-navbar__theme-desktop"
          role="radiogroup"
          aria-label="Theme Mode Selection"
        >
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'system' ? 'active' : ''}`}
            onClick={() => onThemeChange('system')}
            title="System Theme (Follow device setting)"
          >
            <Monitor size={12} />
            <span>Auto</span>
          </button>
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => onThemeChange('light')}
            title="Light Theme"
          >
            <Sun size={12} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`theme-seg-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => onThemeChange('dark')}
            title="Dark Theme"
          >
            <Moon size={12} />
            <span>Dark</span>
          </button>
        </div>

        <button
          type="button"
          className="bento-bell-btn"
          onClick={() => {
            onNavigateToAlerts();
            setIsMobileMenuOpen(false);
          }}
          title="Open Threshold Alerts"
          aria-label="Open Threshold Alerts"
        >
          <Bell size={16} />
          {unreadAlertCount > 0 && (
            <span className="bell-badge-count">{unreadAlertCount}</span>
          )}
        </button>

        {/* Mobile Drawer Hamburger Toggle (Modeled on mvp-app .navbar-mobile__toggle) */}
        <button
          type="button"
          className="seal-mobile-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Responsive Mobile Navigation Drawer (Modeled on mvp-app .navbar-mobile__drawer) */}
      {isMobileMenuOpen && (
        <div className="seal-mobile-drawer">
          <nav className="seal-mobile-drawer__links" aria-label="Mobile Navigation">
            <button
              type="button"
              className={`seal-mobile-drawer__link ${primaryTab === 'overview' ? 'active' : ''}`}
              onClick={() => {
                onPrimaryTabChange('overview');
                setIsMobileMenuOpen(false);
              }}
            >
              <LayoutDashboard size={17} />
              <span>Overview (Pond Hero &amp; Live Shelf)</span>
            </button>

            <div className="seal-mobile-drawer__divider-label">About &amp; Analytics Views</div>

            <button
              type="button"
              className={`seal-mobile-drawer__link ${
                primaryTab === 'about' && aboutSubTab === 'forecast' ? 'active' : ''
              }`}
              onClick={() => {
                onOpenAboutSubTab('forecast');
                setIsMobileMenuOpen(false);
              }}
            >
              <TrendingUp size={17} />
              <span>Forecast (30m – 6h Ahead)</span>
            </button>

            <button
              type="button"
              className={`seal-mobile-drawer__link ${
                primaryTab === 'about' && aboutSubTab === 'water_quality' ? 'active' : ''
              }`}
              onClick={() => {
                onOpenAboutSubTab('water_quality');
                setIsMobileMenuOpen(false);
              }}
            >
              <Droplets size={17} />
              <span>Water Quality &amp; Fuzzy Rules</span>
            </button>

            <button
              type="button"
              className={`seal-mobile-drawer__link ${
                primaryTab === 'about' && aboutSubTab === 'alerts' ? 'active' : ''
              }`}
              onClick={() => {
                onOpenAboutSubTab('alerts');
                setIsMobileMenuOpen(false);
              }}
            >
              <AlertTriangle size={17} />
              <span>Threshold Alerts ({unreadAlertCount})</span>
            </button>

            <button
              type="button"
              className={`seal-mobile-drawer__link ${
                primaryTab === 'about' && aboutSubTab === 'history' ? 'active' : ''
              }`}
              onClick={() => {
                onOpenAboutSubTab('history');
                setIsMobileMenuOpen(false);
              }}
            >
              <History size={17} />
              <span>History &amp; CSV Export</span>
            </button>

            <button
              type="button"
              className={`seal-mobile-drawer__link ${
                primaryTab === 'about' && aboutSubTab === 'device' ? 'active' : ''
              }`}
              onClick={() => {
                onOpenAboutSubTab('device');
                setIsMobileMenuOpen(false);
              }}
            >
              <Cpu size={17} />
              <span>Device BOM &amp; ESP32/Blynk Bridge</span>
            </button>
          </nav>

          {/* Mobile Controls Row: Theme Switcher + 5s Live Stream Toggle */}
          <div className="seal-mobile-drawer__footer">
            <div className="top-theme-segmented" role="radiogroup" aria-label="Theme Mode Selection">
              <button
                type="button"
                className={`theme-seg-btn ${themeMode === 'system' ? 'active' : ''}`}
                onClick={() => onThemeChange('system')}
              >
                <Monitor size={12} />
                <span>Auto</span>
              </button>
              <button
                type="button"
                className={`theme-seg-btn ${themeMode === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange('light')}
              >
                <Sun size={12} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-seg-btn ${themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange('dark')}
              >
                <Moon size={12} />
                <span>Dark</span>
              </button>
            </div>

            <button
              type="button"
              className={`top-live-poll-pill ${livePolling ? 'active' : 'paused'}`}
              onClick={onToggleLivePolling}
            >
              {livePolling ? <Pause size={12} /> : <Play size={12} />}
              <span>{livePolling ? `5s Stream (${secondsUntilNextPoll}s)` : 'Stream Paused'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
