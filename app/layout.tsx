import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
 title: 'SpendProof — Review agent spending before money moves',
 description: 'Explore spend policy decisions and audit evidence before an AI agent pays. SERV Reasoning and Kite Passport are separately configured and require human authorization.',
 openGraph: {
  title: 'SpendProof — Evidence before agent payments',
  description: 'Try the no-wallet spend policy demo. See how SERV decisions and Kite Passport authorization can fit together without false payment claims.',
  type: 'website',
 },
 twitter: {
  card: 'summary',
  title: 'SpendProof — Evidence before agent payments',
  description: 'A transparent, policy-first agent spending demo for SERV Hackathon 02.',
 },
 robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body>{children}</body></html>;
}
