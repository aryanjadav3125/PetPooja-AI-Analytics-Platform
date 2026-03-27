import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PetPooja AI — Restaurant Intelligence Platform',
  description:
    'One-stop business analytics & revenue engine for restaurants. Menu intelligence, AI chat, voice ordering, and real-time insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Sidebar />
        <main className="ml-[240px] min-h-screen transition-all duration-300">
          <div className="max-w-[1440px] mx-auto px-6 py-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
