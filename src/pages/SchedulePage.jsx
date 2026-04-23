import { useState, useEffect, useCallback } from 'react'
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDayLabel = (y, m, d) => ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
const getDayIdx = (y, m, d) => new Date(y, m - 1, d).getDay()

const cycleState = (s) => s === 'work' ? 'off' : s === 'off' ? 'tbm' : 'work'

const cellBg = (state, isSun) => {
  if (state === 'off') return isSun ? '#fef2f2' : '#ffffff'
  if (state === 'tbm') return '#dc2626'
  return '#1a1a1a'
}

const TH = { border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '600', fontSize: '12px' }
const TD = { border: '1px solid #e5e7eb' }
const ROW_BORDER = { borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8' }

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
    const currentDays = schedules[empId] || {}
    const isSun = getDayIdx(year, month, day) === 0
    const next = cycleState(currentDays[day] ?? (isSun ? 'off' : 'work'))
    const newDays = { ...currentDays, [day]: next }
    setSchedules(prev => ({ ...prev, [empId]: newDays }))
    await setDoc(doc(db, 'schedules', `${year}-${month}-${empId}`), {
      year, month, employeeId: empId, days: newDays
    })
  }, [year, month, schedules])

  const autoAssignTBM = async () => {
    if (!confirm('현재 근무 일정 기준으로 TBM을 자동 배치하시겠습니까?\n(기존 TBM은 초기화 후 재배분됩니다)')) return

    const n = getDaysInMonth(year, month)
    const tbmCounts = {}
    employees.forEach(emp => { tbmCounts[emp.id] = 0 })

    // 기존 TBM → work로 초기화
    const newSchedules = {}
    employees.forEach(emp => {
      const current = schedules[emp.id] || {}
      const cleaned = {}
      Object.entries(current).forEach(([day, state]) => {
        cleaned[day] = state === 'tbm' ? 'work' : state
      })
      newSchedules[emp.id] = cleaned
    })

    // 날짜별 TBM 균등 배분 (greedy: 가장 적은 사람 우선)
    for (let d = 1; d <= n; d++) {
      const isSun = getDayIdx(year, month, d) === 0
      const workers = employees.filter(emp => {
        const state = (newSchedules[emp.id] || {})[d] ?? (isSun ? 'off' : 'work')
        return state === 'work'
      })
      if (workers.length === 0) continue

      const minCount = Math.min(...workers.map(w => tbmCounts[w.id]))
      const candidates = workers.filter(w => tbmCounts[w.id] === minCount)
      const chosen = candidates[0]

      newSchedules[chosen.id] = { ...(newSchedules[chosen.id] || {}), [d]: 'tbm' }
      tbmCounts[chosen.id]++
    }

    // 로컬 state 반영
    setSchedules(prev => {
      const next = { ...prev }
      employees.forEach(emp => { next[emp.id] = newSchedules[emp.id] || {} })
      return next
    })

    // Firestore 저장
    for (const emp of employees) {
      await setDoc(doc(db, 'schedules', `${year}-${month}-${emp.id}`), {
        year, month, employeeId: emp.id, days: newSchedules[emp.id] || {}
      })
    }
  }

  const getWorkRanges = (empId) => {
    const n = getDaysInMonth(year, month)
    const workDays = []
    for (let d = 1; d <= n; d++) {
      const isSun = getDayIdx(year, month, d) === 0
      const state = (schedules[empId] || {})[d] ?? (isSun ? 'off' : 'work')
      if (state !== 'off') workDays.push(d)
    }
    if (workDays.length === 0) return '없음'

    const ranges = []
    let start = workDays[0], end = workDays[0]
    for (let i = 1; i < workDays.length; i++) {
      if (workDays[i] === end + 1) {
        end = workDays[i]
      } else {
        ranges.push(start === end ? `${start}` : `${start}~${end}`)
        start = end = workDays[i]
      }
    }
    ranges.push(start === end ? `${start}` : `${start}~${end}`)
    return ranges.join(', ')
  }

  const countWork = (empId) => {
    const n = getDaysInMonth(year, month)
    let cnt = 0
    for (let d = 1; d <= n; d++) {
      const isSun = getDayIdx(year, month, d) === 0
      const s = (schedules[empId] || {})[d] ?? (isSun ? 'off' : 'work')
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
        <button onClick={autoAssignTBM} style={{
          padding: '0.45rem 1.1rem', background: '#dc2626', color: '#fff',
          border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
          fontWeight: '700', fontSize: '0.85rem',
        }}>
          ⚡ 근무 확정 · TBM 자동배치
        </button>
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
        <>
          <div className="schedule-wrap" style={{ borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            <table style={{ borderCollapse: 'collapse', background: '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ ...TH, background: '#1e3a5f', color: '#fbbf24', fontSize: '13px', padding: '0.6rem 1rem' }}>
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
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ ...TD, ...ROW_BORDER, padding: '0 8px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>{emp.role || '-'}</td>
                    <td style={{ ...TD, ...ROW_BORDER, padding: '0 10px', fontWeight: '700', color: '#1e3a5f', whiteSpace: 'nowrap' }}>{emp.name}</td>
                    {days.map(d => {
                      const isSun = getDayIdx(year, month, d) === 0
                      const state = (schedules[emp.id] || {})[d] ?? (isSun ? 'off' : 'work')
                      return (
                        <td
                          key={d}
                          onClick={() => handleClick(emp.id, d)}
                          style={{
                            ...TD,
                            ...ROW_BORDER,
                            background: cellBg(state, isSun),
                            width: '28px', minWidth: '28px', height: '34px',
                            cursor: 'pointer',
                          }}
                        />
                      )
                    })}
                    <td style={{ ...TD, ...ROW_BORDER, textAlign: 'center', fontWeight: '700', color: '#1e3a5f', padding: '0 4px' }}>
                      {countWork(emp.id)}일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 실 근무일 요약 */}
          <div style={{ marginTop: '1rem', background: '#fff', borderRadius: '0.5rem', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.6rem' }}>
              실 근무일 요약
            </div>
            {employees.map(emp => (
              <div key={emp.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.3rem', fontSize: '0.82rem', alignItems: 'baseline' }}>
                <span style={{ fontWeight: '700', color: '#1e3a5f', minWidth: '72px', flexShrink: 0 }}>{emp.name}</span>
                <span style={{ color: '#475569' }}>{getWorkRanges(emp.id)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const navBtn = {
  padding: '0.3rem 0.6rem', background: '#f1f5f9',
  border: '1px solid #cbd5e1', borderRadius: '0.3rem', cursor: 'pointer',
}
