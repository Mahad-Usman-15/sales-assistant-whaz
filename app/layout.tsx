import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Whaz Proposal Generator',
  description: 'Generate branded Whaz client proposals as a PDF.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `dark` drives Tailwind's dark: variants, which every pasted Tremor component uses. globals.css
  // already declares `color-scheme: dark`, so this only tells Tailwind what the app already is —
  // it applies no styles of its own and cannot affect the proposal form.
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
