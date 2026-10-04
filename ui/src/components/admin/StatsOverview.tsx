import React from 'react';
import { Users, UserCheck, DollarSign, Clock, AlertCircle } from 'lucide-react';
import type { Member } from '../../types';

interface StatsOverviewProps {
  members: Member[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ members }) => {
  const total = members.length;
  const activeMembers = members.filter((m) => m.membership.status === 'active');
  const activePercentage = total > 0 ? Math.round((activeMembers.length / total) * 100) : 0;

  // Monthly revenue estimate
  const monthlyRevenue = activeMembers.reduce((sum, m) => sum + (m.membership.pricePerMonth || 0), 0);

  // Expiring soon (within next 30 days)
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  const expiringSoonCount = members.filter((m) => {
    if (m.membership.status !== 'active') return false;
    const end = new Date(m.membership.endDate);
    return end >= now && end <= thirtyDaysLater;
  }).length;

  // Overdue payments count
  const overdueCount = members.filter((m) => m.membership.paymentStatus === 'overdue').length;

  return (
    <div className="metrics-grid">
      <div className="glass-panel stat-card highlight">
        <div className="stat-header">
          <span className="stat-title">Total Members</span>
          <div className="stat-icon-wrapper" style={{ color: 'var(--accent-primary)' }}>
            <Users size={18} />
          </div>
        </div>
        <div className="stat-value">{total}</div>
        <div className="stat-footer">
          <span>Registered in studio database</span>
        </div>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <span className="stat-title">Active Members</span>
          <div className="stat-icon-wrapper" style={{ color: '#38bdf8' }}>
            <UserCheck size={18} />
          </div>
        </div>
        <div className="stat-value">{activeMembers.length}</div>
        <div className="stat-footer">
          <span style={{ color: '#34d399', fontWeight: 600 }}>{activePercentage}%</span>
          <span>of total membership</span>
        </div>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <span className="stat-title">Monthly MRR</span>
          <div className="stat-icon-wrapper" style={{ color: '#a78bfa' }}>
            <DollarSign size={18} />
          </div>
        </div>
        <div className="stat-value">${monthlyRevenue.toLocaleString()}</div>
        <div className="stat-footer">
          <span>Recurring monthly subscriptions</span>
        </div>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <span className="stat-title">Expiring &lt; 30 Days</span>
          <div className="stat-icon-wrapper" style={{ color: '#fbbf24' }}>
            <Clock size={18} />
          </div>
        </div>
        <div className="stat-value" style={{ color: expiringSoonCount > 0 ? '#fbbf24' : 'inherit' }}>
          {expiringSoonCount}
        </div>
        <div className="stat-footer">
          <span>Members needing renewal review</span>
        </div>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <span className="stat-title">Payment Attention</span>
          <div className="stat-icon-wrapper" style={{ color: '#f43f5e' }}>
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="stat-value" style={{ color: overdueCount > 0 ? '#f43f5e' : 'inherit' }}>
          {overdueCount}
        </div>
        <div className="stat-footer">
          <span>Members with overdue accounts</span>
        </div>
      </div>
    </div>
  );
};
