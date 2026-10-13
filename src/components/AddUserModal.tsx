import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../utils/i18n';
import { ADMIN_GROUP } from '../utils/votingEngine';
import { X } from 'lucide-react';

interface AddUserModalProps {
  existingUsers: User[];
  onSave: (user: User) => void;
  onClose: () => void;
  language: Language;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  existingUsers,
  onSave,
  onClose,
  language,
}) => {
  const t = translations[language];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [initialGroup, setInitialGroup] = useState<string>('Friends');
  const [error, setError] = useState('');

  const generateCode = () => {
    const clean = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = clean ? clean : 'USER';
    const rand = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}-${rand}`);
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

    const isAdmin = initialGroup === ADMIN_GROUP;
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      role: isAdmin ? 'admin' : 'voter',
      groups: [initialGroup],
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
              {t.initialGroupLabel}
            </label>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setInitialGroup('Friends')}
                className={`py-1.5 text-xs rounded border cursor-pointer ${
                  initialGroup === 'Friends'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Friends
              </button>
              <button
                type="button"
                onClick={() => setInitialGroup(ADMIN_GROUP)}
                className={`py-1.5 text-xs rounded border cursor-pointer ${
                  initialGroup === ADMIN_GROUP
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {ADMIN_GROUP}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug">
              {initialGroup === ADMIN_GROUP ? t.adminGroupHint : t.friendGroupHint}
            </p>
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
