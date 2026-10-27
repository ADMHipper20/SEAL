'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Re-renders the server components every `seconds` so new readings show up.
 * This replaces the old polling hooks/services: the server reads the data,
 * the browser only asks for a fresh render.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
