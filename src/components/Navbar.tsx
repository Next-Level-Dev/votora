import React from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../utils/i18n';
import { Sun, Moon, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  language: Language;
  onToggleLanguage: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  activeView: 'polls' | 'schedule' | 'users';
  onChangeView: (view: 'polls' | 'schedule' | 'users') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  activeView,
  onChangeView,
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 bg-neutral-900 text-neutral-100 border-b border-neutral-800 px-2.5 sm:px-6 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-bold tracking-tight text-sm sm:text-base text-white">
            VOTORA
          </span>
          {currentUser && (
            <span className="text-[11px] text-neutral-400 font-mono hidden md:inline truncate max-w-[100px]">
              · {currentUser.name}
            </span>
          )}
        </div>

        {/* View Switcher: Polls / Schedule / Users (Admin only) */}
        {currentUser && (
          <nav className="flex items-center text-xs bg-neutral-800 rounded p-0.5 border border-neutral-700 shrink-0">
            <button
              type="button"
              onClick={() => onChangeView('polls')}
              className={`px-2 sm:px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap text-xs ${
                activeView === 'polls'
                  ? 'bg-neutral-950 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.tabPolls}
            </button>
            <button
              type="button"
              onClick={() => onChangeView('schedule')}
              className={`px-2 sm:px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap text-xs ${
                activeView === 'schedule'
                  ? 'bg-neutral-950 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              📅 {language === 'tr' ? 'Takvim' : 'Schedule'}
            </button>
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onChangeView('users')}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  activeView === 'users'
                    ? 'bg-neutral-950 text-white font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                👥 {t.tabUsers}
              </button>
            )}
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-2 py-1 text-xs font-mono font-medium rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
            title="Dil Değiştir / Switch Language"
          >
            {language.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 text-xs rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
            title="Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-neutral-200" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs rounded border border-neutral-700 bg-neutral-800 hover:bg-red-950/60 hover:text-red-300 text-neutral-300 cursor-pointer flex items-center gap-1"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
