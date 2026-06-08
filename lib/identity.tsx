"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const person1Name = process.env.NEXT_PUBLIC_PERSON_1 ?? "Kathy";
const person2Name = process.env.NEXT_PUBLIC_PERSON_2 ?? "Sam";

type IdentityCtx = {
  person: string | null;
  setPerson: (p: string) => void;
  person1: string;
  person2: string;
  mounted: boolean;
};

const IdentityContext = createContext<IdentityCtx>({
  person: null,
  setPerson: () => {},
  person1: person1Name,
  person2: person2Name,
  mounted: false,
});

const STORAGE_KEY = "recipe-box-person";

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [person, setPerson] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setPerson(stored);
    setMounted(true);
  }, []);

  function handleSetPerson(p: string) {
    localStorage.setItem(STORAGE_KEY, p);
    setPerson(p);
  }

  return (
    <IdentityContext.Provider
      value={{ person, setPerson: handleSetPerson, person1: person1Name, person2: person2Name, mounted }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
