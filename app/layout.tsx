import type {Metadata} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'DETOX.PROTOCOLS | Industrial Strength Detox',
  description: 'High-performance detox protocols for the modern human. Built for results.',
  keywords: ['detox protocols', 'cleansing protocols', 'health', 'wellness', 'juice cleanse', 'smoothie detox', 'industrial strength detox'],
  authors: [{ name: 'DETOX.PROTOCOLS Team' }],
  openGraph: {
    title: 'DETOX.PROTOCOLS | Industrial Strength Detox',
    description: 'High-performance detox protocols for the modern human. Built for results.',
    url: 'https://detox.protocols',
    siteName: 'DETOX.PROTOCOLS',
    images: [
      {
        url: 'https://picsum.photos/seed/industrial-detox/1200/630',
        width: 1200,
        height: 630,
        alt: 'DETOX.PROTOCOLS - Industrial Strength Detox',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DETOX.PROTOCOLS | Industrial Strength Detox',
    description: 'High-performance detox protocols for the modern human. Built for results.',
    images: ['https://picsum.photos/seed/industrial-detox/1200/630'],
  },
};

import { AuthProvider } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MainLayoutWrapper from '@/components/MainLayoutWrapper';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="grid-bg">
        <AuthProvider>
          <Navbar />
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
