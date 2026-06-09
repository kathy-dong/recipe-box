"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FALLBACK = process.env.NEXT_PUBLIC_APP_TITLE ?? "Recipe Box";

type SettingsContextValue = {
  appTitle: string;
  setAppTitle: (title: string) => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  appTitle: FALLBACK,
  setAppTitle: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [appTitle, setAppTitleState] = useState(FALLBACK);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.app_title) {
          setAppTitleState(data.app_title);
          document.title = data.app_title;
        }
      })
      .catch(() => {});
  }, []);

  function setAppTitle(title: string) {
    setAppTitleState(title);
    document.title = title;
  }

  return (
    <SettingsContext.Provider value={{ appTitle, setAppTitle }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
