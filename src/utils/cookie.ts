/**
 * Cookie handling utilities for saving invitation code session
 */

const COOKIE_NAME = 'votora_auth_code';
const STORAGE_KEY = 'votora_remembered_code';

export function setLoginCookie(code: string, days = 30): void {
  try {
    const trimmed = code.trim().toUpperCase();
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(trimmed)}; expires=${expires}; path=/; SameSite=Lax`;
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // Fallback if cookies/storage are disabled
  }
}

export function getLoginCookie(): string | null {
  try {
    // First try document.cookie
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (match) {
      const val = decodeURIComponent(match.split('=')[1]);
      if (val) return val;
    }
    // Fallback to localStorage
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) return localVal;
  } catch {
    // Ignore error
  }
  return null;
}

export function removeLoginCookie(): void {
  try {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore error
  }
}
