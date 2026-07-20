import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Whaz Proposal Generator',
  description: 'Generate branded Whaz client proposals as a PDF.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
