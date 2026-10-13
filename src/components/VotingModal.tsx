import React, { useState } from 'react';
import { Poll, PollOption, User, VoteRecord, Language } from '../types';
import { translations } from '../utils/i18n';
import { determineGroupsToGrant } from '../utils/votingEngine';
import { X, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface VotingModalProps {
  poll: Poll;
  currentUser: User;
  existingVote?: VoteRecord;
  onVoteSubmitted: (
    voteRecord: VoteRecord,
    updatedUserGroups?: string[],
    newPollOption?: PollOption
  ) => void;
  onClose: () => void;
  language: Language;
}

export const VotingModal: React.FC<VotingModalProps> = ({
  poll,
  currentUser,
  existingVote,
  onVoteSubmitted,
  onClose,
  language,
}) => {
  const t = translations[language];

  const [selectedSingleId, setSelectedSingleId] = useState<string>(
    existingVote?.value.singleOptionId || ''
  );

  const [rankedIds, setRankedIds] = useState<string[]>(() => {
    if (existingVote?.value.rankedOptionIds && existingVote.value.rankedOptionIds.length > 0) {
      const existing = [...existingVote.value.rankedOptionIds];
      poll.options.forEach((o) => {
        if (!existing.includes(o.id)) existing.push(o.id);
      });
      return existing;
    }
    return poll.options.map((o) => o.id);
  });

  const [yesNoMap, setYesNoMap] = useState<Record<string, boolean>>(() => {
    return existingVote?.value.yesNoMap ? { ...existingVote.value.yesNoMap } : {};
  });

  const [selectedMultipleIds, setSelectedMultipleIds] = useState<string[]>(
    existingVote?.value.multipleOptionIds || []
  );

  const [writeInText, setWriteInText] = useState(existingVote?.writeInText || '');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const moveRankUp = (index: number) => {
    if (index === 0) return;
    const next = [...rankedIds];
    const tmp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = tmp;
    setRankedIds(next);
  };

  const moveRankDown = (index: number) => {
    if (index === rankedIds.length - 1) return;
    const next = [...rankedIds];
    const tmp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = tmp;
    setRankedIds(next);
  };

  const handleYesNoToggle = (optionId: string, choice: boolean) => {
    setYesNoMap((prev) => ({ ...prev, [optionId]: choice }));
  };

  const handleMultipleToggle = (optionId: string) => {
    if (selectedMultipleIds.includes(optionId)) {
      setSelectedMultipleIds(selectedMultipleIds.filter((id) => id !== optionId));
    } else {
      setSelectedMultipleIds([...selectedMultipleIds, optionId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (poll.type === 'single' && !selectedSingleId) {
      setValidationError(language === 'tr' ? 'Bir seçenek seçin.' : 'Pick an option.');
      return;
    }

    if (poll.type === 'yes_no') {
      const answered = Object.keys(yesNoMap).length;
      if (answered < poll.options.length) {
        setValidationError(
          language === 'tr'
            ? 'Her seçenek için Evet / Hayır seçin.'
            : 'Vote Yes / No for all options.'
        );
        return;
      }
    }

    setSubmitting(true);

    const voteValue: VoteRecord['value'] = {
      singleOptionId: poll.type === 'single' ? selectedSingleId : undefined,
      rankedOptionIds: poll.type === 'ranked' ? rankedIds : undefined,
      yesNoMap: poll.type === 'yes_no' ? yesNoMap : undefined,
      multipleOptionIds: poll.type === 'multiple' ? selectedMultipleIds : undefined,
    };

    const newlyGrantedGroups = determineGroupsToGrant(poll, voteValue);
    const updatedSet = new Set(currentUser.groups);
    newlyGrantedGroups.forEach((g) => updatedSet.add(g));
    const finalUserGroups = Array.from(updatedSet);

    let newPollOption: PollOption | undefined;
    if (poll.allowFreeform && poll.shareFreeformOptions && writeInText.trim().length > 0) {
      const exists = poll.options.some(
        (o) => o.text.trim().toLowerCase() === writeInText.trim().toLowerCase()
      );
      if (!exists) {
        newPollOption = {
          id: `opt_writein_${Date.now()}`,
          text: writeInText.trim(),
          isWriteIn: true,
          suggestedBy: currentUser.name,
        };
      }
    }

    const voteRecord: VoteRecord = {
      id: existingVote ? existingVote.id : `vote_${Date.now()}_${currentUser.id}`,
      pollId: poll.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userCode: currentUser.code,
      submittedAt: new Date().toISOString(),
      type: poll.type,
      value: voteValue,
      writeInText: writeInText.trim() || undefined,
      groupsGranted: newlyGrantedGroups,
    };

    setTimeout(() => {
      onVoteSubmitted(voteRecord, finalUserGroups, newPollOption);
      setSubmitting(false);
      onClose();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate pr-2">
            {poll.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {validationError && (
            <div className="p-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900">
              {validationError}
            </div>
          )}

          {/* 1. RANKED */}
          {poll.type === 'ranked' && (
            <div className="space-y-2">
              <div className="text-[11px] text-neutral-500 font-mono">
                {t.rankedInstructions}
              </div>
              <div className="space-y-1.5">
                {rankedIds.map((optId, idx) => {
                  const opt = poll.options.find((o) => o.id === optId);
                  if (!opt) return null;
                  return (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between p-2 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-neutral-400 w-4 font-bold shrink-0">{idx + 1}.</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100 break-words whitespace-normal flex-1 min-w-0">
                          {opt.text}
                        </span>
                        {opt.isWriteIn && (
                          <span className="text-[10px] text-neutral-400 shrink-0">({opt.suggestedBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveRankUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-20 cursor-pointer text-neutral-600 dark:text-neutral-400"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRankDown(idx)}
                          disabled={idx === rankedIds.length - 1}
                          className="p-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-20 cursor-pointer text-neutral-600 dark:text-neutral-400"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SINGLE */}
          {poll.type === 'single' && (
            <div className="space-y-1.5">
              {poll.options.map((opt) => {
                const isSelected = selectedSingleId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSingleId(opt.id)}
                    className={`w-full flex items-center justify-between gap-2 p-2.5 rounded border text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <span className="break-words whitespace-normal flex-1 min-w-0">{opt.text}</span>
                    <span className="font-mono text-xs shrink-0">{isSelected ? '◉' : '○'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. YES / NO */}
          {poll.type === 'yes_no' && (
            <div className="space-y-2">
              {poll.options.map((opt) => {
                const ans = yesNoMap[opt.id];
                return (
                  <div
                    key={opt.id}
                    className="p-2 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 break-words whitespace-normal flex-1 min-w-0">
                      {opt.text}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleYesNoToggle(opt.id, true)}
                        className={`px-2.5 py-1 rounded text-xs cursor-pointer font-medium border ${
                          ans === true
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent'
                            : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        ✓ {t.yesBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleYesNoToggle(opt.id, false)}
                        className={`px-2.5 py-1 rounded text-xs cursor-pointer font-medium border ${
                          ans === false
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent'
                            : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        ✕ {t.noBtn}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. MULTIPLE */}
          {poll.type === 'multiple' && (
            <div className="space-y-1.5">
              {poll.options.map((opt) => {
                const isChecked = selectedMultipleIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleMultipleToggle(opt.id)}
                    className={`w-full flex items-center justify-between gap-2 p-2.5 rounded border text-left text-xs transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span className="break-words whitespace-normal flex-1 min-w-0">{opt.text}</span>
                    <span className="font-mono text-xs shrink-0">{isChecked ? '☑' : '☐'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* WRITE-IN */}
          {poll.allowFreeform && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                {t.freeformSectionTitle}
              </label>
              <input
                type="text"
                value={writeInText}
                onChange={(e) => setWriteInText(e.target.value)}
                placeholder={t.freeformInputPlaceholder}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-semibold cursor-pointer"
            >
              {submitting ? '...' : t.submitVoteBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
