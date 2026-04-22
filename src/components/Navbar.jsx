import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { path: '/', label: '근무계획표' },
  { path: '/calendar', label: '캘린더' },
  { path: '/employees', label: '직원관리' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#1e3a5f', display: 'flex', alignItems: 'center',
        padding: '0 1.25rem', height: '60px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fbbf24', marginRight: '2rem', whiteSpace: 'nowrap' }}>
          📋 스케줄 관리표
        </span>

        {/* 데스크탑 */}
        <div style={{ display: 'flex', flex: 1 }} className="desktop-links">
          {links.map(l => (
            <Link key={l.path} to={l.path} style={{
              color: pathname === l.path ? '#fbbf24' : '#cbd5e1',
              textDecoration: 'none', padding: '0 1rem',
              height: '60px', display: 'flex', alignItems: 'center',
              borderBottom: pathname === l.path ? '3px solid #fbbf24' : '3px solid transparent',
              fontWeight: pathname === l.path ? '600' : '400',
              fontSize: '0.9rem', whiteSpace: 'nowrap',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* 햄버거 */}
        <button onClick={() => setOpen(p => !p)} className="hamburger" style={{
          display: 'none', background: 'none', border: 'none',
          color: '#fbbf24', fontSize: '1.5rem', cursor: 'pointer', marginLeft: 'auto',
        }}>
          {open ? '✕' : '☰'}
        </button>
      </nav>

      {/* 모바일 메뉴 */}
      {open && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99,
          background: '#1e3a5f', borderBottom: '1px solid #2d5a8e',
          padding: '0.5rem 0',
        }}>
          {links.map(l => (
            <Link key={l.path} to={l.path} onClick={() => setOpen(false)} style={{
              display: 'block', padding: '0.875rem 1.5rem',
              color: pathname === l.path ? '#fbbf24' : '#cbd5e1',
              textDecoration: 'none', fontWeight: pathname === l.path ? '600' : '400',
              borderBottom: '1px solid #2d5a8e',
            }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-links { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </>
  )
}
