/**
 * Root Layout
 *
 * The root layout component that wraps all pages.
 * Sets up fonts, global styles, providers, and common UI elements.
 */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';
import Providers from '@/components/providers/providers';

/** Force dynamic rendering for all pages (disable static optimization) */
export const dynamic = 'force-dynamic';

// Configure Geist Sans font
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

// Configure Geist Mono font
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

/** Page metadata for SEO */
export const metadata: Metadata = {
  title: 'Research IDE',
  description: 'RIDE - Research IDE',
  icons: {
    icon: '/favicon.ico'
  }
};

/**
 * Root layout component
 * @param children - Page content to render
 */
export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Wrap app with all providers (theme, query, etc.) */}
        <Providers>
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
