import React, { createContext, useContext, useState, useEffect } from 'react';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import pa from '../locales/pa.json';
import bn from '../locales/bn.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import mr from '../locales/mr.json';

const dictionaries = { en, hi, pa, bn, ta, te, mr };

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' }
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('aarogyanetra_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (newLang) => {
    if (dictionaries[newLang]) {
      setLangState(newLang);
      try {
        localStorage.setItem('aarogyanetra_lang', newLang);
      } catch (e) {
        console.warn('LocalStorage error saving lang', e);
      }
    }
  };

  const t = (key, fallback) => {
    const currentDict = dictionaries[lang] || dictionaries.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    // Fallback to English
    if (dictionaries.en && dictionaries.en[key] !== undefined) {
      return dictionaries.en[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
