import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingToggles } from './ReadingPrefs';
import icon from '@/public/icons/icon-192.png';
import scoutbaseMark from '@/public/scout-mark.png';

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

/**
 * For anyone who finds the campfire book and wonders what else ScoutBase does.
 * The description is ScoutBase's own, from www.scoutbase.app.
 */
export function MoreFromScoutBase() {
  return (
    <div className="sb-more">
      <span className="sb-more-mark">
        <Image src={scoutbaseMark} alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
      </span>
      <div>
        <p className="sb-more-title">More from ScoutBase</p>
        <p className="sb-more-text">
          The all-in-one platform for Scout Groups: youth records, parent communication,
          attendance, events and reporting, in one secure place.
        </p>
        <a className="sb-more-link" href="https://www.scoutbase.app">
          Visit scoutbase.app
        </a>
      </div>
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
        <MoreFromScoutBase />
        <p className="footlinks">
          <Link href="/">The book</Link>
          <Link href="/plan">Plan a campfire</Link>
          <Link href="/submit">Send one in</Link>
          <Link href="/admin">Admin</Link>
        </p>
        <p className="footmeta">ScoutBase Campfire</p>
      </div>
    </footer>
  );
}
