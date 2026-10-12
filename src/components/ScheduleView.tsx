import React, { useState } from 'react';
import { ScheduleSlot, User, Language } from '../types';
import { translations } from '../utils/i18n';
import {
  canUserSeeSchedule,
  canUserInteractSchedule,
  compareDateLabels,
  compareScheduleSlots,
  sortScheduleSlots,
} from '../utils/votingEngine';
import {
  Lock,
  Plus,
  Users,
  Check,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface ScheduleViewProps {
  schedules: ScheduleSlot[];
  currentUser: User;
  users: User[];
  groups: string[];
  onToggleAttendance: (slotId: string) => void;
  onSaveSlot: (slot: ScheduleSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onCompleteSlot: (slotId: string, isCompleted: boolean) => void;
  onUpdateAttendees: (slotId: string, attendeeIds: string[], attendeeNames: string[]) => void;
  language: Language;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  currentUser,
  users,
  groups,
  onToggleAttendance,
  onSaveSlot,
  onDeleteSlot,
  onCompleteSlot,
  onUpdateAttendees,
  language,
}) => {
  const t = translations[language];

  // Modals
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingAttendeesSlot, setViewingAttendeesSlot] = useState<ScheduleSlot | null>(null);

  // Filter option: all | attended | missed | upcoming
  const [filterMode, setFilterMode] = useState<'all' | 'attended' | 'missed' | 'upcoming'>('all');

  // Filter schedules visible to current user and sort deterministically
  const visibleSchedules = schedules.filter((s) => canUserSeeSchedule(currentUser, s));
  const filteredSchedules = visibleSchedules.filter((slot) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'upcoming') return !slot.isCompleted;
    if (filterMode === 'attended') {
      return slot.isCompleted && slot.attendeeIds.includes(currentUser.id);
    }
    if (filterMode === 'missed') {
      return slot.isCompleted && !slot.attendeeIds.includes(currentUser.id);
    }
    return true;
  });

  const sortedVisibleSchedules = sortScheduleSlots(filteredSchedules);

  // Group slots by dateLabel
  const dateGroupsMap = new Map<string, ScheduleSlot[]>();
  sortedVisibleSchedules.forEach((slot) => {
    if (!dateGroupsMap.has(slot.dateLabel)) {
      dateGroupsMap.set(slot.dateLabel, []);
    }
    dateGroupsMap.get(slot.dateLabel)!.push(slot);
  });

  // Sort slots inside each day deterministically (e.g. 16:30 before 20:30)
  dateGroupsMap.forEach((slots) => {
    slots.sort(compareScheduleSlots);
  });

  // Sort date labels chronologically so event columns NEVER change position when voting/attending
  const uniqueDateLabels = Array.from(dateGroupsMap.keys()).sort(compareDateLabels);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>📅</span>
            <span>{t.scheduleTitle}</span>
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            {t.scheduleSubtitle}
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-2.5 py-1 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addSlotBtn}</span>
          </button>
        )}
      </div>

      {/* Filter / Attendance status tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
            filterMode === 'all'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          {t.allSessions} ({visibleSchedules.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('upcoming')}
          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
            filterMode === 'upcoming'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          {t.upcomingFilter} ({visibleSchedules.filter((s) => !s.isCompleted).length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('attended')}
          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filterMode === 'attended'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{t.myAttendedFilter}</span>
          <span className="text-[10px] opacity-75 font-mono">
            ({visibleSchedules.filter((s) => s.isCompleted && s.attendeeIds.includes(currentUser.id)).length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('missed')}
          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filterMode === 'missed'
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-rose-700 dark:hover:text-rose-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>{t.myMissedFilter}</span>
          <span className="text-[10px] opacity-75 font-mono">
            ({visibleSchedules.filter((s) => s.isCompleted && !s.attendeeIds.includes(currentUser.id)).length})
          </span>
        </button>
      </div>

      {/* Grid container matching the user's reference image */}
      {uniqueDateLabels.length === 0 ? (
        <div className="text-center py-12 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
          {t.noSlotsYet}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {uniqueDateLabels.map((dateLabel) => {
            const slots = dateGroupsMap.get(dateLabel) || [];
            return (
              <div
                key={dateLabel}
                className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between text-center min-h-[220px]"
              >
                {/* Date Header: e.g. "10.10 Cmrts" */}
                <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800 font-serif font-black italic tracking-wide text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
                  {dateLabel}
                </div>

                {/* Slots stack inside this day */}
                <div className="py-2 space-y-3 flex-1 flex flex-col justify-center">
                  {slots.map((slot) => {
                    const isAttending = slot.attendeeIds.includes(currentUser.id);
                    const canInteract = canUserInteractSchedule(currentUser, slot);
                    const attendeeCount = slot.attendeeIds.length;
                    const hasUserAttended = slot.isCompleted && isAttending;
                    const hasUserMissed = slot.isCompleted && !isAttending;

                    return (
                      <div
                        key={slot.id}
                        className={`space-y-1 p-1 rounded-md transition-colors ${
                          hasUserAttended
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : hasUserMissed
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : ''
                        }`}
                      >
                        {/* Time & attendance indicator */}
                        <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-400">
                          <span>{slot.time}</span>
                          {slot.isCompleted && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-sans font-bold ${
                                isAttending
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                              }`}
                              title={isAttending ? t.attendedBadge : t.missedBadge}
                            >
                              {isAttending ? '✓' : '✕'}
                            </span>
                          )}
                        </div>

                        {/* Square badge matching the reference image */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => setViewingAttendeesSlot(slot)}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center leading-none transition-transform hover:scale-105 cursor-pointer ${
                              slot.isCompleted
                                ? isAttending
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                                  : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                                : isAttending
                                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                : 'border-neutral-800 dark:border-neutral-200 bg-transparent text-neutral-900 dark:text-neutral-100'
                            }`}
                            title={
                              slot.isCompleted
                                ? `${attendeeCount} ${t.attendeesCount} (${isAttending ? t.attendedBadge : t.missedBadge})`
                                : `${attendeeCount} ${language === 'tr' ? 'olası katılımcı' : 'possible attendees'}`
                            }
                          >
                            {slot.isCompleted ? (
                              <span className="font-bold text-base sm:text-lg">
                                {attendeeCount}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center justify-center leading-none">
                                <span className="font-bold text-sm sm:text-base leading-none">
                                  ?
                                </span>
                                {attendeeCount > 0 && (
                                  <span className="text-[10px] font-mono leading-none text-neutral-400 dark:text-neutral-500 mt-0.5">
                                    ({attendeeCount})
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        </div>

                        {/* What we are watching / note */}
                        <div className="text-[11px] leading-tight pt-0.5">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {slot.watchTitle || '?'}
                          </div>
                          {slot.seasonEpisode && (
                            <div className="text-[10px] text-neutral-500 truncate font-sans">
                              {slot.seasonEpisode}
                            </div>
                          )}
                        </div>

                        {/* Attendance / Admin Controls */}
                        <div className="pt-1 flex flex-col items-center gap-1">
                          {slot.isCompleted ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                                  isAttending
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                {isAttending ? (
                                  <span>{t.attendedBadge}</span>
                                ) : (
                                  <span>{t.missedBadge}</span>
                                )}
                              </span>
                              <span className="text-[9px] text-neutral-400 font-mono flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{t.completedBadge}</span>
                              </span>
                            </div>
                          ) : canInteract ? (
                            <button
                              type="button"
                              onClick={() => onToggleAttendance(slot.id)}
                              className={`w-full py-1 px-1 text-[10px] rounded font-semibold transition-colors cursor-pointer ${
                                isAttending
                                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                  : 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {isAttending ? t.attendingBtn : t.attendBtn}
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              🔒 {t.lockedToGroup}
                            </span>
                          )}

                          {/* Admin Edit button */}
                          {currentUser.role === 'admin' && (
                            <div className="pt-0.5 w-full">
                              <button
                                type="button"
                                onClick={() => setEditingSlot(slot)}
                                className="w-full py-0.5 px-1 text-[10px] rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer flex items-center justify-center gap-1"
                                title={t.editSlotBtn}
                              >
                                <span>✎</span>
                                <span>{t.editSlotBtn}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Attendees List / Admin Fix Attendance */}
      {viewingAttendeesSlot && (
        <AttendeesModal
          slot={viewingAttendeesSlot}
          users={users}
          currentUser={currentUser}
          onClose={() => setViewingAttendeesSlot(null)}
          onUpdateAttendees={(ids, names) => {
            onUpdateAttendees(viewingAttendeesSlot.id, ids, names);
            setViewingAttendeesSlot({
              ...viewingAttendeesSlot,
              attendeeIds: ids,
              attendeeNames: names,
            });
          }}
          onToggleAttendance={() => {
            onToggleAttendance(viewingAttendeesSlot.id);
            setViewingAttendeesSlot(null);
          }}
          language={language}
        />
      )}

      {/* MODAL 2: Create / Edit Slot */}
      {(isCreating || editingSlot) && (
        <EditSlotModal
          slot={editingSlot}
          groups={groups}
          users={users}
          onSave={(slot) => {
            onSaveSlot(slot);
            setIsCreating(false);
            setEditingSlot(null);
          }}
          onDelete={(id) => {
            onDeleteSlot(id);
            setEditingSlot(null);
          }}
          onClose={() => {
            setIsCreating(false);
            setEditingSlot(null);
          }}
          language={language}
        />
      )}
    </div>
  );
};

interface AttendeesModalProps {
  slot: ScheduleSlot;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateAttendees: (ids: string[], names: string[]) => void;
  onToggleAttendance: () => void;
  language: Language;
}

const AttendeesModal: React.FC<AttendeesModalProps> = ({
  slot,
  users,
  currentUser,
  onClose,
  onUpdateAttendees,
  onToggleAttendance,
  language,
}) => {
  const t = translations[language];
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  const handleRemoveUser = (userId: string) => {
    const nextIds = slot.attendeeIds.filter((id) => id !== userId);
    const nextNames = slot.attendeeNames.filter((_, idx) => slot.attendeeIds[idx] !== userId);
    onUpdateAttendees(nextIds, nextNames);
  };

  const handleAddUser = () => {
    if (!selectedUserToAdd) return;
    const user = users.find((u) => u.id === selectedUserToAdd);
    if (!user || slot.attendeeIds.includes(user.id)) return;
    const nextIds = [...slot.attendeeIds, user.id];
    const nextNames = [...slot.attendeeNames, user.name];
    onUpdateAttendees(nextIds, nextNames);
    setSelectedUserToAdd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {slot.dateLabel} · {slot.time}
            </h3>
            <span className="text-[11px] text-neutral-500 font-mono">
              {slot.watchTitle} {slot.seasonEpisode ? `(${slot.seasonEpisode})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between font-mono text-[11px] text-neutral-500">
            <span>{t.attendeesModalTitle}:</span>
            <span>{slot.attendeeIds.length} {t.attendeesCount}</span>
          </div>

          {slot.attendeeIds.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs">
              {language === 'tr' ? 'Henüz kimse katılım işaretlemedi.' : 'No attendees marked yet.'}
            </div>
          ) : (
            <div className="space-y-1">
              {slot.attendeeIds.map((id, index) => {
                const name = slot.attendeeNames[index] || id;
                return (
                  <div
                    key={id}
                    className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {name}
                    </span>
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(id)}
                        className="text-neutral-400 hover:text-red-500 text-[10px] font-mono cursor-pointer"
                      >
                        [✕]
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Admin manual add user */}
          {currentUser.role === 'admin' && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
              <span className="block text-[11px] text-neutral-500 font-mono">
                {t.addAttendeeAdmin}:
              </span>
              <div className="flex gap-1.5">
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs"
                >
                  <option value="">{language === 'tr' ? 'Kullanıcı seç...' : 'Select user...'}</option>
                  {users
                    .filter((u) => !slot.attendeeIds.includes(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddUser}
                  className="px-2.5 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-medium cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2 bg-neutral-50 dark:bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditSlotModalProps {
  slot: ScheduleSlot | null;
  groups: string[];
  users: User[];
  onSave: (slot: ScheduleSlot) => void;
  onDelete?: (slotId: string) => void;
  onClose: () => void;
  language: Language;
}

const EditSlotModal: React.FC<EditSlotModalProps> = ({
  slot,
  groups,
  users,
  onSave,
  onDelete,
  onClose,
  language,
}) => {
  const t = translations[language];

  const [dateLabel, setDateLabel] = useState(slot?.dateLabel || '17.10 Cmrts');
  const [time, setTime] = useState(slot?.time || '20:30');
  const [watchTitle, setWatchTitle] = useState(slot?.watchTitle || '');
  const [seasonEpisode, setSeasonEpisode] = useState(slot?.seasonEpisode || '');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(slot?.targetGroups || ['Friends']);
  const [isCompleted, setIsCompleted] = useState(slot?.isCompleted || false);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(slot?.attendeeIds || []);
  const [attendeeNames, setAttendeeNames] = useState<string[]>(slot?.attendeeNames || []);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  const toggleGroup = (grp: string) => {
    if (selectedGroups.includes(grp)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== grp));
    } else {
      setSelectedGroups([...selectedGroups, grp]);
    }
  };

  const handleAddAttendee = () => {
    if (!selectedUserToAdd) return;
    const user = users.find((u) => u.id === selectedUserToAdd);
    if (!user || attendeeIds.includes(user.id)) return;
    setAttendeeIds([...attendeeIds, user.id]);
    setAttendeeNames([...attendeeNames, user.name]);
    setSelectedUserToAdd('');
  };

  const handleRemoveAttendee = (userId: string) => {
    const idx = attendeeIds.indexOf(userId);
    if (idx === -1) return;
    setAttendeeIds(attendeeIds.filter((_, i) => i !== idx));
    setAttendeeNames(attendeeNames.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSlot: ScheduleSlot = {
      id: slot ? slot.id : `slot_${Date.now()}`,
      dateLabel: dateLabel.trim(),
      time: time.trim(),
      watchTitle: watchTitle.trim() || '?',
      seasonEpisode: seasonEpisode.trim() || undefined,
      attendeeIds,
      attendeeNames,
      isCompleted,
      targetGroups: selectedGroups,
      interactGroups: selectedGroups,
      createdAt: slot ? slot.createdAt : new Date().toISOString(),
    };
    onSave(newSlot);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {slot ? t.editSlotBtn : t.newSlotTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                {language === 'tr' ? 'Gün (Örn: 17.10 Cmrts)' : 'Date Label'} *
              </label>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="17.10 Cmrts"
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 font-serif italic"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                {t.timeLabel} *
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="20:30"
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 font-mono"
                required
              />
            </div>
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.watchTitleLabel}
            </label>
            <input
              type="text"
              value={watchTitle}
              onChange={(e) => setWatchTitle(e.target.value)}
              placeholder={language === 'tr' ? 'Etkinlik / Dizi Adı' : 'Event / Title'}
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
            />
          </div>

          {/* Season / Episode */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.seasonEpLabel}
            </label>
            <input
              type="text"
              value={seasonEpisode}
              onChange={(e) => setSeasonEpisode(e.target.value)}
              placeholder={language === 'tr' ? 'İsteğe bağlı (Örn: Sezon 1 Bölüm 3-5)' : 'Optional (e.g. Season 1 Ep 3-5)'}
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
            />
          </div>

          {/* Groups */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.scheduleGroupLock}
            </label>
            <div className="flex flex-wrap gap-1">
              {groups.map((grp) => {
                const isSelected = selectedGroups.includes(grp);
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => toggleGroup(grp)}
                    className={`px-2 py-0.5 rounded text-xs cursor-pointer font-mono ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                        : 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attendee Management section (all in one) */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
              <span>{t.attendeesModalTitle} ({attendeeIds.length})</span>
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1 bg-neutral-50 dark:bg-neutral-950/60 p-2 rounded border border-neutral-200 dark:border-neutral-800">
              {attendeeIds.length === 0 ? (
                <div className="text-center py-2 text-neutral-400 text-[11px]">
                  {language === 'tr' ? 'Katılımcı yok' : 'No attendees'}
                </div>
              ) : (
                attendeeIds.map((id, index) => {
                  const name = attendeeNames[index] || id;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between px-2 py-1 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 text-[11px]"
                    >
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(id)}
                        className="text-neutral-400 hover:text-red-500 font-mono text-[10px] cursor-pointer"
                        title={t.removeAttendeeAdmin}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add attendee dropdown */}
            <div className="flex gap-1.5">
              <select
                value={selectedUserToAdd}
                onChange={(e) => setSelectedUserToAdd(e.target.value)}
                className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs"
              >
                <option value="">{language === 'tr' ? 'Katılımcı ekle...' : 'Add attendee...'}</option>
                {users
                  .filter((u) => !attendeeIds.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="px-2.5 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-medium cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Complete & Lock toggle */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="rounded"
              />
              <div className="text-left">
                <span className="font-semibold block text-neutral-900 dark:text-neutral-100">
                  {t.completedBadge} & {language === 'tr' ? 'Kilitle' : 'Lock'}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {language === 'tr' ? 'Etkinlik bittiğinde katılımı dondurur ve nihai listeyi sabitler.' : 'Locks attendance and finalizes list.'}
                </span>
              </div>
            </label>
          </div>

          {/* Action buttons: Delete / Cancel / Save */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div>
              {slot && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(language === 'tr' ? 'Bu seansı silmek istediğinize emin misiniz?' : 'Delete this session?')) {
                      onDelete(slot.id);
                      onClose();
                    }
                  }}
                  className="px-2.5 py-1 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs cursor-pointer font-medium"
                >
                  {t.deleteSlotBtn}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-semibold cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
