import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingToggles } from './ReadingPrefs';
import { BOOK, appName, brand, otherBrands } from '@/lib/brand';
import campfireIcon from '@/public/icons/campfire/icon-192.png';
import pioneeringIcon from '@/public/icons/pioneering/icon-192.png';
import scoutbaseMark from '@/public/scout-mark.png';

const ICONS = { campfire: campfireIcon, pioneering: pioneeringIcon };
const icon = ICONS[BOOK];

/** The top row of every page: the brand on the left, the reading toggles on the right. */
export function Masthead() {
  return (
    <div className="masthead">
      <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
        <Image src={icon} alt="" width={34} height={34} className="brand-icon" />
        <span className="kicker">
          ScoutBase <span className="kicker-app">{brand.name}</span>
        </span>
      </Link>
      <ReadingToggles />
    </div>
  );
}

export function FootBrand() {
  return (
    <div className="brand">
      <Image src={icon} alt="" width={28} height={28} className="brand-icon" />
      <span className="footname">{appName}</span>
    </div>
  );
}

/**
 * For anyone who finds the book and wonders what else ScoutBase does.
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

/** Links to the other ScoutBase books, each with its own icon. */
export function OtherBooks() {
  return (
    <nav className="sb-books" aria-label="Other ScoutBase books">
      <p className="sb-more-title">Also from ScoutBase</p>
      <ul>
        {otherBrands.map((b) => (
          <li key={b.slug}>
            <a className="sb-book" href={b.url}>
              <Image src={ICONS[b.slug]} alt="" width={34} height={34} className="brand-icon" />
              <span>
                <span className="sb-book-name">ScoutBase {b.name}</span>
                <span className="sb-book-blurb">{b.blurb}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
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
        <OtherBooks />
        <MoreFromScoutBase />
        <p className="footlinks">
          <Link href="/">The book</Link>
          <Link href="/plan">{brand.plan.label}</Link>
          <Link href="/submit">Send one in</Link>
          <Link href="/admin">Admin</Link>
        </p>
        <p className="footmeta">{appName}</p>
      </div>
    </footer>
  );
}
