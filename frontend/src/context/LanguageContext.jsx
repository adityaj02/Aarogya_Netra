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

  const t = (key, fallback, variables) => {
    const currentDict = dictionaries[lang] || dictionaries.en;
    let str = undefined;
    
    if (currentDict && currentDict[key] !== undefined) {
      str = currentDict[key];
    } else if (dictionaries.en && dictionaries.en[key] !== undefined) {
      // Fallback to English
      str = dictionaries.en[key];
    } else {
      str = fallback !== undefined ? fallback : key;
    }
    
    if (variables && typeof str === 'string') {
      Object.keys(variables).forEach(k => {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), variables[k]);
      });
    }
    
    return str;
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
