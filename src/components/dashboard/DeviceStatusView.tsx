'use client';

import React from 'react';
import { Cpu, Radio, Server, ShieldCheck } from 'lucide-react';
import type { DataQualitySummary } from '@/app/lib/data';
import { formatDateTimeGmt7 } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO } from '@/app/lib/water';

interface DeviceStatusViewProps {
  mode: 'live' | 'placeholder';
  offline: boolean;
  lastReadingAt: number | null;
  quality: DataQualitySummary;
}

export const DeviceStatusView: React.FC<DeviceStatusViewProps> = ({
  mode,
  offline,
  lastReadingAt,
  quality,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1360px', margin: '0 auto', paddingBottom: '2rem', boxSizing: 'border-box' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Tank Facts, Sensor Probes &amp; Ingestion Endpoint
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
          Monitoring and alerting only — blower and circulation pumps run 24/7 with no automated hardware control (Rule R11)
        </p>
      </div>

      {/* 3-Card Diagnostics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
        {/* Card 1: Physical Tank & Edge Node */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <Cpu size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Campus Holding Tank</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Single cemented tank with PVC shelters</div>
              </div>
            </div>
            <span className={`condition-status-pill status-${offline ? 'warning' : 'normal'}`}>
              {mode === 'live' ? (offline ? 'Stale' : 'Live') : 'Placeholder'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Target Species:</span>
              <span className="needs-source-badge">Panulirus spp. (NEEDS_INFO)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Tank Volume:</span>
              <span className="needs-source-badge">NEEDS_INFO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Aeration &amp; Filtration:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>24/7 Blower + Skimmer + Filter</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Hardware Control (R11):</span>
              <span style={{ color: 'var(--text-secondary)' }}>None (Monitoring only)</span>
            </div>
          </div>
        </div>

        {/* Card 2: 5 Sensor Columns */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <Radio size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>5 Sensor Probes</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Probe models &amp; calibration = NEEDS_INFO</div>
              </div>
            </div>
            <span className="condition-status-pill status-normal">5 Columns</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
            {SENSORS.map((k) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{k}</code>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {SENSOR_INFO[k].probeNote}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Next.js Ingestion & Data Quality */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <Server size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Telemetry Pipeline</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Next.js Server Component + Route Handler</div>
              </div>
            </div>
            <span className={`condition-status-pill status-${quality.spacingGuardOk ? 'normal' : 'critical'}`}>
              {quality.spacingGuardOk ? 'R4 Guard OK' : 'R4 Violation'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Active Source File:</span>
              <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{quality.sourceFile}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Raw Log Rows / Spacing:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {quality.rawReadingsCount.toLocaleString()} rows · {quality.medianSpacingMinutes} min median
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Interpolated Bins (24h):</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {quality.interpolatedBins24h} / {quality.totalBins24h} ({quality.interpolatedPct24h}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Last Reading (GMT+7):</span>
              <span style={{ color: 'var(--text-secondary)' }}>{formatDateTimeGmt7(lastReadingAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ESP32 HTTP POST Contract Reference */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={15} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Next.js Route Handler Ingestion Contract (<code>POST /api/readings</code>)
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          The ESP32 node posts readings directly to Next.js at <code>POST /api/readings</code>. Missing sensors remain <code>null</code> (never converted to 0) and are appended to <code>data/readings.csv</code> without overwriting raw logs (Rule R10).
        </p>
        <pre
          style={{
            margin: 0,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-light)',
            fontSize: '12px',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            overflowX: 'auto',
          }}
        >
          {`POST /api/readings
Content-Type: application/json

{
  "timestamp": "2026-10-22 19:30:00",
  "temperature_c": 28.1,
  "salinity_ppt": 32.4,
  "ph": 8.02,
  "dissolved_oxygen_mgl": 6.32,
  "ammonia_mgl": 0.05
}`}
        </pre>
      </div>
    </div>
  );
};
