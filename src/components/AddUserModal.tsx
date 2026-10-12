import React, { useState } from 'react';
import { User, UserRole, Language } from '../types';
import { translations } from '../utils/i18n';
import { X } from 'lucide-react';

interface AddUserModalProps {
  groups: string[];
  existingUsers: User[];
  onSave: (user: User) => void;
  onClose: () => void;
  language: Language;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  groups,
  existingUsers,
  onSave,
  onClose,
  language,
}) => {
  const t = translations[language];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<UserRole>('voter');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['Friends']);
  const [error, setError] = useState('');

  const generateCode = () => {
    const clean = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = clean ? clean : 'USER';
    const rand = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}-${rand}`);
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
    if (!name.trim()) {
      setError(language === 'tr' ? 'İsim gerekli.' : 'Name required.');
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError(language === 'tr' ? 'Kod gerekli.' : 'Code required.');
      return;
    }

    const isTaken = existingUsers.some((u) => u.code.toUpperCase() === cleanCode);
    if (isTaken) {
      setError(language === 'tr' ? 'Bu kod zaten kayıtlı.' : 'Code already in use.');
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      role,
      groups: selectedGroups,
      createdAt: new Date().toISOString(),
    };

    onSave(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {t.addUserBtn}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.userNameLabel} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmet, Ayşe..."
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                {t.userCodeLabel} *
              </label>
              <button
                type="button"
                onClick={generateCode}
                className="text-[10px] text-neutral-600 dark:text-neutral-300 underline cursor-pointer font-mono"
              >
                [{t.generateRandomCode}]
              </button>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CAN-01"
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.roleLabel}
            </label>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setRole('voter')}
                className={`py-1.5 text-xs rounded border cursor-pointer ${
                  role === 'voter'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {t.voterRole}
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-1.5 text-xs rounded border cursor-pointer ${
                  role === 'admin'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {t.adminRole}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {t.assignGroupsLabel}
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

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
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
              {t.saveUserBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
