import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthenticatedUser, Member, StudioDetails, ToastMessage } from './types';
import { apiService } from './services/apiService';
import { Header } from './components/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MemberPortal } from './components/member/MemberPortal';
import { EnrollmentWizard } from './components/member/EnrollmentWizard';
import { LoginScreen } from './components/LoginScreen';
import { Toast } from './components/Toast';
import type { EnrollmentResult } from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [studio, setStudio] = useState<StudioDetails | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const toastIdSequence = useRef(0);

  const loadUserData = useCallback(async (authenticatedUser: AuthenticatedUser) => {
    const [loadedMembers, loadedStudio] = await Promise.all([
      authenticatedUser.role === 'member' && authenticatedUser.memberId
        ? apiService.getMember(authenticatedUser.memberId).then((member) => member ? [member] : [])
        : apiService.getMembers(),
      apiService.getStudioDetails()
    ]);
    setMembers(loadedMembers);
    setStudio(loadedStudio);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      setIsLoading(true);
      const online = await apiService.checkHealth();
      setIsApiOnline(online);
      try {
        const session = await apiService.getCurrentUser();
        const loadedStudio = await apiService.getStudioDetails();
        setStudio(loadedStudio);
        if (session) {
          setUser(session.user);
          await loadUserData(session.user);
        }
      } catch (error) {
        console.error('Failed to restore the authenticated session', error);
      }
      setIsLoading(false);
    }

    void restoreSession();
  }, [loadUserData]);

  const handleLogin = async (email: string, password: string) => {
    const session = await apiService.login(email, password);
    setUser(session.user);
    await loadUserData(session.user);
    setIsApiOnline(true);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setMembers([]);
      setStudio(null);
      setIsApiOnline(true);
    } catch (error) {
      addToast('Sign-out failed', error instanceof Error ? error.message : 'Unable to end the session.', 'error');
    }
  };

  // Toast Helper
  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${++toastIdSequence.current}`;
    const newToast: ToastMessage = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Admin / Member Handler: Update Member
  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    const updated = await apiService.updateMember(id, updates);
    if (user?.role === 'member') setMembers([updated]);
    else setMembers(await apiService.getMembers());
    setIsApiOnline(apiService.isApiOnline);
  };

  const handleMemberChanged = (member: Member) => {
    setMembers((current) => current.map((item) => item.id === member.id ? member : item));
    setIsApiOnline(apiService.isApiOnline);
  };

  const handleReviewDuplicate = async (member: Member) => {
    try {
      const updated = await apiService.reviewMemberDuplicate(member.id, 'reviewed');
      setMembers((current) => current.map((item) => item.id === member.id ? updated : item));
      addToast('Duplicate review saved', `${member.name} is marked as reviewed.`, 'success');
    } catch (error) {
      addToast('Duplicate review failed', error instanceof Error ? error.message : 'The review could not be saved.', 'error');
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
        'Offline payment recorded',
        `Extended ${member.name}'s membership through ${updated.membership.endDate}.`,
        'success'
      );
    } catch (error) {
      addToast('Renewal failed', error instanceof Error ? error.message : 'Failed to renew membership.', 'error');
    }
  };

  const handleActivateMember = async (member: Member) => {
    try {
      const updated = await apiService.activateMember(member.id);
      setMembers((current) => current.map((item) => item.id === member.id ? updated : item));
      addToast('Membership activated', `${member.name} was activated after offline payment confirmation.`, 'success');
    } catch (error) {
      addToast('Activation failed', error instanceof Error ? error.message : 'Membership could not be activated.', 'error');
    }
  };

  // Reset Demo Data
  const handleResetData = async () => {
    try {
      const { members: defaultMembers, studio: defaultStudio } = await apiService.resetData();
      setMembers(defaultMembers);
      setStudio(defaultStudio);
      setIsApiOnline(apiService.isApiOnline);
      addToast('Database Reset', 'Restored initial stub gym members and studio details.', 'info');
    } catch {
      addToast('Error', 'Failed to reset database.', 'error');
    }
  };

  const handleEnrollmentCompleted = (result: EnrollmentResult) => {
    if (user?.role === 'admin' || user?.role === 'staff') {
      void loadUserData(user).catch((error: unknown) => {
        addToast('Enrollment saved', error instanceof Error ? error.message : 'Member directory refresh failed.', 'warning');
      });
    } else {
      setMembers([result.member]);
      setUser(result.user);
    }
    setIsApiOnline(true);
  };

  return (
    <div className="app-container">
      <Header
        user={user}
        onLogout={() => { void handleLogout(); }}
        onResetData={handleResetData}
        isApiOnline={isApiOnline}
        onStartEnrollment={() => setIsEnrollmentOpen(true)}
        enrollmentOpen={isEnrollmentOpen}
      />

      <main className="main-content">
        {isEnrollmentOpen ? (
          <EnrollmentWizard
            onClose={() => setIsEnrollmentOpen(false)}
            onCompleted={handleEnrollmentCompleted}
          />
        ) : isLoading ? (
          <div className="empty-state">
            <h3>Connecting to Gym Studio Database...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Loading member profiles and studio configurations.
            </p>
          </div>
        ) : !user ? (
          <LoginScreen onLogin={handleLogin} onJoin={() => setIsEnrollmentOpen(true)} />
        ) : user.role === 'admin' || user.role === 'staff' || user.role === 'franchise-owner' ? (
          <AdminDashboard
            members={members}
            canManageMembers={user.role === 'admin' || user.role === 'staff'}
            canDeleteMembers={user.role === 'admin'}
            canRenewMemberships={user.role === 'admin' || user.role === 'staff'}
            canActivateMembers={user.role === 'admin' || user.role === 'staff'}
            canManageTeam={user.role === 'admin'}
            onStartEnrollment={() => setIsEnrollmentOpen(true)}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onQuickRenew={handleQuickRenew}
            onActivateMember={handleActivateMember}
            onReviewIdentity={(member) => { void handleReviewDuplicate(member); }}
            onToast={addToast}
          />
        ) : members[0] && studio ? (
          <MemberPortal
            member={members[0]}
            studio={studio}
            onUpdateMember={handleUpdateMember}
            onMemberChanged={handleMemberChanged}
            onToast={addToast}
          />
        ) : (
          <div className="empty-state">
            <h3>Membership not found</h3>
            <p>Your account is not linked to a member record. Contact the studio administrator.</p>
          </div>
        )}
      </main>

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
