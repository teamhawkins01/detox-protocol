'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Footer() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  if (isAdminPage) return null;

  return (
    <footer className="py-20 px-6 md:px-12 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link href="/">
            <Logo />
          </Link>
          <p className="text-mono text-xs text-white/40 uppercase tracking-widest">
            © 2026 DETOX_RECIPES_CLINIC // ALL_RIGHTS_RESERVED
          </p>
        </div>
        
        <div className="flex gap-12">
          {[
            { name: 'Privacy', href: '/privacy' },
            { name: 'Terms', href: '/terms' },
            { name: 'Security', href: '/security' },
            { name: 'API', href: '/api-docs' }
          ].map(item => (
            <Link key={item.name} href={item.href} className="text-mono text-xs text-white/60 hover:text-detox-green transition-colors uppercase tracking-widest">
              {item.name}
            </Link>
          ))}
          <Link href="/admin" className="text-mono text-xs text-detox-green/80 hover:text-detox-green transition-colors uppercase tracking-widest font-bold">
            [ CLINIC_ADMIN ]
          </Link>
        </div>
      </div>
    </footer>
  );
}
