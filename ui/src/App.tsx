import React, { useState, useEffect } from 'react';
import type { UserRole, Member, StudioDetails, ToastMessage } from './types';
import { storageService } from './services/storageService';
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

  // Load initial data
  useEffect(() => {
    const loadedMembers = storageService.getMembers();
    const loadedStudio = storageService.getStudioDetails();

    setMembers(loadedMembers);
    setStudio(loadedStudio);

    if (loadedMembers.length > 0) {
      setSelectedMemberId(loadedMembers[0].id);
    }
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

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Admin Handler: Add Member
  const handleAddMember = (memberData: Partial<Member>) => {
    try {
      const created = storageService.addMember(memberData as any);
      setMembers(storageService.getMembers());
      addToast(
        'Member Registered',
        `Successfully registered ${created.name} under ${created.membership.tier} tier.`,
        'success'
      );
    } catch (err) {
      addToast('Error', 'Failed to register member.', 'error');
    }
  };

  // Admin / Member Handler: Update Member
  const handleUpdateMember = (id: string, updates: Partial<Member>) => {
    try {
      const updated = storageService.updateMember(id, updates);
      setMembers(storageService.getMembers());
      addToast(
        'Membership Updated',
        `Changes saved for member ${updated.name}.`,
        'success'
      );
    } catch (err) {
      addToast('Error', 'Failed to update member.', 'error');
    }
  };

  // Admin Handler: Delete Member
  const handleDeleteMember = (id: string) => {
    try {
      const target = members.find((m) => m.id === id);
      storageService.deleteMember(id);
      const remaining = storageService.getMembers();
      setMembers(remaining);

      // If deleted member was selected in member portal, switch to first remaining
      if (selectedMemberId === id && remaining.length > 0) {
        setSelectedMemberId(remaining[0].id);
      }

      addToast(
        'Membership Cancelled',
        `Removed record for ${target?.name || id}.`,
        'warning'
      );
    } catch (err) {
      addToast('Error', 'Failed to delete member.', 'error');
    }
  };

  // Admin Handler: Quick Renew (+1 Month)
  const handleQuickRenew = (member: Member) => {
    const currentEnd = new Date(member.membership.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + 1);

    const updated = storageService.updateMember(member.id, {
      membership: {
        ...member.membership,
        endDate: newEnd.toISOString().split('T')[0],
        status: 'active',
        paymentStatus: 'paid'
      }
    });

    setMembers(storageService.getMembers());
    addToast(
      'Membership Renewed',
      `Extended ${member.name}'s membership by 1 month (Valid until ${updated.membership.endDate}).`,
      'success'
    );
  };

  // Reset Demo Data
  const handleResetData = () => {
    const { members: defaultMembers, studio: defaultStudio } = storageService.resetToDefaults();
    setMembers(defaultMembers);
    setStudio(defaultStudio);
    if (defaultMembers.length > 0) {
      setSelectedMemberId(defaultMembers[0].id);
    }
    addToast('Demo Data Reset', 'Restored initial stub gym members and studio details.', 'info');
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
      />

      <main className="main-content">
        {role === 'admin' ? (
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
