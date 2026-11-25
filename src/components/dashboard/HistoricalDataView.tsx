'use client';

import React, { useState, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import type { Point } from '@/app/lib/data';
import { bentoStatusKey, formatDateTimeGmt7, formatValue } from '@/app/lib/format';
import type { Status } from '@/app/lib/water';

interface HistoricalDataViewProps {
  history7d: Point[];
  mode: 'live' | 'placeholder';
}

export const HistoricalDataView: React.FC<HistoricalDataViewProps> = ({ history7d, mode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 14;

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

  // Strict 3-sensor 30-min modelling CSV export (PLANS.md §4.2, Rules R3 & R10: nulls stay empty)
  const handleExportCSV = () => {
    const headers = [
      'timestamp',
      'temperature_c',
      'ph',
      'turbidity_ntu',
      'fuzzy_suitability',
      'fuzzy_status',
      'interpolated',
    ];
    const rows = filteredRows.map((pt) => [
      pt.timestamp,
      pt.values.temperature_c ?? '',
      pt.values.ph ?? '',
      pt.values.turbidity_ntu ?? '',
      pt.assessment.suitability != null ? pt.assessment.suitability.toFixed(3) : '',
      pt.assessment.status,
      pt.interpolated ? 'true' : 'false',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    const tag = mode === 'placeholder' ? 'placeholder_3sensors' : 'live_3sensors';
    link.setAttribute('download', `seal_30min_medians_${tag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        paddingBottom: '2rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Header & CSV Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
            Historical 30-Minute Median Table
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Strict 3-sensor schema (<code>timestamp, temperature_c, ph, turbidity_ntu</code> · Rule R3) · Timezone:{' '}
            <strong>GMT+7 (WIB)</strong> · Source:{' '}
            <strong>{mode === 'placeholder' ? 'Synthetic Placeholder (Rule R1)' : 'Live Sensor Log'}</strong>
          </p>
        </div>

        <button
          type="button"
          className="btn-bento-dark"
          style={{ width: 'auto', padding: '8px 16px', gap: '8px' }}
          onClick={handleExportCSV}
        >
          <Download size={15} />
          <span>Export 3-Sensor CSV</span>
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
          <Search size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search timestamp (e.g. Dec 2026, 14:30)…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 12px',
              fontSize: '13px',
              width: '100%',
              maxWidth: '340px',
              background: 'var(--bg-inset)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className="param-tabs-row" style={{ width: 'auto' }}>
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
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <div className="forecast-view__table-wrap">
          <table className="forecast-view__table">
            <thead>
              <tr>
                <th>timestamp (GMT+7)</th>
                <th>temperature_c (°C)</th>
                <th>ph</th>
                <th>turbidity_ntu (NTU)</th>
                <th>fuzzy_suitability</th>
                <th>fuzzy_status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((pt) => {
                const stKey = bentoStatusKey(pt.assessment.status);
                return (
                  <tr key={pt.t}>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '12.5px' }}>
                      {formatDateTimeGmt7(pt.t)}
                      {pt.interpolated && (
                        <span
                          title="Interpolated bin (gap ≤ 3 h)"
                          style={{ marginLeft: '6px', fontSize: '11.5px', color: 'var(--status-warning-text)' }}
                        >
                          [interp]
                        </span>
                      )}
                    </td>
                    <td>{formatValue('temperature_c', pt.values.temperature_c)}</td>
                    <td>{formatValue('ph', pt.values.ph)}</td>
                    <td>{formatValue('turbidity_ntu', pt.values.turbidity_ntu)}</td>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 600 }}>
                      {pt.assessment.suitability != null ? pt.assessment.suitability.toFixed(3) : '—'}
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
            paddingTop: '14px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, filteredRows.length)} of {filteredRows.length} bins (30-min medians)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="param-tab-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
