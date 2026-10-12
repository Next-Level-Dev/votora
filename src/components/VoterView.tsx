import React, { useState } from 'react';
import { Poll, User, VoteRecord, Language } from '../types';
import { translations } from '../utils/i18n';
import { canUserAccessPoll, canUserSeePoll } from '../utils/votingEngine';
import { PollCard } from './PollCard';
import { VotingModal } from './VotingModal';
import { PollResultsModal } from './PollResultsModal';

import { Plus } from 'lucide-react';
import { CreatePollModal } from './CreatePollModal';

interface VoterViewProps {
  currentUser: User;
  polls: Poll[];
  votes: VoteRecord[];
  users: User[];
  groups?: string[];
  onCreatePoll?: (poll: Poll) => void;
  onDeletePoll?: (pollId: string) => void;
  onVoteSubmitted: (
    voteRecord: VoteRecord,
    updatedUserGroups?: string[],
    newPollOption?: any
  ) => void;
  language: Language;
}

export const VoterView: React.FC<VoterViewProps> = ({
  currentUser,
  polls,
  votes,
  users,
  groups = [],
  onCreatePoll,
  onDeletePoll,
  onVoteSubmitted,
  language,
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'available' | 'voted' | 'all'>('available');
  const [votingPoll, setVotingPoll] = useState<Poll | null>(null);
  const [resultsPoll, setResultsPoll] = useState<Poll | null>(null);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [grantedNotification, setGrantedNotification] = useState<string[] | null>(null);

  const userVotesMap = new Map(
    votes.filter((v) => v.userId === currentUser.id).map((v) => [v.pollId, v])
  );

  const visiblePolls = polls.filter((p) => canUserSeePoll(currentUser, p));

  const availablePolls = visiblePolls.filter((p) => {
    const hasAccess = canUserAccessPoll(currentUser, p);
    const hasVoted = userVotesMap.has(p.id);
    return hasAccess && !hasVoted;
  });

  const votedPolls = visiblePolls.filter((p) => userVotesMap.has(p.id));

  const handleVoteCompleted = (
    voteRecord: VoteRecord,
    updatedUserGroups?: string[],
    newPollOption?: any
  ) => {
    if (voteRecord.groupsGranted && voteRecord.groupsGranted.length > 0) {
      setGrantedNotification(voteRecord.groupsGranted);
      setTimeout(() => setGrantedNotification(null), 6000);
    }
    onVoteSubmitted(voteRecord, updatedUserGroups, newPollOption);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Voter Profile Bar & New Poll Button for Admins */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-900 dark:text-neutral-100">{currentUser.name}</span>
          {currentUser.role === 'admin' && (
            <span className="text-[10px] text-neutral-500 font-mono">★ admin</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[11px]">
            <span>{t.myGroups}:</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {currentUser.groups.length > 0 ? currentUser.groups.join(', ') : t.noGroups}
            </span>
          </div>

          {currentUser.role === 'admin' && onCreatePoll && (
            <button
              type="button"
              onClick={() => setShowCreatePoll(true)}
              className="px-2.5 py-1 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-semibold flex items-center gap-1 ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createPollBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Unlocked Group Alert */}
      {grantedNotification && (
        <div className="p-2.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-lg text-xs flex items-center justify-between gap-2 font-medium">
          <span>✓ {t.groupGrantedNotice} <b>{grantedNotification.join(', ')}</b></span>
          <button
            type="button"
            onClick={() => setGrantedNotification(null)}
            className="text-[11px] underline opacity-80 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium ${
            activeTab === 'available'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {language === 'tr' ? 'Bekleyen' : 'To Vote'} ({availablePolls.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voted')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium ${
            activeTab === 'voted'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {language === 'tr' ? 'Tamamlanan' : 'Voted'} ({votedPolls.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer font-medium ${
            activeTab === 'all'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          {language === 'tr' ? 'Tümü' : 'All'} ({polls.length})
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeTab === 'available' && (
          <>
            {availablePolls.length === 0 ? (
              <div className="col-span-full text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
                ✓ {language === 'tr' ? 'Tüm oylar tamamlandı.' : 'All polls completed.'}
              </div>
            ) : (
              availablePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUser={currentUser}
                  votes={votes}
                  onOpenVote={(p) => setVotingPoll(p)}
                  onOpenResults={(p) => setResultsPoll(p)}
                  onEditPoll={(p) => setEditingPoll(p)}
                  onDeletePoll={onDeletePoll}
                  language={language}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'voted' && (
          <>
            {votedPolls.length === 0 ? (
              <div className="col-span-full text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
                {language === 'tr' ? 'Henüz oy kullanmadınız.' : 'No votes yet.'}
              </div>
            ) : (
              votedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUser={currentUser}
                  votes={votes}
                  onOpenVote={(p) => setVotingPoll(p)}
                  onOpenResults={(p) => setResultsPoll(p)}
                  onEditPoll={(p) => setEditingPoll(p)}
                  onDeletePoll={onDeletePoll}
                  language={language}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'all' && (
          <>
            {visiblePolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentUser={currentUser}
                votes={votes}
                onOpenVote={(p) => setVotingPoll(p)}
                onOpenResults={(p) => setResultsPoll(p)}
                onEditPoll={(p) => setEditingPoll(p)}
                onDeletePoll={onDeletePoll}
                language={language}
              />
            ))}
          </>
        )}
      </div>

      {/* Modals */}
      {votingPoll && (
        <VotingModal
          poll={votingPoll}
          currentUser={currentUser}
          existingVote={userVotesMap.get(votingPoll.id)}
          onVoteSubmitted={handleVoteCompleted}
          onClose={() => setVotingPoll(null)}
          language={language}
        />
      )}

      {resultsPoll && (
        <PollResultsModal
          poll={resultsPoll}
          votes={votes}
          users={users}
          currentUser={currentUser}
          onClose={() => setResultsPoll(null)}
          language={language}
        />
      )}

      {(showCreatePoll || editingPoll) && onCreatePoll && (
        <CreatePollModal
          groups={groups}
          currentAdminCode={currentUser.code}
          initialPoll={editingPoll}
          onSave={(savedPoll) => {
            onCreatePoll(savedPoll);
            setShowCreatePoll(false);
            setEditingPoll(null);
          }}
          onClose={() => {
            setShowCreatePoll(false);
            setEditingPoll(null);
          }}
          language={language}
        />
      )}
    </div>
  );
};
