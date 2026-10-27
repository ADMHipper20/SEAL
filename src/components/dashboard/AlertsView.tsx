'use client';

import React, { useState } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';
import type { ThresholdAlert } from '@/app/lib/data';
import { formatDateTimeGmt7 } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO } from '@/app/lib/water';

interface AlertsViewProps {
  alerts: ThresholdAlert[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts }) => {
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical' && !acknowledgedIds.has(a.id),
  ).length;
  const warningCount = alerts.filter(
    (a) => a.severity === 'warning' && !acknowledgedIds.has(a.id),
  ).length;
  const acknowledgedCount = acknowledgedIds.size;

  const toggleAck = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1360px', margin: '0 auto', paddingBottom: '2rem', boxSizing: 'border-box' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Informational Threshold Alerts
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
          Non-Optimal 30-minute bins evaluated by the literature fuzzy rule set (Rule R14: status indicates inside/outside published ranges only · GMT+7)
        </p>
      </div>

      {/* Summary KPI Cards (Clean Neutral Bento Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Outside Tolerance (Critical)
            </span>
            <AlertOctagon size={16} style={{ color: 'var(--status-critical)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.02em' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            30-min bins with at least one sensor at μ = 0
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sub-Optimal Ramp (Warning)
            </span>
            <AlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.02em' }}>
            {warningCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            30-min bins on the trapezoidal ramp (0 &lt; μ &lt; 1)
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reviewed in Session
            </span>
            <CheckCircle2 size={16} style={{ color: 'var(--status-normal)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.02em' }}>
            {acknowledgedCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Alert persistence window N = <code>NEEDS_INFO</code>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Recent Non-Optimal Episodes (7-Day Window)
        </h2>

        {alerts.length === 0 ? (
          <div style={{ padding: '1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No Warning or Critical bins recorded in the active 7-day window.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((a) => {
              const ack = acknowledgedIds.has(a.id);
              const isCrit = a.severity === 'critical';
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: ack ? 'var(--bg-surface-muted)' : 'var(--bg-surface)',
                    opacity: ack ? 0.68 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className={`condition-status-dot dot-${isCrit ? 'critical' : 'warning'}`}
                      style={{ width: '8px', height: '8px', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {a.title}
                        </strong>
                        <span className={`condition-status-pill status-${isCrit ? 'critical' : 'warning'}`}>
                          {isCrit ? 'Critical' : 'Warning'} · {a.suitabilityPct}%
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                          {formatDateTimeGmt7(a.t)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {a.message}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAck(a.id)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      background: ack ? 'var(--status-normal-bg)' : 'var(--bg-surface-muted)',
                      color: ack ? 'var(--status-normal-text)' : 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ack ? '✓ Reviewed' : 'Mark Reviewed'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Published Tolerance Reference (strictly informational per R14) */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={15} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Published Suitability Bounds Summary (Rule R14)
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Fuzzy status values indicate whether sensor medians sit inside or outside published literature bounds. No automated hardware control or biological diagnosis is performed.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
          {SENSORS.map((k) => {
            const info = SENSOR_INFO[k];
            return (
              <div
                key={k}
                style={{
                  background: 'var(--bg-inset)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.78rem',
                }}
              >
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                  {info.label}
                </strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Optimum (μ=1): <strong>{info.optimalRangeText}</strong>
                </div>
                <div style={{ color: 'var(--text-tertiary)' }}>
                  Tolerance (μ&gt;0): {info.toleranceRangeText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
