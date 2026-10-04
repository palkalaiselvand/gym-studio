import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import type { Member, MembershipStatus } from '../../types';
import { StatsOverview } from './StatsOverview';
import { MemberModal } from './MemberModal';
import { MemberDeleteModal } from './MemberDeleteModal';

interface AdminDashboardProps {
  members: Member[];
  onAddMember: (memberData: Partial<Member>) => void;
  onUpdateMember: (id: string, memberData: Partial<Member>) => void;
  onDeleteMember: (id: string) => void;
  onQuickRenew: (member: Member) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onQuickRenew
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(query);
        const matchesEmail = member.email.toLowerCase().includes(query);
        const matchesPhone = member.phone.toLowerCase().includes(query);
        const matchesId = member.id.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) {
          return false;
        }
      }

      // Tier filter
      if (tierFilter !== 'ALL' && member.membership.tier !== tierFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'expiring_soon') {
          const now = new Date();
          const thirtyDays = new Date();
          thirtyDays.setDate(now.getDate() + 30);
          const end = new Date(member.membership.endDate);
          if (member.membership.status !== 'active' || end < now || end > thirtyDays) {
            return false;
          }
        } else if (member.membership.status !== statusFilter) {
          return false;
        }
      }

      // Payment filter
      if (paymentFilter !== 'ALL' && member.membership.paymentStatus !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [members, searchTerm, tierFilter, statusFilter, paymentFilter]);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const handleSaveModal = (data: Partial<Member>) => {
    if (editingMember) {
      onUpdateMember(editingMember.id, data);
    } else {
      onAddMember(data);
    }
  };

  // Helper to format days remaining
  const getDaysRemaining = (endDateStr: string, status: MembershipStatus) => {
    if (status === 'expired') return { text: 'Expired', isUrgent: true, expired: true };
    if (status === 'suspended') return { text: 'Suspended', isUrgent: false, expired: false };

    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isUrgent: true, expired: true };
    }
    if (diffDays === 0) {
      return { text: 'Expires today', isUrgent: true, expired: false };
    }
    if (diffDays <= 30) {
      return { text: `${diffDays} days left`, isUrgent: true, expired: false };
    }
    return { text: `${diffDays} days left`, isUrgent: false, expired: false };
  };

  return (
    <div>
      {/* Top Banner / Heading */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Membership Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Monitor gym member tiers, billing cycles, renewals, and studio access statuses.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={18} />
          <span>Register New Member</span>
        </button>
      </div>

      {/* Metrics Row */}
      <StatsOverview members={members} />

      {/* Filter and Search Bar */}
      <div className="glass-panel filter-bar">
        <div className="filter-left">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by member name, email, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tier Filter */}
          <select
            className="select-filter"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="ALL">All Tiers</option>
            <option value="Basic">Basic Plan</option>
            <option value="Silver">Silver Plan</option>
            <option value="Gold">Gold Plan</option>
            <option value="Platinum">Platinum Plan</option>
            <option value="VIP">VIP All-Inclusive</option>
          </select>

          {/* Status Filter */}
          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="expiring_soon">Expiring Soon (&lt;30d)</option>
            <option value="pending">Pending Approval</option>
            <option value="expired">Expired Memberships</option>
            <option value="suspended">Suspended Accounts</option>
          </select>

          {/* Payment Filter */}
          <select
            className="select-filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="ALL">All Billing</option>
            <option value="paid">Payment Cleared</option>
            <option value="pending">Invoice Pending</option>
            <option value="overdue">Overdue Payment</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredMembers.length}</strong> of {members.length} members
        </div>
      </div>

      {/* Members Table */}
      <div className="table-container">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Search size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No members match the filter criteria</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Try adjusting your search query or reset the filters.
            </p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setTierFilter('ALL');
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan Tier</th>
                <th>Status</th>
                <th>Validity & Expiration</th>
                <th>Billing</th>
                <th>Auto-Renew</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const daysInfo = getDaysRemaining(member.membership.endDate, member.membership.status);

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="member-avatar"
                        />
                        <div>
                          <span className="member-name">{member.name}</span>
                          <span className="member-email">{member.email}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            {member.phone} • <span style={{ fontFamily: 'var(--font-mono)' }}>{member.id}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-tier-${member.membership.tier}`}>
                        {member.membership.tier} (${member.membership.pricePerMonth}/mo)
                      </span>
                    </td>

                    <td>
                      <span className={`badge badge-status-${member.membership.status}`}>
                        <span className="badge-dot" />
                        {member.membership.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {member.membership.endDate}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: daysInfo.isUrgent ? '#fbbf24' : daysInfo.expired ? '#f43f5e' : 'var(--text-muted)',
                          fontWeight: daysInfo.isUrgent ? 600 : 400
                        }}
                      >
                        {daysInfo.text}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge-pay-${member.membership.paymentStatus}`}
                        style={{
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        {member.membership.paymentStatus === 'paid' && <Check size={14} />}
                        {member.membership.paymentStatus === 'overdue' && <AlertTriangle size={14} />}
                        {member.membership.paymentStatus}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: member.membership.autoRenew ? '#34d399' : 'var(--text-muted)',
                          fontWeight: 500
                        }}
                      >
                        {member.membership.autoRenew ? 'Enabled' : 'Manual'}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon"
                          title="Quick Renew (+1 Month)"
                          onClick={() => onQuickRenew(member)}
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit Membership Details"
                          onClick={() => handleOpenEdit(member)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Cancel / Delete Member"
                          onClick={() => handleOpenDelete(member)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      <MemberModal
        isOpen={isModalOpen}
        memberToEdit={editingMember}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
      />

      {/* Delete Confirmation Modal */}
      <MemberDeleteModal
        isOpen={isDeleteModalOpen}
        member={memberToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDeleteMember}
      />
    </div>
  );
};
