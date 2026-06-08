"use client";

import { IdentityProvider } from "@/lib/identity";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <IdentityProvider>{children}</IdentityProvider>;
}
