"use client";

import ErrorState from "./components/ErrorState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon="😅"
      heading="Something went wrong"
      body="Try refreshing the page. If the problem persists, check the Vercel deployment logs."
      onRetry={reset}
      retryLabel="Refresh"
    />
  );
}
