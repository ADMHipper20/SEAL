'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, MoreHorizontal, X, CheckCircle2 } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
    <div className="bento-card bento-alerts-card alerts-card">
      {/* Header with Title, Count Badge, and Dropdown Menu */}
      <div className="bento-card-header alerts-card-header">
        <div className="alerts-header-title-group">
          <h3 className="bento-card-title">Threshold Alerts</h3>
          <span className="alerts-count-badge">{filteredAlerts.length}</span>
        </div>

        <div className="card-dropdown-wrapper alerts-menu-anchor" ref={menuRef}>
          <button
            type="button"
            className={`card-dot-btn alerts-more-btn ${menuOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            title="Alert Options"
            aria-label="Alert Options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div className="card-dropdown-menu alerts-dropdown-panel" role="menu">
              {onNavigateToAlerts && (
                <button
                  type="button"
                  role="menuitem"
                  className="card-dropdown-item alerts-dropdown-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onNavigateToAlerts();
                  }}
                >
                  Open Full Alert Log
                </button>
              )}
              {dismissedIds.size > 0 && (
                <button
                  type="button"
                  role="menuitem"
                  className="card-dropdown-item alerts-dropdown-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedIds(new Set());
                    setMenuOpen(false);
                  }}
                >
                  Restore Hidden ({dismissedIds.size})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills (All, Critical, Warning) */}
      <div className="alerts-category-filters">
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

      {/* Spacious Alert Items List */}
      <div className="bento-alerts-list">
        {offline && mode === 'live' && (
          <div className="bento-alert-row">
            <div className="bento-alert-left-icon">
              <AlertTriangle size={15} className="alert-triangle-icon" />
            </div>
            <div className="bento-alert-text-stack">
              <div className="alert-row-meta-top">
                <span className="alert-category-tag">Telemetry</span>
                <span className="alert-row-time">Delayed</span>
              </div>
              <div className="alert-row-title">Sensor Node Stale</div>
              <div className="alert-row-desc">No reading received in the last 15 minutes</div>
            </div>
            <div className="bento-alert-right-group">
              <div className="alert-vertical-pill pill-amber" aria-hidden="true" />
            </div>
          </div>
        )}

        {filteredAlerts.length === 0 ? (
          <div className="bento-no-alerts">
            <CheckCircle2 size={14} style={{ color: 'var(--status-normal)' }} />
            <span>
              {categoryFilter !== 'all'
                ? 'No active alerts for this filter.'
                : 'All 5 monitored parameters within target range.'}
            </span>
          </div>
        ) : (
          filteredAlerts.slice(0, 6).map((alert) => {
            const isCrit = alert.severity === 'critical';
            const pillColorClass = isCrit ? 'pill-red' : 'pill-amber';
            const sevTextClass = isCrit ? 'sev-urgent' : 'sev-amber';

            return (
              <div
                key={alert.id}
                className="bento-alert-row"
                onClick={onNavigateToAlerts}
                role="button"
                tabIndex={0}
                title="Click to open alert details"
              >
                <div className="bento-alert-left-icon">
                  {isCrit ? (
                    <AlertCircle size={15} style={{ color: 'var(--status-critical)' }} />
                  ) : (
                    <AlertTriangle size={15} className="alert-triangle-icon" />
                  )}
                </div>

                <div className="bento-alert-text-stack">
                  <div className="alert-row-meta-top">
                    <span className="alert-category-tag">{alert.parameterLabel}</span>
                    <span className="alert-row-time">{formatShortDateGmt7(alert.t)}</span>
                  </div>
                  <div className="alert-row-title">{alert.title}</div>
                  <div className="alert-row-desc">{alert.message}</div>
                  <div className="alert-row-meta-bottom">
                    <span className={`alert-row-severity ${sevTextClass}`}>
                      {isCrit ? 'Critical' : 'Warning'} · Suitability {alert.suitabilityPct}%
                    </span>
                  </div>
                </div>

                <div className="bento-alert-right-group">
                  <button
                    type="button"
                    className="alert-dismiss-btn"
                    onClick={(e) => handleDismiss(alert.id, e)}
                    title="Hide from list"
                    aria-label="Hide alert"
                  >
                    <X size={11} />
                  </button>
                  <div className={`alert-vertical-pill ${pillColorClass}`} aria-hidden="true" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
