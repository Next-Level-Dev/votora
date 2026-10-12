import React from 'react';
import { Poll, User, VoteRecord, Language } from '../types';
import { translations } from '../utils/i18n';
import { calculatePollStats } from '../utils/votingEngine';
import { X } from 'lucide-react';

interface PollResultsModalProps {
  poll: Poll;
  votes: VoteRecord[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  language: Language;
}

export const PollResultsModal: React.FC<PollResultsModalProps> = ({
  poll,
  votes,
  currentUser,
  onClose,
  language,
}) => {
  const t = translations[language];
  const stats = calculatePollStats(poll, votes);
  const pollVotes = votes.filter((v) => v.pollId === poll.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {poll.title}
            </h3>
            <span className="text-[11px] text-neutral-400 font-mono">
              {stats.totalVotes} {t.votesCount}
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

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {stats.optionResults.map((opt, idx) => (
            <div
              key={opt.optionId}
              className="p-2.5 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  <span className="font-mono text-neutral-400 mr-1.5">{idx + 1}.</span>
                  <span>{opt.text}</span>
                  {opt.isWriteIn && (
                    <span className="text-[10px] text-neutral-500 font-normal ml-1">
                      ({t.suggestedByTag} {opt.suggestedBy})
                    </span>
                  )}
                </div>

                <div className="font-mono text-neutral-700 dark:text-neutral-300 shrink-0 font-medium text-[11px]">
                  {poll.type === 'ranked' && `${opt.bordaScore} pts`}
                  {poll.type === 'yes_no' && `%${opt.yesRate} (${opt.yesCount}E / ${opt.noCount}H)`}
                  {(poll.type === 'single' || poll.type === 'multiple') && `%${opt.percentage} (${opt.votesCount})`}
                </div>
              </div>

              {/* Minimal bar */}
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full"
                  style={{ width: `${Math.max(2, opt.percentage)}%` }}
                />
              </div>
            </div>
          ))}

          {/* Member choices (Admin only) */}
          {currentUser.role === 'admin' && pollVotes.length > 0 && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="text-[11px] font-mono text-neutral-500 mb-1.5">
                {t.voteBreakdown}:
              </div>
              <div className="space-y-1 text-xs">
                {pollVotes.map((v) => {
                  let text = '';
                  if (v.type === 'single') {
                    const o = poll.options.find((opt) => opt.id === v.value.singleOptionId);
                    text = o?.text || '-';
                  } else if (v.type === 'ranked') {
                    text = (v.value.rankedOptionIds || [])
                      .map((id) => poll.options.find((o) => o.id === id)?.text || id)
                      .join(' > ');
                  } else if (v.type === 'yes_no') {
                    const yes: string[] = [];
                    poll.options.forEach((o) => {
                      if (v.value.yesNoMap?.[o.id]) yes.push(o.text);
                    });
                    text = yes.length > 0 ? yes.join(', ') : 'Hiçbiri';
                  }
                  return (
                    <div
                      key={v.id}
                      className="p-1.5 bg-neutral-100 dark:bg-neutral-800/50 rounded flex justify-between gap-2 text-[11px]"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{v.userName}</span>
                      <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
