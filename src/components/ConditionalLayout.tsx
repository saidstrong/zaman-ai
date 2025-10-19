'use client';

import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { FabChat } from './FabChat';
import { GlobalVoiceHandler } from './GlobalVoiceHandler';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith('/assistant');

  return (
    <>
      <div className={`min-h-screen ${hideChrome ? '' : 'pb-20 md:pb-0'}`}>
        {children}
      </div>
      {!hideChrome && <TabBar />}
      {!hideChrome && <FabChat />}
      <GlobalVoiceHandler />
    </>
  );
}
