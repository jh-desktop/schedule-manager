import { useState, useEffect, useCallback } from 'react'
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDayLabel = (y, m, d) => ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
const getDayIdx = (y, m, d) => new Date(y, m - 1, d).getDay()

const cycleState = (s) => s === 'work' ? 'off' : s === 'off' ? 'tbm' : 'work'

const cellBg = (state, isSun) => {
  if (isSun) return '#fef2f2'
  if (state === 'off') return '#ffffff'
  if (state === 'tbm') return '#dc2626'
  return '#1a1a1a'
}

const TH = { border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '600', fontSize: '12px' }
const TD = { border: '1px solid #e5e7eb' }

export default function SchedulePage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    setSchedules({})
    if (employees.length === 0) return
    const unsubs = employees.map(emp => {
      const docId = `${year}-${month}-${emp.id}`
      return onSnapshot(doc(db, 'schedules', docId), snap => {
        setSchedules(prev => ({
          ...prev,
          [emp.id]: snap.exists() ? (snap.data().days || {}) : {}
        }))
      })
    })
    return () => unsubs.forEach(u => u())
  }, [year, month, employees])

  const handleClick = useCallback(async (empId, day) => {
    if (getDayIdx(year, month, day) === 0) return
    const currentDays = schedules[empId] || {}
    const next = cycleState(currentDays[day] ?? 'work')
    const newDays = { ...currentDays, [day]: next }
    setSchedules(prev => ({ ...prev, [empId]: newDays }))
    await setDoc(doc(db, 'schedules', `${year}-${month}-${empId}`), {
      year, month, employeeId: empId, days: newDays
    })
  }, [year, month, schedules])

  const countWork = (empId) => {
    const n = getDaysInMonth(year, month)
    let cnt = 0
    for (let d = 1; d <= n; d++) {
      if (getDayIdx(year, month, d) === 0) continue
      const s = (schedules[empId] || {})[d] ?? 'work'
      if (s !== 'off') cnt++
    }
    return cnt
  }

  const prevMonth = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1)

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  return (
    <div style={{ padding: '1rem 1.25rem' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f' }}>
          {year}년 {month}월 근무계획표
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={navBtn}>◀</button>
          <span style={{ fontWeight: '600', color: '#1e3a5f', minWidth: '80px', textAlign: 'center' }}>{year}.{String(month).padStart(2, '0')}</span>
          <button onClick={nextMonth} style={navBtn}>▶</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1) }} style={{ ...navBtn, background: '#1e3a5f', color: '#fff', padding: '0.3rem 0.75rem' }}>오늘</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#1a1a1a' }} />근무</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#dc2626' }} />TBM</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#fff', border: '1px solid #ccc' }} />휴무</span>
        </div>
      </div>

      {employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#fff', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👷</div>
          <div>직원을 먼저 등록해주세요.</div>
          <a href="/employees" style={{ color: '#1e3a5f', fontWeight: '600' }}>직원관리 →</a>
        </div>
      ) : (
        <div className="schedule-wrap" style={{ borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ borderCollapse: 'collapse', background: '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th colSpan={3} style={{ ...TH, background: '#1e3a5f', color: '#fbbf24', fontSize: '13px', padding: '0.6rem 1rem' }}>
                  {year}년 {month}월 근무계획표 (TBM)
                </th>
                {days.map(d => {
                  const idx = getDayIdx(year, month, d)
                  const isSun = idx === 0, isSat = idx === 6
                  return (
                    <th key={d} style={{
                      ...TH,
                      background: isSun ? '#fef2f2' : isSat ? '#eff6ff' : '#f8fafc',
                      color: isSun ? '#dc2626' : isSat ? '#2563eb' : '#374151',
                      width: '28px', minWidth: '28px', padding: '3px 0',
                    }}>
                      <div>{d}</div>
                      <div style={{ fontSize: '10px', opacity: 0.75 }}>{getDayLabel(year, month, d)}</div>
                    </th>
                  )
                })}
                <th style={{ ...TH, background: '#f8fafc', padding: '0 8px', minWidth: '52px' }}>근무<br/>일수</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, rowIdx) => (
                <tr key={emp.id} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ ...TD, padding: '0 8px', color: '#475569', fontWeight: '500' }}>{emp.role || '-'}</td>
                  <td style={{ ...TD, padding: '0 10px', fontWeight: '700', color: '#1e3a5f' }}>{emp.name}</td>
                  <td style={{ ...TD, padding: '0 8px', color: '#94a3b8', fontSize: '11px' }}>{emp.grade || ''}</td>
                  {days.map(d => {
                    const isSun = getDayIdx(year, month, d) === 0
                    const state = isSun ? 'off' : ((schedules[emp.id] || {})[d] ?? 'work')
                    return (
                      <td
                        key={d}
                        className="day-cell"
                        onClick={() => handleClick(emp.id, d)}
                        style={{
                          ...TD,
                          background: cellBg(state, isSun),
                          width: '28px', minWidth: '28px', height: '34px',
                          cursor: isSun ? 'default' : 'pointer',
                        }}
                      />
                    )
                  })}
                  <td style={{ ...TD, textAlign: 'center', fontWeight: '700', color: '#1e3a5f', padding: '0 4px' }}>
                    {countWork(emp.id)}일
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  padding: '0.3rem 0.6rem', background: '#f1f5f9',
  border: '1px solid #cbd5e1', borderRadius: '0.3rem', cursor: 'pointer',
}
