import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingToggles } from './ReadingPrefs';
import icon from '@/public/icons/icon-192.png';

/** The top row of every page: the brand on the left, the reading toggles on the right. */
export function Masthead() {
  return (
    <div className="masthead">
      <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
        <Image src={icon} alt="" width={32} height={32} className="brand-icon" />
        <span className="kicker">ScoutBase Campfire</span>
      </Link>
      <ReadingToggles />
    </div>
  );
}

export function FootBrand() {
  return (
    <div className="brand">
      <Image src={icon} alt="" width={28} height={28} className="brand-icon" />
      <span className="footname">ScoutBase Campfire</span>
    </div>
  );
}

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
        <Masthead />
        <h1>{title}</h1>
        <div className="rule" />
        <p className="lede">{lede}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <FootBrand />
        <p className="footlede">
          Joeys, Cubs, Scouts, Venturers and Rovers — learning, leading and living life to the
          fullest.
        </p>
        <p className="footlinks">
          <Link href="/">The book</Link>
          <Link href="/submit">Send one in</Link>
          <Link href="/admin">Admin</Link>
        </p>
        <p className="footmeta">ScoutBase Campfire</p>
      </div>
    </footer>
  );
}
