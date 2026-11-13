'use client';

import React from 'react';
import { Cpu, Radio, Server, ShieldCheck } from 'lucide-react';
import type { DataQualitySummary } from '@/app/lib/data';
import { formatDateTimeGmt7 } from '@/app/lib/format';
import { SENSORS, SENSOR_INFO, TARGET_SPECIES } from '@/app/lib/water';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '1360px', margin: '0 auto', paddingBottom: '2rem', boxSizing: 'border-box' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          Tank Facts, Hardware Probes (RAB) &amp; Ingestion Endpoint
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
          Monitoring and alerting only — blower, protein skimmer, and filter pump run 24/7 with no automated hardware control (Rule R11 &amp; R15)
        </p>
      </div>

      {/* 3-Card Diagnostics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
        {/* Card 1: Physical Tank & Target Species */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-inset)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Cpu size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Campus Holding Tank</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Single cemented tank with PVC shelters</div>
              </div>
            </div>
            <span className={`condition-status-pill status-${offline ? 'warning' : 'normal'}`}>
              {mode === 'live' ? (offline ? 'Stale' : 'Live') : 'Placeholder v2'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Target Species (D11):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {TARGET_SPECIES.commonName} (<em>{TARGET_SPECIES.scientificName}</em>)
              </span>
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
              <span style={{ color: 'var(--text-tertiary)' }}>Ammonia Control (D6 / R15):</span>
              <span style={{ color: 'var(--text-secondary)' }}>Skimmer + Manual Test-Kit Events</span>
            </div>
          </div>
        </div>

        {/* Card 2: 5 Sensor Columns (per RAB_CAPSTONE.xlsx) */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-inset)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Radio size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>5 Sensor Probes (RAB)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>ESP32 + ADS1115 ADC · No ammonia sensor</div>
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
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--bg-inset)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Server size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Telemetry Pipeline</div>
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
          <ShieldCheck size={15} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
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
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            overflowX: 'auto',
          }}
        >
          {`POST /api/readings
Content-Type: application/json

{
  "timestamp": "2026-11-10 21:30:00",
  "temperature_c": 28.1,
  "salinity_ppt": 33.0,
  "ph": 8.15,
  "dissolved_oxygen_mgl": 6.32,
  "turbidity_ntu": 0.6
}`}
        </pre>
      </div>
    </div>
  );
};
