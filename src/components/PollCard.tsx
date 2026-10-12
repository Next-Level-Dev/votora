import React from 'react';
import { Poll, User, VoteRecord, Language } from '../types';
import { translations } from '../utils/i18n';
import { canUserAccessPoll, calculatePollStats } from '../utils/votingEngine';
import { Trash2, Edit2 } from 'lucide-react';

interface PollCardProps {
  poll: Poll;
  currentUser: User;
  votes: VoteRecord[];
  onOpenVote: (poll: Poll) => void;
  onOpenResults: (poll: Poll) => void;
  onEditPoll?: (poll: Poll) => void;
  onDeletePoll?: (pollId: string) => void;
  language: Language;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  currentUser,
  votes,
  onOpenVote,
  onOpenResults,
  onEditPoll,
  onDeletePoll,
  language,
}) => {
  const t = translations[language];
  const hasAccess = canUserAccessPoll(currentUser, poll);
  const userVote = votes.find((v) => v.pollId === poll.id && v.userId === currentUser.id);
  const stats = calculatePollStats(poll, votes);

  const getTypeSymbol = () => {
    switch (poll.type) {
      case 'ranked':
        return '🏆 ' + t.pollTypeRanked;
      case 'single':
        return '◉ ' + t.pollTypeSingle;
      case 'yes_no':
        return '✓/✗ ' + t.pollTypeYesNo;
      case 'multiple':
        return '☑ ' + t.pollTypeMultiple;
    }
  };

  return (
    <div
      className={`rounded-lg border p-3.5 sm:p-4 flex flex-col justify-between transition-colors ${
        hasAccess
          ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800'
          : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 opacity-60'
      }`}
    >
      <div>
        {/* Top minimal status line */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2">
          <div className="flex items-center gap-2">
            <span>{getTypeSymbol()}</span>
            <span>·</span>
            {poll.targetGroups && poll.targetGroups.length > 0 && !poll.targetGroups.includes('all') ? (
              <span>🔒 {poll.targetGroups.join(', ')}</span>
            ) : (
              <span>🌐 {t.allUsersAllowed}</span>
            )}
          </div>

          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-1">
              {onEditPoll && (
                <button
                  type="button"
                  onClick={() => onEditPoll(poll)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                  title={language === 'tr' ? 'Düzenle' : 'Edit'}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeletePoll && (
                <button
                  type="button"
                  onClick={() => onDeletePoll(poll.id)}
                  className="text-neutral-400 hover:text-red-500 p-0.5 cursor-pointer"
                  title={t.deletePoll}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
          {poll.title}
        </h3>

        {poll.description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
            {poll.description}
          </p>
        )}

        {/* Short option preview */}
        <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
          {poll.options.map((o) => o.text).join(' · ')}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
        <div className="text-xs font-mono text-neutral-500">
          {userVote ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {t.hasVoted}</span>
          ) : (
            <span>{stats.totalVotes} {t.votesCount}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenResults(poll)}
            className="px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer font-medium"
          >
            {t.viewResults}
          </button>

          {hasAccess ? (
            <button
              type="button"
              onClick={() => onOpenVote(poll)}
              className="px-3 py-1 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer font-semibold"
            >
              {userVote ? t.editVote : t.voteNow}
            </button>
          ) : (
            <span className="text-[11px] text-neutral-400 font-mono">🔒 Kilitli</span>
          )}
        </div>
      </div>
    </div>
  );
};
