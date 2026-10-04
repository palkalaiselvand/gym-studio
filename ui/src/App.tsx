import React, { useState, useEffect } from 'react';
import type { UserRole, Member, StudioDetails, ToastMessage } from './types';
import { apiService } from './services/apiService';
import { Header } from './components/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MemberPortal } from './components/member/MemberPortal';
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('admin');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [studio, setStudio] = useState<StudioDetails | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from API / Local Cache
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const online = await apiService.checkHealth();
      setIsApiOnline(online);

      const [loadedMembers, loadedStudio] = await Promise.all([
        apiService.getMembers(),
        apiService.getStudioDetails()
      ]);

      setMembers(loadedMembers);
      setStudio(loadedStudio);

      if (loadedMembers.length > 0) {
        setSelectedMemberId(loadedMembers[0].id);
      }
      setIsLoading(false);
    }

    loadInitialData();
  }, []);

  // Toast Helper
  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Admin Handler: Add Member
  const handleAddMember = async (memberData: Partial<Member>) => {
    try {
      const created = await apiService.addMember(memberData);
      const refreshed = await apiService.getMembers();
      setMembers(refreshed);
      setIsApiOnline(apiService.isApiOnline);
      addToast(
        'Member Registered',
        `Successfully registered ${created.name} under ${created.membership.tier} tier.`,
        'success'
      );
    } catch {
      addToast('Error', 'Failed to register member.', 'error');
    }
  };

  // Admin / Member Handler: Update Member
  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    try {
      const updated = await apiService.updateMember(id, updates);
      const refreshed = await apiService.getMembers();
      setMembers(refreshed);
      setIsApiOnline(apiService.isApiOnline);
      addToast(
        'Membership Updated',
        `Changes saved for member ${updated.name}.`,
        'success'
      );
    } catch {
      addToast('Error', 'Failed to update member.', 'error');
    }
  };

  // Admin Handler: Delete Member
  const handleDeleteMember = async (id: string) => {
    try {
      const target = members.find((m) => m.id === id);
      await apiService.deleteMember(id);
      const remaining = await apiService.getMembers();
      setMembers(remaining);
      setIsApiOnline(apiService.isApiOnline);

      if (selectedMemberId === id && remaining.length > 0) {
        setSelectedMemberId(remaining[0].id);
      }

      addToast(
        'Membership Cancelled',
        `Removed record for ${target?.name || id}.`,
        'warning'
      );
    } catch {
      addToast('Error', 'Failed to delete member.', 'error');
    }
  };

  // Admin Handler: Quick Renew (+1 Month)
  const handleQuickRenew = async (member: Member) => {
    try {
      const updated = await apiService.quickRenew(member.id, 1);
      const refreshed = await apiService.getMembers();
      setMembers(refreshed);
      setIsApiOnline(apiService.isApiOnline);
      addToast(
        'Membership Renewed',
        `Extended ${member.name}'s membership by 1 month (Valid until ${updated.membership.endDate}).`,
        'success'
      );
    } catch {
      addToast('Error', 'Failed to renew membership.', 'error');
    }
  };

  // Reset Demo Data
  const handleResetData = async () => {
    try {
      const { members: defaultMembers, studio: defaultStudio } = await apiService.resetData();
      setMembers(defaultMembers);
      setStudio(defaultStudio);
      setIsApiOnline(apiService.isApiOnline);
      if (defaultMembers.length > 0) {
        setSelectedMemberId(defaultMembers[0].id);
      }
      addToast('Database Reset', 'Restored initial stub gym members and studio details.', 'info');
    } catch {
      addToast('Error', 'Failed to reset database.', 'error');
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  return (
    <div className="app-container">
      <Header
        currentRole={role}
        onRoleChange={setRole}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        onResetData={handleResetData}
        isApiOnline={isApiOnline}
      />

      <main className="main-content">
        {isLoading ? (
          <div className="empty-state">
            <h3>Connecting to Gym Studio Database...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Loading member profiles and studio configurations.
            </p>
          </div>
        ) : role === 'admin' ? (
          <AdminDashboard
            members={members}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onQuickRenew={handleQuickRenew}
          />
        ) : selectedMember && studio ? (
          <MemberPortal
            member={selectedMember}
            studio={studio}
            onUpdateMember={handleUpdateMember}
            onToast={addToast}
          />
        ) : (
          <div className="empty-state">
            <h3>No member found</h3>
            <p>Please register or select a member from the admin dashboard.</p>
          </div>
        )}
      </main>

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
