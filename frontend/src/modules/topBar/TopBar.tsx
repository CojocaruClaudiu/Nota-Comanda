import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import useNotistack from "../orders/hooks/useNotistack";

import './TopBar.css';

type TopBarProps = {
  title?: string;
  onLogoClick?: () => void;
  // onSearchSubmit?: (query: string) => void;
};

const getInitials = (name?: string, email?: string) => {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const TopBar: React.FC<TopBarProps> = ({ title = 'Nota Comandă', onLogoClick }) => {
  const { user, logout, loading } = useAuth() as { user?: { name?: string; email: string }, logout: () => void, loading: boolean } | any;
  const navigate = useNavigate();
  const { successNotistack } = useNotistack();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  // close menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  // shrink on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // keyboard: open menu (ArrowDown), close (Esc)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (menuOpen) firstMenuItemRef.current?.focus();
  }, [menuOpen]);

  const initials = useMemo(() => getInitials(user?.name, user?.email), [user]);

  // optional environment badge (shows if not production)
  const env =
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE) ||
    (typeof process !== 'undefined' && (process.env.NODE_ENV as string)) ||
    'production';
  const envBadge = env && !/prod/i.test(env) ? env.toUpperCase() : null;

  const handleLogoClick = () => {
    onLogoClick?.();
    navigate('/');
  };



  return (
    <>

      <header className={`topbar ${scrolled ? 'topbar--scrolled' : ''}`} role="banner">
        <div className="topbar__content">
          {/* Left cluster */}
          <div className="topbar__left">
            <button
              className="topbar__logoBtn"
              onClick={handleLogoClick}
              aria-label="Acasă"
              title="Acasă"
            >
              <img src="/LogoTopaz-1x1.png" alt="Topaz" className="topbar__logo" />
            </button>

            <div className="topbar__brand">
              <span className="topbar__title">{title}</span>
              {envBadge && (
                <span className={`topbar__env topbar__env--${envBadge.toLowerCase()}`}>{envBadge}</span>
              )}
            </div>
          </div>



          {/* Right cluster */}
          <div className="topbar__right">


            {user ? (
              <div className="topbar__user" ref={menuRef}>
                <button
                  className="topbar__userBtn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-controls="user-menu"
                  title={user.name || user.email}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && !menuOpen) {
                      e.preventDefault();
                      setMenuOpen(true);
                    }
                  }}
                >
                  <span className="topbar__avatar" aria-hidden>{initials}</span>
                  <span className="topbar__userText">
                    <span className="topbar__userName">{user.name || user.email}</span>
                    {user.name && <span className="topbar__userEmail">{user.email}</span>}
                  </span>
                  <svg className={`topbar__chev ${menuOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M7 10l5 5 5-5H7z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="topbar__menu" role="menu" id="user-menu">
                    <button
                      className="topbar__menuItem"
                      role="menuitem"
                      ref={firstMenuItemRef}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/profil');
                      }}
                    >
                      Profil
                    </button>
                    <button
                      className="topbar__menuItem"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/setari');
                      }}
                    >
                      Setări
                    </button>
                    <hr className="topbar__menuSep" />
                    <button
                      className="topbar__menuItem topbar__menuItem--danger"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        successNotistack('Te-ai deconectat cu succes', {variant: 'info'});
                        navigate('/login');
                      }}
                    >
                      Deconectare
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="topbar__user">
                {loading ? (
                  <span className="topbar__userText">Se încarcă...</span>
                ) : (
                  <span className="topbar__userText">Neautentificat</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default TopBar;
