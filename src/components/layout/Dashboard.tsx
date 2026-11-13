'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot } from '@/app/lib/data';
import type { NavigationTab, PondVisualMode } from '@/app/lib/water';
import { Navbar, type ThemeMode } from '@/components/layout/Navbar';

const THEME_STORAGE_KEY = 'seal_theme_mode';
import { OverviewView } from '@/components/dashboard/OverviewView';
import { ForecastView } from '@/components/dashboard/ForecastView';
import { WaterQualityView } from '@/components/dashboard/WaterQualityView';
import { AlertsView } from '@/components/dashboard/AlertsView';
import { HistoricalDataView } from '@/components/dashboard/HistoricalDataView';
import { DeviceStatusView } from '@/components/dashboard/DeviceStatusView';

const VISUAL_MODE_STORAGE_KEY = 'seal_pond_visual_mode';
const LIVE_POLL_INTERVAL_SECONDS = 5;

interface DashboardProps {
  snapshot: Snapshot;
}

export const Dashboard: React.FC<DashboardProps> = ({ snapshot }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  // Default to Static 3D image (lightest) as requested, persisted in localStorage
  const [visualMode, setVisualMode] = useState<PondVisualMode>('image');
  // 5-second real-time monitoring loop
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

  return (
    <div className="app-container">
      <div
        className="app-main"
        style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <Navbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          unreadAlertCount={snapshot.alerts.length}
          mode={snapshot.mode}
          lastReadingAt={snapshot.lastReadingAt}
          livePolling={livePolling}
          secondsUntilNextPoll={secondsLeft}
          onToggleLivePolling={handleToggleLivePolling}
          onNavigateToAlerts={() => setCurrentTab('alerts')}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
        />

        <main
          className="dashboard-content"
          style={{
            padding: '10px 16px',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {currentTab === 'overview' && (
            <OverviewView
              snapshot={snapshot}
              visualMode={visualMode}
              onVisualModeChange={handleVisualModeChange}
              onRefresh={handleManualRefresh}
              isRefreshing={isPending}
              livePolling={livePolling}
              onToggleLivePolling={handleToggleLivePolling}
              secondsUntilNextPoll={secondsLeft}
              onNavigateToForecast={() => setCurrentTab('forecast')}
              onNavigateToWaterQuality={() => setCurrentTab('water_quality')}
              onNavigateToAlerts={() => setCurrentTab('alerts')}
            />
          )}

          {currentTab === 'forecast' && (
            <ForecastView
              history24h={snapshot.history24h}
              liveStream5s={snapshot.liveStream5s}
              history7d={snapshot.history7d}
              forecast={snapshot.forecast}
              mode={snapshot.mode}
            />
          )}

          {currentTab === 'water_quality' && (
            <WaterQualityView
              current={snapshot.current}
              liveStream5s={snapshot.liveStream5s}
              history24h={snapshot.history24h}
              history7d={snapshot.history7d}
              forecastSteps={snapshot.forecast?.steps.slice(0, 6)}
            />
          )}

          {currentTab === 'alerts' && <AlertsView alerts={snapshot.alerts} />}

          {currentTab === 'history' && (
            <HistoricalDataView history7d={snapshot.history7d} mode={snapshot.mode} />
          )}

          {currentTab === 'device' && (
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
