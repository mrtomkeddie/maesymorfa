'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { FEATURES } from '@/lib/config/features';

type Language = 'en' | 'cy';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// The visitor's choice is kept on their device, so a Welsh reader does not have to pick Cymraeg
// again on every visit or page reload
const STORAGE_KEY = 'language';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Read after the first render, which is always English to match the page the server sent.
  // Storage can be blocked (private windows), so a failed read just leaves English.
  // With Welsh turned off (FEATURES.enableWelsh) the site stays English, whatever was chosen before.
  useEffect(() => {
    if (!FEATURES.enableWelsh) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'cy') setLanguageState('cy');
    } catch {}
  }, []);

  // Screen readers and the browser's own translate offer go by the page's lang
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    if (!FEATURES.enableWelsh) return;
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'cy' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
