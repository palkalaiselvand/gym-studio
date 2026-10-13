import React, { useMemo } from 'react';
import { Activity, AlertTriangle, Gauge, Wrench } from 'lucide-react';
import type { FacilityAsset, MaintenanceTicket } from '../../types';

interface FacilityOperationsPanelProps {
  assets: FacilityAsset[];
  tickets: MaintenanceTicket[];
}

const severityColor: Record<string, string> = {
  P1: '#f87171',
  P2: '#fbbf24',
  P3: '#60a5fa'
};

const statusColor: Record<string, string> = {
  Operational: '#22c55e',
  Degraded: '#fbbf24',
  'Out of Service': '#f87171',
  'Under Maintenance': '#f59e0b',
  Decommissioned: '#94a3b8'
};

export const FacilityOperationsPanel: React.FC<FacilityOperationsPanelProps> = ({ assets, tickets }) => {
  const openTickets = useMemo(() => tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status)), [tickets]);
  const assetStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Operational: 0,
      Degraded: 0,
      'Out of Service': 0,
      'Under Maintenance': 0,
      Decommissioned: 0
    };

    for (const asset of assets) {
      counts[asset.status] = (counts[asset.status] ?? 0) + 1;
    }

    return counts;
  }, [assets]);

  return (
    <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Facility operations
          </p>
          <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.2rem' }}>Equipment monitoring & maintenance</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">{assets.length} assets</span>
          <span className="badge badge-warning">{openTickets.length} active tickets</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: '12px', padding: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80' }}>
            <Activity size={16} />
            <strong>Operational</strong>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.5rem' }}>{assetStatusCounts.Operational}</div>
        </div>
        <div style={{ background: 'rgba(251, 191, 36, 0.08)', borderRadius: '12px', padding: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
            <Wrench size={16} />
            <strong>Under repair</strong>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.5rem' }}>{assetStatusCounts['Under Maintenance'] + assetStatusCounts.Degraded}</div>
        </div>
        <div style={{ background: 'rgba(248, 113, 113, 0.08)', borderRadius: '12px', padding: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
            <AlertTriangle size={16} />
            <strong>Critical</strong>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.5rem' }}>{openTickets.filter((ticket) => ticket.severity === 'P1').length}</div>
        </div>
        <div style={{ background: 'rgba(96, 165, 250, 0.08)', borderRadius: '12px', padding: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
            <Gauge size={16} />
            <strong>Avg runtime</strong>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.5rem' }}>
            {assets.length ? `${Math.round(assets.reduce((total, asset) => total + asset.totalRunHours, 0) / assets.length)}h` : '0h'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Asset registry</h3>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {assets.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No facility assets are configured yet.</p>
            ) : (
              assets.slice(0, 6).map((asset) => (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel)', borderRadius: '12px', padding: '0.75rem 0.9rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{asset.tagCode}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{asset.model} · {asset.locationZone}</div>
                  </div>
                  <span
                    className="badge"
                    style={{ background: `${statusColor[asset.status] ?? '#64748b'}22`, color: statusColor[asset.status] ?? '#cbd5e1' }}
                  >
                    {asset.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Maintenance queue</h3>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {openTickets.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No open maintenance tickets.</p>
            ) : (
              openTickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} style={{ background: 'var(--panel)', borderRadius: '12px', padding: '0.75rem 0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong>{ticket.assetTag}</strong>
                    <span
                      className="badge"
                      style={{ background: `${severityColor[ticket.severity] ?? '#64748b'}22`, color: severityColor[ticket.severity] ?? '#cbd5e1' }}
                    >
                      {ticket.severity}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{ticket.issueType}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{ticket.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
