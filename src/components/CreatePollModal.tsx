import React, { useState } from 'react';
import { Poll, PollOption, PollType, Language } from '../types';
import { translations } from '../utils/i18n';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreatePollModalProps {
  groups: string[];
  currentAdminCode: string;
  initialPoll?: Poll | null;
  onSave: (newPoll: Poll) => void;
  onClose: () => void;
  language: Language;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  groups,
  currentAdminCode,
  initialPoll,
  onSave,
  onClose,
  language,
}) => {
  const t = translations[language];

  const [title, setTitle] = useState(initialPoll?.title || '');
  const [description, setDescription] = useState(initialPoll?.description || '');
  const [type, setType] = useState<PollType>(initialPoll?.type || 'single');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialPoll?.targetGroups || []);
  const [options, setOptions] = useState<Array<{ text: string; assignsGroup: string }>>(
    initialPoll && initialPoll.options.length > 0
      ? initialPoll.options.map((o) => ({ text: o.text, assignsGroup: o.assignsGroup || '' }))
      : [
          { text: '', assignsGroup: '' },
          { text: '', assignsGroup: '' },
        ]
  );
  const [hideFromNonMembers, setHideFromNonMembers] = useState(initialPoll?.hideFromNonMembers || false);
  const [allowFreeform, setAllowFreeform] = useState(
    initialPoll ? initialPoll.allowFreeform : true
  );
  const [shareFreeformOptions, setShareFreeformOptions] = useState(
    initialPoll ? initialPoll.shareFreeformOptions : true
  );
  const [error, setError] = useState('');

  const handleAddOption = () => {
    setOptions([...options, { text: '', assignsGroup: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: 'text' | 'assignsGroup', value: string) => {
    const updated = [...options];
    updated[index][field] = value;
    setOptions(updated);
  };

  const toggleGroup = (grp: string) => {
    if (selectedGroups.includes(grp)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== grp));
    } else {
      setSelectedGroups([...selectedGroups, grp]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(language === 'tr' ? 'Başlık gerekli.' : 'Title required.');
      return;
    }

    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      setError(language === 'tr' ? 'En az 2 seçenek girin.' : 'At least 2 options required.');
      return;
    }

    const formattedOptions: PollOption[] = validOptions.map((o, idx) => ({
      id: initialPoll?.options[idx]?.id || `opt_${Date.now()}_${idx}`,
      text: o.text.trim(),
      assignsGroup: o.assignsGroup.trim() || undefined,
    }));

    const savedPoll: Poll = {
      id: initialPoll ? initialPoll.id : `poll_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type,
      options: formattedOptions,
      targetGroups: selectedGroups,
      hideFromNonMembers: selectedGroups.length > 0 ? hideFromNonMembers : false,
      allowFreeform,
      shareFreeformOptions: allowFreeform ? shareFreeformOptions : false,
      isActive: initialPoll ? initialPoll.isActive : true,
      createdAt: initialPoll ? initialPoll.createdAt : new Date().toISOString(),
      createdBy: initialPoll ? initialPoll.createdBy : currentAdminCode,
    };

    onSave(savedPoll);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {initialPoll ? (language === 'tr' ? 'Anketi Düzenle' : 'Edit Poll') : t.newPollTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.pollTitleLabel} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.pollTitlePlaceholder}
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.pollTypeLabel}
            </label>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setType('single')}
                className={`p-2 rounded border text-left cursor-pointer ${
                  type === 'single'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                ◉ {t.pollTypeSingle}
              </button>
              <button
                type="button"
                onClick={() => setType('ranked')}
                className={`p-2 rounded border text-left cursor-pointer ${
                  type === 'ranked'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                🏆 {t.pollTypeRanked}
              </button>
              <button
                type="button"
                onClick={() => setType('yes_no')}
                className={`p-2 rounded border text-left cursor-pointer ${
                  type === 'yes_no'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                ✓/✗ {t.pollTypeYesNo}
              </button>
              <button
                type="button"
                onClick={() => setType('multiple')}
                className={`p-2 rounded border text-left cursor-pointer ${
                  type === 'multiple'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                ☑ {t.pollTypeMultiple}
              </button>
            </div>
          </div>

          {/* Target Groups */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.targetGroupsLabel}
            </label>
            <div className="flex flex-wrap gap-1">
              {groups.map((grp) => {
                const isSelected = selectedGroups.includes(grp);
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => toggleGroup(grp)}
                    className={`px-2 py-1 rounded text-xs cursor-pointer font-mono ${
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

            {selectedGroups.length > 0 && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-[11px] text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={hideFromNonMembers}
                  onChange={(e) => setHideFromNonMembers(e.target.checked)}
                  className="rounded"
                />
                <span>🔒 {t.hideFromNonMembersLabel}</span>
              </label>
            )}
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                {t.optionsLabel}
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-neutral-700 dark:text-neutral-300 font-mono text-xs cursor-pointer hover:underline"
              >
                {t.addOptionBtn}
              </button>
            </div>

            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="font-mono text-neutral-400 w-3">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                    placeholder={t.optionPlaceholder}
                    className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-xs"
                  />
                  <select
                    value={opt.assignsGroup}
                    onChange={(e) => handleOptionChange(idx, 'assignsGroup', e.target.value)}
                    className="w-24 px-1.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-[11px]"
                    title="Grup ata"
                  >
                    <option value="">+Grup yok</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        +{g}
                      </option>
                    ))}
                  </select>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Write-in checkboxes */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowFreeform}
                onChange={(e) => setAllowFreeform(e.target.checked)}
                className="rounded"
              />
              <span>{t.freeformToggle}</span>
            </label>

            {allowFreeform && (
              <label className="flex items-center gap-2 cursor-pointer pl-5">
                <input
                  type="checkbox"
                  checked={shareFreeformOptions}
                  onChange={(e) => setShareFreeformOptions(e.target.checked)}
                  className="rounded"
                />
                <span>{t.freeformShareToggle}</span>
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
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
              {t.savePollBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
