import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../utils/i18n';
import { AddUserModal } from './AddUserModal';
import { ShareUserModal } from './ShareUserModal';
import { ADMIN_GROUP } from '../utils/votingEngine';
import { Trash2, Plus, Share2, Users, FolderPlus, Lock } from 'lucide-react';

interface UsersManagementViewProps {
  currentUser: User;
  users: User[];
  groups: string[];
  onAddUser: (user: User) => void;
  onUpdateUserGroups: (userId: string, newGroups: string[]) => void;
  onDeleteUser: (userId: string) => void;
  onAddGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  language: Language;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  currentUser,
  users,
  groups,
  onAddUser,
  onUpdateUserGroups,
  onDeleteUser,
  onAddGroup,
  onDeleteGroup,
  language,
}) => {
  const t = translations[language];

  const [showAddUser, setShowAddUser] = useState(false);
  const [sharingUser, setSharingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingUserGroupsId, setEditingUserGroupsId] = useState<string | null>(null);
  const [groupFeedback, setGroupFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      setGroupFeedback({
        type: 'error',
        text: language === 'tr' ? 'Lütfen bir grup adı girin.' : 'Please enter a group name.',
      });
      return;
    }
    if (groups.some((g) => g.toLowerCase() === name.toLowerCase())) {
      setGroupFeedback({
        type: 'error',
        text: language === 'tr' ? 'Bu isimde bir grup zaten var.' : 'A group with this name already exists.',
      });
      return;
    }
    onAddGroup(name);
    setNewGroupName('');
    setGroupFeedback({
      type: 'success',
      text: language === 'tr' ? `"${name}" grubu eklendi.` : `Group "${name}" added.`,
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.code.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* SECTION 1: USERS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.tabUsers} ({users.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className="px-3 py-1.5 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addUserBtn}</span>
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder={t.filterUsers}
          className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
        />

        {/* Users list */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
              {language === 'tr' ? 'Kullanıcı bulunamadı.' : 'No users found.'}
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {u.name}
                    </span>
                    {u.code && (
                      <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200 shrink-0">
                        {u.code}
                      </span>
                    )}
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
                  {u.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => setSharingUser(u)}
                      className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                      title={t.shareViaApp}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(language === 'tr' ? `${u.name} kullanıcısını silmek istediğinize emin misiniz?` : `Delete user ${u.name}?`)) {
                          onDeleteUser(u.id);
                        }
                      }}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-500 cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: GROUPS (UNDER USERS) */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {t.tabGroups} ({groups.length})
            </h3>
          </div>
        </div>

        {/* Add Group Form */}
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              if (groupFeedback) setGroupFeedback(null);
            }}
            placeholder={t.newGroupNamePlaceholder}
            className="flex-1 px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
          />
          <button
            type="submit"
            title={t.addGroupBtn}
            className="px-3.5 py-1.5 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-medium"
          >
            {t.addGroupBtn}
          </button>
        </form>

        {groupFeedback && (
          <div
            className={`px-3 py-1.5 text-xs rounded border ${
              groupFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400'
            }`}
          >
            {groupFeedback.text}
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {groups.length === 0 && (
            <div className="col-span-full text-center py-6 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
              {language === 'tr' ? 'Henüz grup yok.' : 'No groups yet.'}
            </div>
          )}
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
                    onClick={() => {
                      if (window.confirm(language === 'tr' ? `${grp} grubunu silmek istediğinize emin misiniz?` : `Delete group ${grp}?`)) {
                        onDeleteGroup(grp);
                      }
                    }}
                    className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showAddUser && (
        <AddUserModal
          existingUsers={users}
          onSave={(u) => {
            onAddUser(u);
            setShowAddUser(false);
            // Admin codes are never shared or displayed.
            if (u.role !== 'admin') {
              setSharingUser(u);
            }
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
    </div>
  );
};
