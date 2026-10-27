'use client';

import React from 'react';
import { Activity, Clock, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { bentoStatusKey, formatDateTimeGmt7, formatValue } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, doPercent, limitingReason } from '@/app/lib/water';

interface BentoStockMetricsCardProps {
  current: Point;
}

export const BentoStockMetricsCard: React.FC<BentoStockMetricsCardProps> = ({ current }) => {
  const { status, suitability, perSensor, limiting } = current.assessment;
  const level = bentoStatusKey(status);
  const score = suitability != null ? Math.round(suitability * 100) : null;
  const doSat = doPercent(current.values);

  const label =
    status === 'Optimal'
      ? 'OPTIMAL'
      : status === 'Warning'
        ? 'WARNING'
        : status === 'Critical'
          ? 'CRITICAL'
          : 'NO DATA';

  const statusBadge =
    level === 'critical'
      ? {
          icon: <AlertOctagon size={13} className="headline-status-icon" />,
          text: 'Outside Published Tolerance (μ = 0)',
          variant: 'critical',
        }
      : level === 'warning'
        ? {
            icon: <AlertTriangle size={13} className="headline-status-icon" />,
            text: 'Sub-Optimal Ramp (0 < μ < 1)',
            variant: 'warning',
          }
        : {
            icon: <CheckCircle2 size={13} className="headline-status-icon" />,
            text: 'All Sensors in Published Optimum (μ = 1)',
            variant: 'normal',
          };

  // Strictly informational description (PLANS.md R14 & §7: no biological claims or action commands)
  const summaryText = limiting
    ? limitingReason(limiting, current.values)
    : 'All five water-quality parameters sit on the flat top (μ = 1.0) of their literature-based trapezoidal membership functions.';

  return (
    <div className="bento-card bento-stock-card">
      {/* 1. Header */}
      <div className="bento-card-header bento-stock-header">
        <h3 className="bento-card-title">Fuzzy Suitability &amp; Limiting Factor</h3>
        <span className={`bento-status-pill pill-${level === 'unknown' ? 'pending' : level}`}>
          {label}
        </span>
      </div>

      {/* 2. Key Metrics Strip: Overall Suitability (min over 5) + Limiting Factor (PLANS.md §7 D5) */}
      <div className="bento-stock-metrics-strip">
        <div className="stock-metric-tile">
          <div className="stock-metric-header">
            <span className="stock-metric-name">Overall Suitability</span>
            <span className={`stock-metric-indicator ind-${level}`} />
          </div>
          <div className="stock-metric-value-row">
            <span className="stock-metric-val">{score !== null ? `${score}%` : '—'}</span>
            <span className="stock-metric-sub">min(μ₁…μ₅)</span>
          </div>
          <div className="stock-metric-progress-track">
            <div
              className={`stock-metric-progress-bar bar-${level}`}
              style={{ width: `${score !== null ? Math.min(Math.max(score, 6), 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="stock-metric-tile">
          <div className="stock-metric-header">
            <span className="stock-metric-name">Limiting Sensor</span>
            <span className="stock-metric-target-tag">Rule D5</span>
          </div>
          <div className="stock-metric-value-row">
            <span className="stock-metric-val" style={{ fontSize: '14px' }}>
              {limiting ? SENSOR_INFO[limiting].shortLabel : 'None'}
            </span>
            <span className="stock-metric-sub">
              {limiting ? 'Sets overall score' : 'All optimal'}
            </span>
          </div>
          <div className="stock-metric-progress-track">
            <div
              className="stock-metric-progress-bar bar-fcr"
              style={{ width: limiting ? '100%' : '20%' }}
            />
          </div>
        </div>
      </div>

      {/* 3. Informational Status Summary Box (Rule R14) */}
      <div className={`stock-status-summary-box banner-${statusBadge.variant}`}>
        <div className="status-summary-top">
          <div className="status-summary-title-wrap">
            <span className="headline-icon-wrap">{statusBadge.icon}</span>
            <span className="headline-status-name">{statusBadge.text}</span>
          </div>
        </div>
        <p className="status-summary-desc">{summaryText}</p>
      </div>

      {/* 4. Per-Sensor Trapezoidal Membership Breakdown */}
      <div className="stock-factors-section">
        <div className="factors-header">
          <Activity size={11} className="factors-icon" />
          <span className="factors-title">Per-Sensor Suitability (μ)</span>
          <span className="factors-count">(5)</span>
        </div>

        <div className="stock-factors-grid">
          {SENSORS.map((k) => {
            const info = SENSOR_INFO[k];
            const mu = perSensor[k];
            const muPct = mu != null ? `${Math.round(mu * 100)}%` : '—';
            const badgeClass =
              mu == null || mu >= 1 - 1e-9
                ? 'weight-low'
                : mu <= 1e-9
                  ? 'weight-high'
                  : 'weight-moderate';

            return (
              <div key={k} className="stock-factor-grid-cell" title={info.source}>
                <span className="factor-grid-name">
                  {info.shortLabel}
                  {info.needsSource ? ' *' : ''}
                </span>
                <div className="factor-grid-val-wrap">
                  <span className="factor-grid-val">
                    {k === 'dissolved_oxygen_mgl' && doSat != null
                      ? `${doSat.toFixed(0)}%`
                      : `${formatValue(k, current.values[k])} ${info.unit}`}
                  </span>
                  <span className={`factor-grid-badge ${badgeClass}`}>μ={muPct}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Evaluation Timestamp Footer in GMT+7 */}
      <div className="stock-eval-footer">
        <Clock size={10} className="stock-eval-icon" />
        <span className="stock-eval-text">
          Evaluated: {formatDateTimeGmt7(current.t)} · * items flagged <code>NEEDS_SOURCE</code>
        </span>
      </div>
    </div>
  );
};
