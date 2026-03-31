'use client';

import { usePathname } from 'next/navigation';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // The home page has its own hero section overlap logic (pt-48)
  const isHomePage = pathname === '/';

  return (
    <div className={!isHomePage ? "pt-[175px]" : ""}>
      {children}
    </div>
  );
}
