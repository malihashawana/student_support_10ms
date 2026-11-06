import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "bn" | "en";

const STORAGE_KEY = "student-support-hub-language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (bn: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Keep server and first client render identical for hydration.
  const [language, setLanguage] = useState<Language>("bn");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "bn" || stored === "en") setLanguage(stored);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The language still works for the current session.
    }
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: (bn, en) => (language === "bn" ? bn : en) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
