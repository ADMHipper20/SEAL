'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, ArrowUpRight, X, CheckCircle2 } from 'lucide-react';
import type { ThresholdAlert } from '@/app/lib/data';
import { formatShortDateGmt7 } from '@/app/lib/format';

export type AlertCategoryFilter = 'all' | 'critical' | 'warning';

interface BentoAlertsListProps {
  alerts: ThresholdAlert[];
  offline: boolean;
  mode: 'live' | 'placeholder';
  onNavigateToAlerts?: () => void;
}

export const BentoAlertsList: React.FC<BentoAlertsListProps> = ({
  alerts,
  offline,
  mode,
  onNavigateToAlerts,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<AlertCategoryFilter>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (dismissedIds.has(a.id)) return false;
      if (categoryFilter === 'critical') return a.severity === 'critical';
      if (categoryFilter === 'warning') return a.severity === 'warning';
      return true;
    });
  }, [alerts, categoryFilter, dismissedIds]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <section className="bento-card overview-panel" aria-label="Threshold Alerts">
      <div className="overview-panel__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="overview-panel__title">Threshold Alerts</h2>
            <span className="alerts-count-badge">{filteredAlerts.length}</span>
          </div>
          <span className="overview-panel__subtitle">
            Non-Optimal 30-min episodes across Temperature, pH &amp; Turbidity
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <div className="alerts-category-filters" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`filter-pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${categoryFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('critical')}
            >
              Critical
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${categoryFilter === 'warning' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('warning')}
            >
              Warning
            </button>
          </div>

          {onNavigateToAlerts && (
            <button
              type="button"
              className="bento-action-btn-mini"
              onClick={onNavigateToAlerts}
            >
              <span>Log</span>
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="alerts-feed">
        {offline && mode === 'live' && (
          <div className="alerts-feed__row">
            <div className="alerts-feed__top">
              <span className="alerts-feed__meta">TELEMETRY DELAYED</span>
              <span className="condition-status-pill status-warning">Stale</span>
            </div>
            <h3 className="alerts-feed__title">ESP32 Sensor Node Stale</h3>
            <p className="alerts-feed__desc">No reading received in the last 15 minutes</p>
          </div>
        )}

        {filteredAlerts.length === 0 ? (
          <div className="bento-no-alerts">
            <CheckCircle2 size={15} style={{ color: 'var(--status-normal)' }} />
            <span>
              {categoryFilter !== 'all'
                ? 'No active alerts for this filter.'
                : 'All 3 monitored parameters sit within published target ranges.'}
            </span>
          </div>
        ) : (
          filteredAlerts.slice(0, 5).map((alert) => {
            const isCrit = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className="alerts-feed__row"
                onClick={onNavigateToAlerts}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigateToAlerts?.();
                  }
                }}
              >
                <div className="alerts-feed__top">
                  <span className="alerts-feed__meta">
                    {isCrit ? (
                      <AlertCircle size={13} style={{ color: 'var(--status-critical)' }} />
                    ) : (
                      <AlertTriangle size={13} style={{ color: 'var(--status-warning)' }} />
                    )}
                    <span>
                      {alert.parameterLabel} · {formatShortDateGmt7(alert.t)} GMT+7
                    </span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`condition-status-pill status-${isCrit ? 'critical' : 'warning'}`}>
                      {isCrit ? 'Critical' : 'Warning'} · μ={alert.suitabilityPct}%
                    </span>
                    <button
                      type="button"
                      className="alerts-feed__dismiss"
                      onClick={(e) => handleDismiss(alert.id, e)}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="alerts-feed__title">{alert.title}</h3>
                <p className="alerts-feed__desc">{alert.message}</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
