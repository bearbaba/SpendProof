import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
 title: 'SpendProof — Agents should explain before they spend',
 description: 'A transparent AI payment decision guardrail: deterministic policy gates, SERV Reasoning risk review and Kite Passport approval handoff.',
 robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body>{children}</body></html>;
}
