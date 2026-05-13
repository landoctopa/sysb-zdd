import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import QueryProvider from '@/components/QueryProvider';
import { createClient } from '@/utils/supabase/server';
import ProfileHydrator from '@/components/auth/ProfileHydrator';
import { Navbar } from '@/components/layout/Navbar';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'ZDD Business System',
    template: '%s | ZDD Business System',
  },
  description: 'Strategic intelligence platform for solopreneurs and small businesses.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .single();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <ProfileHydrator profile={profile} />
        <Navbar />
        <QueryProvider>
          <main className="flex-1">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}