'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Droplets,
  AlertTriangle,
  History,
  Cpu,
} from 'lucide-react';
import type { Snapshot } from '@/app/lib/data';
import type { AboutSubTab, PondVisualMode, PrimaryTab } from '@/app/lib/water';
import { Navbar, type ThemeMode } from '@/components/layout/Navbar';
import { OverviewView } from '@/components/dashboard/OverviewView';
import { ForecastView } from '@/components/dashboard/ForecastView';
import { WaterQualityView } from '@/components/dashboard/WaterQualityView';
import { AlertsView } from '@/components/dashboard/AlertsView';
import { HistoricalDataView } from '@/components/dashboard/HistoricalDataView';
import { DeviceStatusView } from '@/components/dashboard/DeviceStatusView';

const THEME_STORAGE_KEY = 'seal_theme_mode';
const VISUAL_MODE_STORAGE_KEY = 'seal_pond_visual_mode';
const LIVE_POLL_INTERVAL_SECONDS = 5;

interface DashboardProps {
  snapshot: Snapshot;
}

const ABOUT_SUB_TABS: Array<{
  id: AboutSubTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'forecast', label: 'Forecast', icon: <TrendingUp size={14} /> },
  { id: 'water_quality', label: 'Water Quality', icon: <Droplets size={14} /> },
  { id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={14} /> },
  { id: 'history', label: 'History', icon: <History size={14} /> },
  { id: 'device', label: 'Device', icon: <Cpu size={14} /> },
];

export const Dashboard: React.FC<DashboardProps> = ({ snapshot }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('overview');
  const [aboutSubTab, setAboutSubTab] = useState<AboutSubTab>('forecast');
  const [visualMode, setVisualMode] = useState<PondVisualMode>('image');
  const [livePolling, setLivePolling] = useState<boolean>(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(LIVE_POLL_INTERVAL_SECONDS);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      let resolved: 'light' | 'dark';
      if (themeMode === 'system') {
        resolved =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
      } else {
        resolved = themeMode;
      }
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
    };

    applyTheme();

    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [themeMode]);

  const handleThemeChange = (next: ThemeMode) => {
    setThemeMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors
    }
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VISUAL_MODE_STORAGE_KEY);
      if (saved === 'image' || saved === 'video' || saved === 'off') {
        setVisualMode(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  useEffect(() => {
    if (!livePolling) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });
          }, 0);
          return LIVE_POLL_INTERVAL_SECONDS;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [livePolling, router]);

  const handleVisualModeChange = (next: PondVisualMode) => {
    setVisualMode(next);
    try {
      window.localStorage.setItem(VISUAL_MODE_STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors
    }
  };

  const handleManualRefresh = () => {
    setSecondsLeft(LIVE_POLL_INTERVAL_SECONDS);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleToggleLivePolling = () => {
    setLivePolling((prev) => {
      const next = !prev;
      if (next) setSecondsLeft(LIVE_POLL_INTERVAL_SECONDS);
      return next;
    });
  };

  const openAboutSection = (sub: AboutSubTab) => {
    setPrimaryTab('about');
    setAboutSubTab(sub);
  };

  return (
    <div className="app-container">
      <div
        className="app-main"
        style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <Navbar
          primaryTab={primaryTab}
          aboutSubTab={aboutSubTab}
          onPrimaryTabChange={setPrimaryTab}
          onOpenAboutSubTab={openAboutSection}
          unreadAlertCount={snapshot.alerts.length}
          mode={snapshot.mode}
          lastReadingAt={snapshot.lastReadingAt}
          livePolling={livePolling}
          secondsUntilNextPoll={secondsLeft}
          onToggleLivePolling={handleToggleLivePolling}
          onNavigateToAlerts={() => openAboutSection('alerts')}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
        />

        {/* Decision D8: Horizontal segmented sub-menu bar when About is active */}
        {primaryTab === 'about' && (
          <div className="about-subnav-bar">
            <div className="about-subnav-inner">
              <div className="pond-toggle-glass-pill about-subnav-pill" role="tablist" aria-label="About Sections">
                {ABOUT_SUB_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={aboutSubTab === tab.id}
                    className={`pond-toggle-sub-btn about-subnav-btn ${aboutSubTab === tab.id ? 'active' : ''}`}
                    onClick={() => setAboutSubTab(tab.id)}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.id === 'alerts' && snapshot.alerts.length > 0 && (
                      <span className="top-pill-badge">{snapshot.alerts.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main
          className="dashboard-content"
          style={{
            padding: primaryTab === 'overview' ? '0' : '20px 20px 40px',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {primaryTab === 'overview' && (
            <OverviewView
              snapshot={snapshot}
              visualMode={visualMode}
              onVisualModeChange={handleVisualModeChange}
              onRefresh={handleManualRefresh}
              isRefreshing={isPending}
              livePolling={livePolling}
              onToggleLivePolling={handleToggleLivePolling}
              secondsUntilNextPoll={secondsLeft}
              onNavigateToForecast={() => openAboutSection('forecast')}
              onNavigateToWaterQuality={() => openAboutSection('water_quality')}
              onNavigateToAlerts={() => openAboutSection('alerts')}
            />
          )}

          {primaryTab === 'about' && aboutSubTab === 'forecast' && (
            <ForecastView
              history24h={snapshot.history24h}
              liveStream5s={snapshot.liveStream5s}
              history7d={snapshot.history7d}
              forecast={snapshot.forecast}
              mode={snapshot.mode}
            />
          )}

          {primaryTab === 'about' && aboutSubTab === 'water_quality' && (
            <WaterQualityView
              current={snapshot.current}
              liveStream5s={snapshot.liveStream5s}
              history24h={snapshot.history24h}
              history7d={snapshot.history7d}
              forecastSteps={snapshot.forecast?.steps.slice(0, 6)}
            />
          )}

          {primaryTab === 'about' && aboutSubTab === 'alerts' && (
            <AlertsView alerts={snapshot.alerts} />
          )}

          {primaryTab === 'about' && aboutSubTab === 'history' && (
            <HistoricalDataView history7d={snapshot.history7d} mode={snapshot.mode} />
          )}

          {primaryTab === 'about' && aboutSubTab === 'device' && (
            <DeviceStatusView
              mode={snapshot.mode}
              offline={snapshot.offline}
              lastReadingAt={snapshot.lastReadingAt}
              quality={snapshot.quality}
            />
          )}
        </main>
      </div>
    </div>
  );
};
