import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingToggles } from './ReadingPrefs';
import { BOOK, allBrands, appName, brand } from '@/lib/brand';
import campfireIcon from '@/public/icons/campfire/icon-192.png';
import pioneeringIcon from '@/public/icons/pioneering/icon-192.png';
import bushcraftIcon from '@/public/icons/bushcraft/icon-192.png';
import gamesIcon from '@/public/icons/games/icon-192.png';
import scoutbaseMark from '@/public/scout-mark.png';

const ICONS = {
  campfire: campfireIcon,
  pioneering: pioneeringIcon,
  bushcraft: bushcraftIcon,
  games: gamesIcon,
};
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
 * Every ScoutBase handbook, each under its own icon, with this one marked,
 * then a link to ScoutBase itself for anyone curious about the other tools.
 * The ScoutBase description is its own, from www.scoutbase.app.
 */
export function Handbooks() {
  return (
    <nav className="sb-books" aria-label="ScoutBase handbooks">
      <p className="sb-more-title">The ScoutBase handbooks</p>
      <ul>
        {allBrands.map((b) => {
          const inner = (
            <>
              <Image src={ICONS[b.slug]} alt="" width={34} height={34} className="brand-icon" />
              <span>
                <span className="sb-book-name">ScoutBase {b.name}</span>
                <span className="sb-book-blurb">{b.blurb}</span>
              </span>
              {b.slug === BOOK ? <span className="sb-book-here">You are here</span> : null}
            </>
          );
          return (
            <li key={b.slug}>
              {b.slug === BOOK ? (
                <div className="sb-book is-current" aria-current="true">
                  {inner}
                </div>
              ) : (
                <a className="sb-book" href={b.url}>
                  {inner}
                </a>
              )}
            </li>
          );
        })}
        <li>
          <a className="sb-book" href="https://www.scoutbase.app">
            <span className="sb-book-mark">
              <Image
                src={scoutbaseMark}
                alt=""
                width={22}
                height={22}
                style={{ objectFit: 'contain' }}
              />
            </span>
            <span>
              <span className="sb-book-name">ScoutBase</span>
              <span className="sb-book-blurb">
                The all-in-one platform for Scout Groups: youth records, parent communication,
                attendance, events and reporting, in one secure place. Visit scoutbase.app
              </span>
            </span>
          </a>
        </li>
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
        <Handbooks />
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
