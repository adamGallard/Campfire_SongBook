import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import mark from '@/public/scout-mark.png';

export function Hero({
  title,
  lede,
  actions,
}: {
  title: ReactNode;
  lede: string;
  actions?: ReactNode;
}) {
  return (
    <header className="hero">
      <div className="wrap">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark">
            <Image src={mark} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
          </span>
          <span className="kicker">ScoutBase</span>
        </Link>
        <h1>{title}</h1>
        <div className="rule" />
        <p className="lede">{lede}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Footer({ songCount }: { songCount?: number }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="brand">
          <span className="brand-mark">
            <Image src={mark} alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
          </span>
          <span className="footname">ScoutBase</span>
        </div>
        <p className="footlede">
          Joeys, Cubs, Scouts, Venturers and Rovers — learning, leading and living life to the
          fullest.
        </p>
        <p className="footlinks">
          <Link href="/submit">Submit a song</Link>
          <Link href="/admin">Admin</Link>
        </p>
        <p className="footmeta">
          Campfire Song Book{songCount === undefined ? '' : ` · ${songCount} songs`}
        </p>
      </div>
    </footer>
  );
}
