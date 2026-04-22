import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const TYPES = {
  '회식': { color: '#dc2626', bg: '#fef2f2' },
  '공지': { color: '#2563eb', bg: '#eff6ff' },
  '기타': { color: '#7c3aed', bg: '#f5f3ff' },
}
const EMPTY_FORM = { title: '', type: '회식', note: '' }

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const dateStr = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const eventsOn = (str) => events.filter(e => e.date === str)

  const handleAdd = async () => {
    if (!form.title.trim()) return
    await addDoc(collection(db, 'events'), { ...form, title: form.title.trim(), date: modal, createdAt: serverTimestamp() })
    setModal(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async (id) => {
    if (confirm('삭제하시겠습니까?')) await deleteDoc(doc(db, 'events', id))
  }

  const prevMonth = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1)

  return (
    <div style={{ padding: '1rem 1.25rem', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f' }}>캘린더</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={navBtn}>◀</button>
          <span style={{ fontWeight: '600', color: '#1e3a5f', minWidth: '80px', textAlign: 'center' }}>{year}년 {month}월</span>
          <button onClick={nextMonth} style={navBtn}>▶</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1) }} style={{ ...navBtn, background: '#1e3a5f', color: '#fff', padding: '0.3rem 0.75rem' }}>오늘</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#1e3a5f' }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '0.625rem', fontWeight: '600', fontSize: '0.85rem',
              color: i === 0 ? '#fca5a5' : i === 6 ? '#93c5fd' : '#e2e8f0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDay + 1
            const valid = day >= 1 && day <= daysInMonth
            const ds = valid ? dateStr(day) : null
            const isToday = valid && year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
            const isSun = i % 7 === 0, isSat = i % 7 === 6
            const evs = ds ? eventsOn(ds) : []

            return (
              <div key={i} onClick={() => valid && setModal(ds)} style={{
                minHeight: '80px', padding: '0.4rem', border: '1px solid #f1f5f9',
                background: valid ? (isToday ? '#fffbeb' : '#fff') : '#f8fafc',
                cursor: valid ? 'pointer' : 'default',
              }}>
                {valid && (
                  <>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: isToday ? '700' : '400',
                      color: isSun ? '#dc2626' : isSat ? '#2563eb' : '#374151',
                      width: isToday ? '22px' : 'auto', height: isToday ? '22px' : 'auto',
                      background: isToday ? '#f59e0b' : 'transparent',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '2px',
                    }}>
                      {day}
                    </div>
                    {evs.map(e => (
                      <div key={e.id}
                        onClick={ev => { ev.stopPropagation(); handleDelete(e.id) }}
                        title={`${e.title} — 클릭 시 삭제`}
                        style={{
                          fontSize: '11px', padding: '1px 5px', borderRadius: '3px', marginBottom: '2px',
                          background: TYPES[e.type]?.bg || '#f1f5f9',
                          color: TYPES[e.type]?.color || '#374151',
                          cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                        {e.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
        {Object.entries(TYPES).map(([type, style]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i style={{ display: 'inline-block', width: 10, height: 10, background: style.color, borderRadius: '2px' }} />
            {type}
          </span>
        ))}
        <span style={{ color: '#94a3b8' }}>* 날짜 클릭 시 일정 추가 / 일정 클릭 시 삭제</span>
      </div>

      {/* 모달 */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setModal(null); setForm(EMPTY_FORM) }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '380px', margin: '1rem' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: '700', color: '#1e3a5f', marginBottom: '1rem', fontSize: '1rem' }}>
              📅 {modal} 일정 추가
            </h3>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputS}>
              {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="일정 제목 *" style={inputS} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="메모 (선택)" style={inputS} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setModal(null); setForm(EMPTY_FORM) }}
                style={{ flex: 1, padding: '0.7rem', background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdd}
                style={{ flex: 1, padding: '0.7rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = { padding: '0.3rem 0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.3rem', cursor: 'pointer' }
const inputS = { width: '100%', padding: '0.6rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', outline: 'none', display: 'block' }
