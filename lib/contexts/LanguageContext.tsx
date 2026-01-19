'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

interface Translations {
    [key: string]: string | Translations;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

// Import translations
import en from '@/lib/translations/en.json';
import es from '@/lib/translations/es.json';

const translations: Record<Language, Translations> = { en, es };

function getNestedValue(obj: Translations, path: string): string {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return path; // Return key if translation not found
        }
    }

    return typeof current === 'string' ? current : path;
}

// Default context value for SSR
const defaultContextValue: LanguageContextType = {
    language: 'en',
    setLanguage: () => { },
    t: (key: string) => getNestedValue(translations['en'], key)
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load saved language from localStorage
        const savedLang = localStorage.getItem('contentai-language') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
            setLanguageState(savedLang);
        }
        setMounted(true);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('contentai-language', lang);
    };

    const t = (key: string): string => {
        return getNestedValue(translations[language], key);
    };

    const value: LanguageContextType = {
        language: mounted ? language : 'en',
        setLanguage,
        t: mounted ? t : (key: string) => getNestedValue(translations['en'], key)
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

