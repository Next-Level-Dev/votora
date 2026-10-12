import React, { useState, useEffect } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../utils/i18n';
import { KeyRound, ArrowRight, Sun, Moon } from 'lucide-react';

interface LoginViewProps {
  onLogin: (code: string, rememberMe: boolean) => boolean;
  users: User[];
  language: Language;
  onToggleLanguage: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
}) => {
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(false);
  const t = translations[language];

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode) {
        setCode(urlCode.trim().toUpperCase());
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const success = onLogin(code.trim().toUpperCase(), rememberMe);
    if (!success) {
      setError(true);
    } else {
      setError(false);
    }
  };

  const handleQuickLogin = (demoCode: string) => {
    setCode(demoCode);
    setError(false);
    onLogin(demoCode, true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-3 sm:p-6 transition-colors font-sans">
      {/* Top row */}
      <div className="max-w-md mx-auto w-full flex justify-between items-center py-2">
        <span className="font-bold tracking-tight text-sm text-neutral-800 dark:text-neutral-200">
          VOTORA
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-2 py-1 text-xs font-mono rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer"
          >
            {language.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1 rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Box */}
      <div className="w-full max-w-sm mx-auto bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg p-5 shadow-xs my-auto">
        <div className="mb-4 text-center">
          <h1 className="text-base font-bold text-neutral-900 dark:text-white">
            {t.loginTitle}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t.loginSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(false);
              }}
              placeholder={t.codePlaceholder}
              className="w-full px-3 py-2 text-sm font-mono text-center tracking-wider uppercase rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-900 dark:focus:border-neutral-100"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-neutral-400"
              />
              <span>{t.rememberMe}</span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 text-center py-1">
              {t.invalidCode}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-3 rounded bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-semibold cursor-pointer"
          >
            {t.enterCodeBtn} →
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-2 font-medium">
            {t.demoAccounts}:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN-2026')}
              className="px-2 py-1.5 text-xs text-left rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer font-mono"
            >
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">★ {t.demoAdmin}</div>
              <div className="text-[10px] text-neutral-500">ADMIN-2026</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ARKADAS-CAN')}
              className="px-2 py-1.5 text-xs text-left rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer font-mono"
            >
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">Can</div>
              <div className="text-[10px] text-neutral-500">ARKADAS-CAN</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ARKADAS-MERT')}
              className="px-2 py-1.5 text-xs text-left rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer font-mono"
            >
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">Mert (2D)</div>
              <div className="text-[10px] text-neutral-500">ARKADAS-MERT</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ARKADAS-ZEYNEP')}
              className="px-2 py-1.5 text-xs text-left rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer font-mono"
            >
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">Zeynep (Live)</div>
              <div className="text-[10px] text-neutral-500">ARKADAS-ZEYNEP</div>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-400 py-2">
        Votora
      </div>
    </div>
  );
};
