import React, { useState, useEffect } from 'react';
import { User, Poll, VoteRecord, Language, Theme, PollOption, ScheduleSlot } from './types';
import {
  loadAppState,
  saveAppState,
  resetAppStateToDefaults,
  AppState,
} from './utils/storage';
import { setLoginCookie, getLoginCookie, removeLoginCookie } from './utils/cookie';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { UsersManagementView } from './components/UsersManagementView';
import { VoterView } from './components/VoterView';
import { VotingModal } from './components/VotingModal';
import { ScheduleView } from './components/ScheduleView';
import { sortScheduleSlots } from './utils/votingEngine';

export default function App() {
  // App state
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Settings: Language & Theme
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('votora_lang');
    if (saved === 'en' || saved === 'tr') return saved;
    return 'tr';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('votora_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  const [activeView, setActiveView] = useState<'polls' | 'schedule' | 'users'>('polls');
  const [adminVotingPoll, setAdminVotingPoll] = useState<Poll | null>(null);

  // Initialize theme class on <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('votora_theme', theme);
  }, [theme]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('votora_lang', language);
  }, [language]);

  // Sync state helper (always keeps schedules sorted deterministically)
  const updateState = (newState: AppState) => {
    const sortedState: AppState = {
      ...newState,
      schedules: sortScheduleSlots(newState.schedules || []),
    };
    setAppState(sortedState);
    saveAppState(sortedState);
  };

  // 1. Fetch remote SQLite data on mount, with dual fallback
  useEffect(() => {
    fetch('/api/state')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('API offline');
      })
      .then((data: AppState) => {
        if (data.users && data.polls && data.votes && data.groups) {
          updateState(data);

          const urlParams = new URLSearchParams(window.location.search);
          const queryCode = urlParams.get('code');
          const targetCode = queryCode || getLoginCookie();

          if (targetCode) {
            const found = data.users.find(
              (u) => u.code.toUpperCase() === targetCode.trim().toUpperCase()
            );
            if (found) {
              setCurrentUser(found);
              setActiveView('polls');
            }
          }
        }
      })
      .catch(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const queryCode = urlParams.get('code');
        const targetCode = queryCode || getLoginCookie();

        if (targetCode) {
          const found = appState.users.find(
            (u) => u.code.toUpperCase() === targetCode.trim().toUpperCase()
          );
          if (found) {
            setCurrentUser(found);
            setActiveView('polls');
          }
        }
      });
  }, []);

  // Login handler
  const handleLogin = (code: string, rememberMe: boolean): boolean => {
    const cleanCode = code.trim().toUpperCase();
    const user = appState.users.find((u) => u.code.toUpperCase() === cleanCode);

    if (!user) {
      return false;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode }),
    }).catch(() => {});

    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    const updatedUsers = appState.users.map((u) => (u.id === user.id ? updatedUser : u));
    updateState({ ...appState, users: updatedUsers });

    if (rememberMe) {
      setLoginCookie(user.code);
    } else {
      removeLoginCookie();
    }

    setCurrentUser(updatedUser);
    setActiveView('polls');

    if (window.location.search.includes('code=')) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    return true;
  };

  // Logout handler
  const handleLogout = () => {
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
    removeLoginCookie();
    setCurrentUser(null);
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'tr' ? 'en' : 'tr'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Submit vote handler
  const handleVoteSubmitted = (
    voteRecord: VoteRecord,
    updatedUserGroups?: string[],
    newPollOption?: PollOption
  ) => {
    const existingIndex = appState.votes.findIndex(
      (v) => v.pollId === voteRecord.pollId && v.userId === voteRecord.userId
    );
    let nextVotes = [...appState.votes];
    if (existingIndex >= 0) {
      nextVotes[existingIndex] = voteRecord;
    } else {
      nextVotes = [voteRecord, ...nextVotes];
    }

    let nextUsers = [...appState.users];
    if (updatedUserGroups && updatedUserGroups.length > 0) {
      nextUsers = nextUsers.map((u) =>
        u.id === voteRecord.userId ? { ...u, groups: updatedUserGroups } : u
      );
      if (currentUser && currentUser.id === voteRecord.userId) {
        setCurrentUser({ ...currentUser, groups: updatedUserGroups });
      }
    }

    let nextPolls = [...appState.polls];
    if (newPollOption) {
      nextPolls = nextPolls.map((poll) => {
        if (poll.id === voteRecord.pollId) {
          return {
            ...poll,
            options: [...poll.options, newPollOption],
          };
        }
        return poll;
      });
    }

    updateState({
      ...appState,
      votes: nextVotes,
      users: nextUsers,
      polls: nextPolls,
    });

    fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteRecord, updatedUserGroups, newPollOption }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.nextState) {
          updateState(data.nextState);
        }
      })
      .catch(() => {});
  };

  // User Management
  const handleAddUser = (newUser: User) => {
    const nextUsers = [...appState.users, newUser];
    updateState({ ...appState, users: nextUsers });

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => {});
  };

  const handleUpdateUserGroups = (userId: string, newGroups: string[]) => {
    const nextUsers = appState.users.map((u) =>
      u.id === userId ? { ...u, groups: newGroups } : u
    );
    updateState({ ...appState, users: nextUsers });
    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, groups: newGroups });
    }

    fetch(`/api/users/${userId}/groups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups: newGroups }),
    }).catch(() => {});
  };

  const handleDeleteUser = (userId: string) => {
    const nextUsers = appState.users.filter((u) => u.id !== userId);
    const nextVotes = appState.votes.filter((v) => v.userId !== userId);
    updateState({ ...appState, users: nextUsers, votes: nextVotes });

    fetch(`/api/users/${userId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Poll Management
  const handleCreatePoll = (newPoll: Poll) => {
    const nextPolls = [newPoll, ...appState.polls];
    updateState({ ...appState, polls: nextPolls });

    fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPoll),
    }).catch(() => {});
  };

  const handleDeletePoll = (pollId: string) => {
    const nextPolls = appState.polls.filter((p) => p.id !== pollId);
    const nextVotes = appState.votes.filter((v) => v.pollId !== pollId);
    updateState({ ...appState, polls: nextPolls, votes: nextVotes });

    fetch(`/api/polls/${pollId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Group Management
  const handleAddGroup = (groupName: string) => {
    const trimmed = groupName.trim();
    if (!trimmed || appState.groups.includes(trimmed)) return;
    const nextGroups = [...appState.groups, trimmed];
    updateState({ ...appState, groups: nextGroups });

    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => {});
  };

  const handleDeleteGroup = (groupName: string) => {
    const nextGroups = appState.groups.filter((g) => g !== groupName);
    const nextUsers = appState.users.map((u) => ({
      ...u,
      groups: u.groups.filter((g) => g !== groupName),
    }));
    const nextPolls = appState.polls.map((p) => ({
      ...p,
      targetGroups: p.targetGroups.filter((g) => g !== groupName),
    }));
    updateState({ ...appState, groups: nextGroups, users: nextUsers, polls: nextPolls });
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        groups: currentUser.groups.filter((g) => g !== groupName),
      });
    }

    fetch(`/api/groups/${encodeURIComponent(groupName)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Schedule Management
  const handleToggleAttendance = (slotId: string) => {
    if (!currentUser) return;
    const slot = appState.schedules.find((s) => s.id === slotId);
    if (!slot || slot.isCompleted) return;

    let attendeeIds = [...slot.attendeeIds];
    let attendeeNames = [...slot.attendeeNames];

    if (attendeeIds.includes(currentUser.id)) {
      const idx = attendeeIds.indexOf(currentUser.id);
      attendeeIds.splice(idx, 1);
      attendeeNames.splice(idx, 1);
    } else {
      attendeeIds.push(currentUser.id);
      attendeeNames.push(currentUser.name);
    }

    const updatedSlot = { ...slot, attendeeIds, attendeeNames };
    const nextSchedules = appState.schedules.map((s) => (s.id === slotId ? updatedSlot : s));
    updateState({ ...appState, schedules: nextSchedules });

    fetch(`/api/schedules/${slotId}/attend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.schedules) updateState({ ...appState, schedules: data.schedules });
      })
      .catch(() => {});
  };

  const handleSaveSlot = (slot: ScheduleSlot) => {
    const exists = appState.schedules.some((s) => s.id === slot.id);
    const nextSchedules = exists
      ? appState.schedules.map((s) => (s.id === slot.id ? slot : s))
      : [...appState.schedules, slot];
    updateState({ ...appState, schedules: nextSchedules });

    fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slot),
    }).catch(() => {});
  };

  const handleDeleteSlot = (slotId: string) => {
    const nextSchedules = appState.schedules.filter((s) => s.id !== slotId);
    updateState({ ...appState, schedules: nextSchedules });
    fetch(`/api/schedules/${slotId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleCompleteSlot = (slotId: string, isCompleted: boolean) => {
    const nextSchedules = appState.schedules.map((s) =>
      s.id === slotId ? { ...s, isCompleted } : s
    );
    updateState({ ...appState, schedules: nextSchedules });

    fetch(`/api/schedules/${slotId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    }).catch(() => {});
  };

  const handleUpdateAttendees = (slotId: string, attendeeIds: string[], attendeeNames: string[]) => {
    const nextSchedules = appState.schedules.map((s) =>
      s.id === slotId ? { ...s, attendeeIds, attendeeNames } : s
    );
    updateState({ ...appState, schedules: nextSchedules });

    fetch(`/api/schedules/${slotId}/attendees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendeeIds, attendeeNames }),
    }).catch(() => {});
  };

  const handleResetData = () => {
    fetch('/api/reset', { method: 'POST' })
      .then((res) => res.json())
      .then((res) => {
        if (res.state) {
          updateState(res.state);
        }
      })
      .catch(() => {
        const fresh = resetAppStateToDefaults();
        setAppState(fresh);
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {!currentUser ? (
        <LoginView
          onLogin={handleLogin}
          users={appState.users}
          language={language}
          onToggleLanguage={toggleLanguage}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          <Navbar
            currentUser={currentUser}
            onLogout={handleLogout}
            language={language}
            onToggleLanguage={toggleLanguage}
            theme={theme}
            onToggleTheme={toggleTheme}
            activeView={activeView}
            onChangeView={(view) => setActiveView(view)}
          />

          <main className="flex-1">
            {activeView === 'users' && currentUser.role === 'admin' ? (
              <UsersManagementView
                currentUser={currentUser}
                users={appState.users}
                groups={appState.groups}
                onAddUser={handleAddUser}
                onUpdateUserGroups={handleUpdateUserGroups}
                onDeleteUser={handleDeleteUser}
                onAddGroup={handleAddGroup}
                onDeleteGroup={handleDeleteGroup}
                language={language}
              />
            ) : activeView === 'schedule' ? (
              <ScheduleView
                schedules={appState.schedules}
                currentUser={currentUser}
                users={appState.users}
                groups={appState.groups}
                onToggleAttendance={handleToggleAttendance}
                onSaveSlot={handleSaveSlot}
                onDeleteSlot={handleDeleteSlot}
                onCompleteSlot={handleCompleteSlot}
                onUpdateAttendees={handleUpdateAttendees}
                language={language}
              />
            ) : (
              <VoterView
                currentUser={currentUser}
                polls={appState.polls}
                votes={appState.votes}
                users={appState.users}
                groups={appState.groups}
                onCreatePoll={handleCreatePoll}
                onDeletePoll={handleDeletePoll}
                onVoteSubmitted={handleVoteSubmitted}
                language={language}
              />
            )}
          </main>

          {adminVotingPoll && (
            <VotingModal
              poll={adminVotingPoll}
              currentUser={currentUser}
              existingVote={appState.votes.find(
                (v) => v.pollId === adminVotingPoll.id && v.userId === currentUser.id
              )}
              onVoteSubmitted={handleVoteSubmitted}
              onClose={() => setAdminVotingPoll(null)}
              language={language}
            />
          )}

          <footer className="border-t border-neutral-200 dark:border-neutral-800 py-3 text-center text-[11px] text-neutral-400 font-mono">
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
              <span>VOTORA</span>
              <button
                type="button"
                onClick={handleResetData}
                className="hover:underline cursor-pointer"
              >
                [{language === 'tr' ? 'Sıfırla' : 'Reset'}]
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
