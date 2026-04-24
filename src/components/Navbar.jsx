import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'

const BASE_LINKS = [
  { path: '/', label: '근무계획표' },
  { path: '/calendar', label: '캘린더' },
  { path: '/history', label: '이력' },
]
const ADMIN_LINKS = [
  { path: '/employees', label: '직원관리' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { adminMode, openModal, exitAdmin, showAdminModal, setShowAdminModal, adminInput, setAdminInput, adminErr, setAdminErr, handleAdminConfirm } = useAdmin()

  const links = adminMode ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS

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

        {/* 관리자 버튼 (데스크탑) */}
        <button
          onClick={() => adminMode ? exitAdmin() : openModal()}
          className="desktop-links"
          style={{
            padding: '0.35rem 0.875rem', background: adminMode ? '#f59e0b' : 'rgba(255,255,255,0.1)',
            color: '#fff', border: adminMode ? 'none' : '1px solid rgba(255,255,255,0.2)',
            borderRadius: '0.4rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
        >
          🔑 {adminMode ? '관리자 종료' : '관리자'}
        </button>

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
          <button
            onClick={() => { setOpen(false); adminMode ? exitAdmin() : openModal() }}
            style={{
              display: 'block', width: '100%', padding: '0.875rem 1.5rem',
              background: 'none', border: 'none', textAlign: 'left',
              color: adminMode ? '#f59e0b' : '#cbd5e1', fontWeight: '600',
              cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            🔑 {adminMode ? '관리자 종료' : '관리자 모드'}
          </button>
        </div>
      )}

      {/* 관리자 인증 모달 */}
      {showAdminModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setShowAdminModal(false); setAdminInput(''); setAdminErr(false) }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '320px', margin: '1rem' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: '700', color: '#1e3a5f', marginBottom: '1rem' }}>🔑 관리자 인증</h3>
            <input
              type="password"
              value={adminInput}
              onChange={e => { setAdminInput(e.target.value); setAdminErr(false) }}
              onKeyDown={e => e.key === 'Enter' && handleAdminConfirm()}
              placeholder="비밀번호 입력"
              autoFocus
              style={{ width: '100%', padding: '0.65rem', border: `1px solid ${adminErr ? '#ef4444' : '#e2e8f0'}`, borderRadius: '0.5rem', marginBottom: '0.4rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {adminErr && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>비밀번호가 틀렸습니다.</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => { setShowAdminModal(false); setAdminInput(''); setAdminErr(false) }}
                style={{ flex: 1, padding: '0.65rem', background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdminConfirm}
                style={{ flex: 1, padding: '0.65rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>확인</button>
            </div>
          </div>
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
