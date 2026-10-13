import React, { useState } from 'react';
import { Poll, User, VoteRecord, ScheduleSlot, Language } from '../types';
import { translations } from '../utils/i18n';
import { PollCard } from './PollCard';
import { CreatePollModal } from './CreatePollModal';
import { PollResultsModal } from './PollResultsModal';
import { AddUserModal } from './AddUserModal';
import { ShareUserModal } from './ShareUserModal';
import { ADMIN_GROUP } from '../utils/votingEngine';
import { Trash2, Plus, Download, Share2, Calendar, Lock } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  polls: Poll[];
  votes: VoteRecord[];
  groups: string[];
  schedules?: ScheduleSlot[];
  onNavigateSchedule?: () => void;
  onAddUser: (user: User) => void;
  onUpdateUserGroups: (userId: string, newGroups: string[]) => void;
  onDeleteUser: (userId: string) => void;
  onCreatePoll: (poll: Poll) => void;
  onDeletePoll: (pollId: string) => void;
  onAddGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  onOpenVote: (poll: Poll) => void;
  language: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  polls,
  votes,
  groups,
  schedules = [],
  onNavigateSchedule,
  onAddUser,
  onUpdateUserGroups,
  onDeleteUser,
  onCreatePoll,
  onDeletePoll,
  onAddGroup,
  onDeleteGroup,
  onOpenVote,
  language,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'polls' | 'activity' | 'users' | 'groups'>('polls');

  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [sharingUser, setSharingUser] = useState<User | null>(null);
  const [viewingResultsPoll, setViewingResultsPoll] = useState<Poll | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [activityPollFilter, setActivityPollFilter] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingUserGroupsId, setEditingUserGroupsId] = useState<string | null>(null);

  const handleExportCsv = () => {
    let csv = 'Voter,Code,Poll,Selection,WriteIn,SubmittedAt,Groups\n';
    votes.forEach((v) => {
      const p = polls.find((poll) => poll.id === v.pollId);
      const pollTitle = (p?.title || v.pollId).replace(/,/g, ' ');
      let sel = '';
      if (v.type === 'single') sel = v.value.singleOptionId || '';
      else if (v.type === 'ranked') sel = (v.value.rankedOptionIds || []).join(' > ');
      else if (v.type === 'yes_no') {
        const yesList: string[] = [];
        Object.entries(v.value.yesNoMap || {}).forEach(([id, yes]) => {
          if (yes) yesList.push(id);
        });
        sel = `Yes: ${yesList.join(';')}`;
      }
      sel = sel.replace(/,/g, ';');
      csv += `"${v.userName}","${v.userCode}","${pollTitle}","${sel}","${v.writeInText || ''}","${v.submittedAt}","${(v.groupsGranted || []).join(';')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `votora_votes_${Date.now()}.csv`;
    link.click();
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.code.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredVotes =
    activityPollFilter === 'all'
      ? votes
      : votes.filter((v) => v.pollId === activityPollFilter);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Top Header & Quick Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg">
        <div className="flex items-center gap-3 text-xs font-mono text-neutral-600 dark:text-neutral-400">
          <span>👥 {users.length} {t.metricUsers}</span>
          <span>·</span>
          <span>🗳 {polls.length} {t.metricPolls}</span>
          <span>·</span>
          <span>📊 {votes.length} {t.metricVotes}</span>
          <span>·</span>
          <span>📁 {groups.length} {t.metricGroups}</span>
          {onNavigateSchedule && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={onNavigateSchedule}
                className="hover:underline cursor-pointer font-bold text-neutral-800 dark:text-neutral-200"
              >
                📅 {schedules.length} {t.metricSlots} →
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className="px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer font-medium"
          >
            {t.addUserBtn}
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePoll(true)}
            className="px-2.5 py-1 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-semibold"
          >
            {t.createPollBtn}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-2 text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('polls')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium whitespace-nowrap ${
            activeTab === 'polls'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {t.tabPolls} ({polls.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {t.tabActivity} ({votes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {t.tabUsers} ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium whitespace-nowrap ${
            activeTab === 'groups'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {t.tabGroups} ({groups.length})
        </button>
      </div>

      {/* 1. POLLS TAB */}
      {activeTab === 'polls' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUser={currentUser}
              votes={votes}
              onOpenVote={onOpenVote}
              onOpenResults={(p) => setViewingResultsPoll(p)}
              onDeletePoll={onDeletePoll}
              language={language}
            />
          ))}
        </div>
      )}

      {/* 2. ACTIVITY & VOTES TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <select
              value={activityPollFilter}
              onChange={(e) => setActivityPollFilter(e.target.value)}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
            >
              <option value="all">{language === 'tr' ? 'Tüm Anketler' : 'All Polls'}</option>
              {polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-mono cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>{t.exportCsv}</span>
            </button>
          </div>

          {filteredVotes.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
              {t.noVotesYet}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVotes.map((v) => {
                const poll = polls.find((p) => p.id === v.pollId);
                let choiceText = '';
                if (v.type === 'single') {
                  const opt = poll?.options.find((o) => o.id === v.value.singleOptionId);
                  choiceText = opt?.text || v.value.singleOptionId || '-';
                } else if (v.type === 'ranked') {
                  const names = (v.value.rankedOptionIds || []).map((id, index) => {
                    const opt = poll?.options.find((o) => o.id === id);
                    return `${index + 1}. ${opt?.text || id}`;
                  });
                  choiceText = names.join(' > ');
                } else if (v.type === 'yes_no') {
                  const yesList: string[] = [];
                  const map = v.value.yesNoMap || {};
                  poll?.options.forEach((opt) => {
                    if (map[opt.id] === true) yesList.push(opt.text);
                  });
                  choiceText = yesList.length > 0 ? `Evet: ${yesList.join(', ')}` : 'Hayır';
                }

                return (
                  <div
                    key={v.id}
                    className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{v.userName}</span>
                        <span className="font-mono text-[11px] text-neutral-400">({v.userCode})</span>
                        <span className="text-[11px] text-neutral-500 truncate max-w-[140px]">· {poll?.title}</span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-300 mt-0.5 overflow-x-auto whitespace-nowrap">
                        {choiceText}
                        {v.writeInText && (
                          <span className="text-neutral-500 font-mono text-[11px] ml-1">
                            [Öneri: "{v.writeInText}"]
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono text-neutral-400 shrink-0">
                      {new Date(v.submittedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder={t.filterUsers}
            className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
          />

          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{u.name}</span>
                    <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200 shrink-0">
                      {u.code}
                    </span>
                    {u.role === 'admin' && (
                      <span className="text-[10px] text-neutral-500 font-mono">★ admin</span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1 flex-wrap">
                    <span>{u.groups.join(', ') || t.noGroups}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUserGroupsId(editingUserGroupsId === u.id ? null : u.id)
                      }
                      className="text-neutral-700 dark:text-neutral-300 underline ml-1 cursor-pointer"
                    >
                      [{t.editGroups}]
                    </button>
                  </div>

                  {editingUserGroupsId === u.id && (
                    <div className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800">
                      {u.role === 'admin' ? (
                        <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>{t.adminGroupLocked}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {groups.map((g) => {
                            const hasGrp = u.groups.includes(g);
                            const isAdminGroup = g === ADMIN_GROUP;
                            return (
                              <button
                                key={g}
                                type="button"
                                disabled={isAdminGroup}
                                title={isAdminGroup ? t.adminGroupReserved : undefined}
                                onClick={() => {
                                  const next = hasGrp
                                    ? u.groups.filter((item) => item !== g)
                                    : [...u.groups, g];
                                  onUpdateUserGroups(u.id, next);
                                }}
                                className={`px-2 py-0.5 text-[10px] rounded ${
                                  isAdminGroup
                                    ? 'cursor-not-allowed opacity-40 bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                    : 'cursor-pointer'
                                } ${
                                  !isAdminGroup && hasGrp
                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                    : !isAdminGroup
                                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                      : ''
                                }`}
                              >
                                {g} {isAdminGroup ? '★' : hasGrp ? '✓' : '+'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSharingUser(u)}
                    className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                    title={t.shareViaApp}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-500 cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. GROUPS TAB */}
      {activeTab === 'groups' && (
        <div className="space-y-3">
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t.newGroupNamePlaceholder}
              className="flex-1 px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-medium"
            >
              {t.addGroupBtn}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.map((grp) => {
              const members = users.filter((u) => u.groups.includes(grp));
              return (
                <div
                  key={grp}
                  className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-neutral-100">{grp}</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      {members.length} {t.membersCount} ({members.map((m) => m.name).join(', ')})
                    </div>
                  </div>
                  {grp !== 'Friends' && grp !== ADMIN_GROUP && (
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(grp)}
                      className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreatePoll && (
        <CreatePollModal
          groups={groups}
          currentAdminCode={currentUser.code}
          onSave={(p) => {
            onCreatePoll(p);
            setShowCreatePoll(false);
          }}
          onClose={() => setShowCreatePoll(false)}
          language={language}
        />
      )}

      {showAddUser && (
        <AddUserModal
          existingUsers={users}
          onSave={(u) => {
            onAddUser(u);
            setShowAddUser(false);
            setSharingUser(u);
          }}
          onClose={() => setShowAddUser(false)}
          language={language}
        />
      )}

      {sharingUser && (
        <ShareUserModal
          user={sharingUser}
          onClose={() => setSharingUser(null)}
          language={language}
        />
      )}

      {viewingResultsPoll && (
        <PollResultsModal
          poll={viewingResultsPoll}
          votes={votes}
          users={users}
          currentUser={currentUser}
          onClose={() => setViewingResultsPoll(null)}
          language={language}
        />
      )}
    </div>
  );
};
