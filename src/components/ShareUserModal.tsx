import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../utils/i18n';
import { X, Copy, Check } from 'lucide-react';

interface ShareUserModalProps {
  user: User;
  onClose: () => void;
  language: Language;
}

export const ShareUserModal: React.FC<ShareUserModalProps> = ({ user, onClose, language }) => {
  const t = translations[language];
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const directUrl = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(user.code)}`;

  const shareText =
    language === 'tr'
      ? `Selam ${user.name}! Davet kodun: ${user.code}\nGiriş linki: ${directUrl}`
      : `Hey ${user.name}! Your invite code: ${user.code}\nDirect link: ${directUrl}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden my-auto flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {user.name} ({user.code})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {/* Code */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded font-mono font-bold text-center">
              {user.code}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-semibold cursor-pointer shrink-0"
            >
              {copiedCode ? '✓' : t.copyCodeBtn}
            </button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={directUrl}
              className="flex-1 px-2.5 py-1.5 text-[11px] font-mono text-neutral-500 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer font-medium shrink-0"
            >
              {copiedLink ? '✓' : t.copyLinkBtn}
            </button>
          </div>

          {/* Message Preview & WhatsApp */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 truncate">
              {user.name} için hazır davet mesajı
            </span>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded font-medium cursor-pointer text-xs shrink-0"
            >
              WhatsApp
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-950">
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
