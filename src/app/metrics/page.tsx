'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MetricsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to analytics page
    router.replace('/analytics');
  }, [router]);

  return (
    <div className="min-h-screen bg-z-muted flex items-center justify-center">
      <div className="text-z-ink-2">Перенаправление...</div>
    </div>
  );
}