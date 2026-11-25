'use client';

import React from 'react';
import { Cpu, Radio, Server, ShieldCheck, Cable } from 'lucide-react';
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        paddingBottom: '2rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <div>
        <h1
          style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Tank Facts, 3-Sensor Hardware BOM &amp; ESP32 / Blynk Ingestion Bridge
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Monitoring and alerting only — 24/7 campus blower, protein skimmer, and circulation pump run continuously without actuator control (Rules R3, R10, R11)
        </p>
      </div>

      {/* 3-Card Diagnostics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Card 1: Physical Tank & Life Support */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Cpu size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Campus Holding Tank
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Telkom University Surabaya · PVC Shelters
                </div>
              </div>
            </div>
            <span className={`condition-status-pill status-${offline ? 'warning' : 'normal'}`}>
              {mode === 'live' ? (offline ? 'Stale' : 'Live') : 'Placeholder 3S'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              fontSize: '0.82rem',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Target Species:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {TARGET_SPECIES.commonName} (<em>{TARGET_SPECIES.scientificName}</em>)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tank Volume:</span>
              <span className="needs-source-badge">NEEDS_INFO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Dissolved O₂ (DO):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>24/7 Campus Blower</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Salinity Monitoring:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Manual Refractometer</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Organic / Ammonia Load:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>24/7 Protein Skimmer</span>
            </div>
          </div>
        </div>

        {/* Card 2: Finalized 3-Sensor EE BOM (Decision D7) */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Radio size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  3 Automated Probes (EE BOM)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  ESP32S CH340 + ADS1115 16-bit ADC
                </div>
              </div>
            </div>
            <span className="condition-status-pill status-normal">3 Columns</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.82rem',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '12px',
            }}
          >
            {SENSORS.map((k) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{k}</code>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {SENSOR_INFO[k].probeNote}
                </span>
              </div>
            ))}
            <div
              style={{
                marginTop: '4px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-light)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <strong>Excluded from ESP32 (D7):</strong> Salinity is checked manually with a refractometer; Dissolved Oxygen &amp; Ammonia are not wired to the microcontroller.
            </div>
          </div>
        </div>

        {/* Card 3: Next.js Ingestion & Data Quality */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Server size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Telemetry Pipeline
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Next.js Server Component + Route Handler
                </div>
              </div>
            </div>
            <span className={`condition-status-pill status-${quality.spacingGuardOk ? 'normal' : 'critical'}`}>
              {quality.spacingGuardOk ? 'R4 Guard OK' : 'R4 Violation'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              fontSize: '0.82rem',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Source File:</span>
              <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{quality.sourceFile}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Raw Log Rows / Spacing:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {quality.rawReadingsCount.toLocaleString()} rows · {quality.medianSpacingMinutes} min median
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Interpolated Bins (24h):</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {quality.interpolatedBins24h} / {quality.totalBins24h} ({quality.interpolatedPct24h}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last Reading (GMT+7):</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatDateTimeGmt7(lastReadingAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ESP32 HTTP POST Contract Reference */}
      <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Strict 3-Sensor Ingestion Contract (<code>POST /api/readings</code> · Rules R3 &amp; R10)
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          The ESP32S CH340 node (or the local Blynk bridge script) pushes JSON directly to{' '}
          <code>POST /api/readings</code>. Missing or disconnected probes must be sent as <code>null</code> (never{' '}
          <code>0</code>) and are appended safely to <code>data/readings.csv</code> without overwriting raw logs.
        </p>
        <pre
          style={{
            margin: 0,
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            overflowX: 'auto',
          }}
        >
          {`POST /api/readings
Content-Type: application/json

{
  "timestamp": "2026-11-23T14:30:00+07:00",
  "temperature_c": 27.8,
  "ph": 8.12,
  "turbidity_ntu": 2.4
}`}
        </pre>
      </div>

      {/* Quick Bridge Guide: Direct ESP32 vs. Blynk Cloud */}
      <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cable size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Bridging Electrical Engineering&apos;s ESP32 &amp; Blynk Setup
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <div style={{ background: 'var(--bg-inset)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              Option A (Recommended): Direct ESP32 Dual-Push
            </strong>
            Keep Blynk running on ESP32 and add <code>HTTPClient</code> POST calls to <code>POST /api/readings</code> on the same timer. Works directly over LAN/Hotspot with zero cloud delay.
          </div>
          <div style={{ background: 'var(--bg-inset)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              Option B (Zero EE Code Change): Local Blynk Poller
            </strong>
            Run <code>python scripts/blynk_bridge.py</code> on the SEAL server/laptop to poll Blynk&apos;s REST API (<code>V0, V1, V2</code>) and forward readings to <code>http://localhost:3000/api/readings</code>.
          </div>
          <div style={{ background: 'var(--bg-inset)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              Full Setup &amp; Wokwi Guide
            </strong>
            See <code>docs/HARDWARE_BRIDGE_GUIDE.md</code> for copy-paste ESP32 C++ sketches, Blynk Webhook setup, Cloudflare Tunnel commands, and Wokwi simulation steps.
          </div>
        </div>
      </div>
    </div>
  );
};
