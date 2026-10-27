'use client';

import React, { useState, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { bentoStatusKey, formatDateTimeGmt7, formatValue } from '@/app/lib/format';
import { doPercent, type Status } from '@/app/lib/water';

interface HistoricalDataViewProps {
  history7d: Point[];
  mode: 'live' | 'placeholder';
}

export const HistoricalDataView: React.FC<HistoricalDataViewProps> = ({ history7d, mode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 14;

  // Sort newest first
  const sorted = useMemo(() => [...history7d].reverse(), [history7d]);

  const filteredRows = useMemo(() => {
    return sorted.filter((pt) => {
      if (statusFilter !== 'all' && pt.assessment.status !== statusFilter) return false;
      if (searchTerm) {
        const stamp = formatDateTimeGmt7(pt.t).toLowerCase();
        return stamp.includes(searchTerm.toLowerCase()) || pt.timestamp.includes(searchTerm);
      }
      return true;
    });
  }, [sorted, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Export CSV with exact 30-minute median contract columns (Rule R3)
  const handleExportCSV = () => {
    const headers = [
      'timestamp',
      'temperature_c',
      'salinity_ppt',
      'ph',
      'dissolved_oxygen_mgl',
      'ammonia_mgl',
      'fuzzy_suitability',
      'fuzzy_status',
    ];
    const rows = filteredRows.map((pt) => [
      pt.timestamp,
      pt.values.temperature_c ?? '',
      pt.values.salinity_ppt ?? '',
      pt.values.ph ?? '',
      pt.values.dissolved_oxygen_mgl ?? '',
      pt.values.ammonia_mgl ?? '',
      pt.assessment.suitability != null ? pt.assessment.suitability.toFixed(4) : '',
      pt.assessment.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    const tag = mode === 'placeholder' ? 'placeholder' : 'live';
    link.setAttribute('download', `seal_30min_medians_${tag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1360px', margin: '0 auto', paddingBottom: '2rem', boxSizing: 'border-box' }}>
      {/* Header & CSV Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Historical 30-Minute Median Table
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            5-sensor schema (Rule R3) · Timezone: <strong>GMT+7 (WIB)</strong> · Source:{' '}
            <strong>{mode === 'placeholder' ? 'Synthetic Placeholder (Rule R1)' : 'Live Sensor Log'}</strong>
          </p>
        </div>

        <button
          type="button"
          className="btn-bento-dark"
          style={{ width: 'auto', padding: '8px 15px', gap: '8px' }}
          onClick={handleExportCSV}
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search timestamp (e.g. Dec 2026, 14:30)…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '12.5px',
              width: '100%',
              maxWidth: '320px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className="param-tabs-row">
          {(['all', 'Optimal', 'Warning', 'Critical'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`param-tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === 'all' ? 'All Bins' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '14px 18px' }}>
        <div className="forecast-view__table-wrap">
          <table className="forecast-view__table">
            <thead>
              <tr>
                <th>timestamp (GMT+7)</th>
                <th>temperature_c (°C)</th>
                <th>salinity_ppt (ppt)</th>
                <th>ph</th>
                <th>dissolved_oxygen_mgl (mg/L · % sat)</th>
                <th>ammonia_mgl (mg/L)</th>
                <th>fuzzy_suitability</th>
                <th>fuzzy_status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((pt) => {
                const stKey = bentoStatusKey(pt.assessment.status);
                const doSat = doPercent(pt.values);
                return (
                  <tr key={pt.t}>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '12px' }}>
                      {formatDateTimeGmt7(pt.t)}
                      {pt.interpolated && (
                        <span
                          title="Interpolated bin (gap ≤ 3 h)"
                          style={{ marginLeft: '6px', fontSize: '10.5px', color: 'var(--status-warning-text)' }}
                        >
                          [interp]
                        </span>
                      )}
                    </td>
                    <td>{formatValue('temperature_c', pt.values.temperature_c)}</td>
                    <td>{formatValue('salinity_ppt', pt.values.salinity_ppt)}</td>
                    <td>{formatValue('ph', pt.values.ph)}</td>
                    <td>
                      {formatValue('dissolved_oxygen_mgl', pt.values.dissolved_oxygen_mgl)}
                      {doSat != null ? ` (${doSat.toFixed(0)}%)` : ''}
                    </td>
                    <td>{formatValue('ammonia_mgl', pt.values.ammonia_mgl)}</td>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 700 }}>
                      {pt.assessment.suitability != null
                        ? pt.assessment.suitability.toFixed(3)
                        : '—'}
                    </td>
                    <td>
                      <span className={`condition-status-pill status-${stKey}`}>
                        {pt.assessment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, filteredRows.length)} of {filteredRows.length} bins (30-min medians)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="param-tab-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: '4px 8px', fontWeight: 600 }}>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="param-tab-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
