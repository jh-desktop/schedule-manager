import { useState, useEffect, useCallback } from 'react'
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import * as XLSX from 'xlsx'

const ADMIN_PW = '0000'

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDayLabel = (y, m, d) => ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
const getDayIdx = (y, m, d) => new Date(y, m - 1, d).getDay()

const cycleState = (s) => s === 'work' ? 'off' : s === 'off' ? 'tbm' : 'work'

const cellBg = (state, isSun) => {
  if (state === 'off') return isSun ? '#fef2f2' : '#ffffff'
  if (state === 'tbm') return '#dc2626'
  return '#1a1a1a'
}

const formatRanges = (days) => {
  if (days.length === 0) return '-'
  const ranges = []
  let start = days[0], end = days[0]
  for (let i = 1; i < days.length; i++) {
    if (days[i] === end + 1) { end = days[i] }
    else { ranges.push(start === end ? `${start}` : `${start}~${end}`); start = end = days[i] }
  }
  ranges.push(start === end ? `${start}` : `${start}~${end}`)
  return ranges.join(', ')
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
  const [adminMode, setAdminMode] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminErr, setAdminErr] = useState(false)

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
        setSchedules(prev => ({ ...prev, [emp.id]: snap.exists() ? (snap.data().days || {}) : {} }))
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
    const newSchedules = {}
    employees.forEach(emp => {
      const current = schedules[emp.id] || {}
      const cleaned = {}
      Object.entries(current).forEach(([day, state]) => { cleaned[day] = state === 'tbm' ? 'work' : state })
      newSchedules[emp.id] = cleaned
    })
    for (let d = 1; d <= n; d++) {
      const isSun = getDayIdx(year, month, d) === 0
      const workers = employees.filter(emp => {
        const state = (newSchedules[emp.id] || {})[d] ?? (isSun ? 'off' : 'work')
        return state === 'work'
      })
      if (workers.length === 0) continue
      const minCount = Math.min(...workers.map(w => tbmCounts[w.id]))
      const chosen = workers.filter(w => tbmCounts[w.id] === minCount)[0]
      newSchedules[chosen.id] = { ...(newSchedules[chosen.id] || {}), [d]: 'tbm' }
      tbmCounts[chosen.id]++
    }
    setSchedules(prev => {
      const next = { ...prev }
      employees.forEach(emp => { next[emp.id] = newSchedules[emp.id] || {} })
      return next
    })
    for (const emp of employees) {
      await setDoc(doc(db, 'schedules', `${year}-${month}-${emp.id}`), {
        year, month, employeeId: emp.id, days: newSchedules[emp.id] || {}
      })
    }
  }

  const resetTBM = async () => {
    if (!confirm(`${year}년 ${month}월 TBM을 모두 초기화하시겠습니까?`)) return
    for (const emp of employees) {
      const current = schedules[emp.id] || {}
      const cleaned = {}
      Object.entries(current).forEach(([day, state]) => { cleaned[day] = state === 'tbm' ? 'work' : state })
      await setDoc(doc(db, 'schedules', `${year}-${month}-${emp.id}`), {
        year, month, employeeId: emp.id, days: cleaned
      })
    }
  }

  const resetMonth = async () => {
    if (!confirm(`${year}년 ${month}월 모든 근무 일정을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    for (const emp of employees) {
      await setDoc(doc(db, 'schedules', `${year}-${month}-${emp.id}`), {
        year, month, employeeId: emp.id, days: {}
      })
    }
  }

  const getWorkDays = (empId) => {
    const n = getDaysInMonth(year, month)
    const days = []
    for (let d = 1; d <= n; d++) {
      const isSun = getDayIdx(year, month, d) === 0
      const state = (schedules[empId] || {})[d] ?? (isSun ? 'off' : 'work')
      if (state !== 'off') days.push(d)
    }
    return days
  }

  const getTBMDays = (empId) => {
    const n = getDaysInMonth(year, month)
    const days = []
    for (let d = 1; d <= n; d++) {
      if ((schedules[empId] || {})[d] === 'tbm') days.push(d)
    }
    return days
  }

  const exportExcel = () => {
    const daysArr = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)
    const headers = ['역할', '이름', ...daysArr.map(d => `${d}(${getDayLabel(year, month, d)})`), '근무일수']
    const dataRows = employees.map(emp => {
      const dayCells = daysArr.map(d => {
        const isSun = getDayIdx(year, month, d) === 0
        const state = (schedules[emp.id] || {})[d] ?? (isSun ? 'off' : 'work')
        return state === 'work' ? '근무' : state === 'off' ? '휴무' : 'TBM'
      })
      return [emp.role, emp.name, ...dayCells, `${getWorkDays(emp.id).length}일`]
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
    ws['!cols'] = [{ wch: 14 }, { wch: 8 }, ...daysArr.map(() => ({ wch: 5 })), { wch: 8 }]
    XLSX.utils.book_append_sheet(wb, ws, `${year}년${month}월`)
    XLSX.writeFile(wb, `근무계획표_${year}년${month}월.xlsx`)
  }

  const handleAdminConfirm = () => {
    if (adminInput === ADMIN_PW) {
      setAdminMode(true)
      setShowAdminModal(false)
      setAdminInput('')
      setAdminErr(false)
    } else {
      setAdminErr(true)
    }
  }

  const prevMonth = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1)
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  return (
    <div style={{ padding: '1rem 1.25rem' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f' }}>
          {year}년 {month}월 근무계획표
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={navBtn}>◀</button>
          <span style={{ fontWeight: '600', color: '#1e3a5f', minWidth: '80px', textAlign: 'center' }}>{year}.{String(month).padStart(2, '0')}</span>
          <button onClick={nextMonth} style={navBtn}>▶</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1) }} style={{ ...navBtn, background: '#1e3a5f', color: '#fff', padding: '0.3rem 0.75rem' }}>오늘</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={autoAssignTBM} style={{ padding: '0.45rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            ⚡ TBM 자동배치
          </button>
          <button onClick={exportExcel} style={{ padding: '0.45rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            📊 엑셀 저장
          </button>
          <button
            onClick={() => adminMode ? setAdminMode(false) : setShowAdminModal(true)}
            style={{ padding: '0.45rem 1rem', background: adminMode ? '#f59e0b' : '#64748b', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
          >
            🔑 {adminMode ? '관리자 종료' : '관리자'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#1a1a1a' }} />근무</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#dc2626' }} />TBM</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i style={{ display: 'inline-block', width: 12, height: 12, background: '#fff', border: '1px solid #ccc' }} />휴무</span>
        </div>
      </div>

      {/* 관리자 패널 */}
      {adminMode && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', color: '#c2410c', fontSize: '0.85rem' }}>🔑 관리자 모드</span>
          <button onClick={resetTBM} style={{ padding: '0.4rem 0.9rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
            TBM 초기화
          </button>
          <button onClick={resetMonth} style={{ padding: '0.4rem 0.9rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
            이달 전체 초기화
          </button>
        </div>
      )}

      {/* 관리자 비밀번호 모달 */}
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

      {employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#fff', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👷</div>
          <div>직원을 먼저 등록해주세요.</div>
          <a href="/employees" style={{ color: '#1e3a5f', fontWeight: '600' }}>직원관리 →</a>
        </div>
      ) : (
        <>
          {/* 메인 스케줄 테이블 */}
          <div className="schedule-wrap" style={{ borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
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
                          style={{ ...TD, ...ROW_BORDER, background: cellBg(state, isSun), width: '28px', minWidth: '28px', height: '34px', cursor: 'pointer' }}
                        />
                      )
                    })}
                    <td style={{ ...TD, ...ROW_BORDER, textAlign: 'center', fontWeight: '700', color: '#1e3a5f', padding: '0 4px' }}>
                      {getWorkDays(emp.id).length}일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TBM 양식 */}
          <div style={{ background: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1rem', overflow: 'hidden' }}>
            <div style={{ background: '#dc2626', color: '#fff', padding: '0.6rem 1rem', fontWeight: '700', fontSize: '0.875rem' }}>
              TBM 근무 현황 ({year}년 {month}월)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    {['이름', '역할', 'TBM 근무일자', '근무시간', 'TBM 일수'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca', fontSize: '0.8rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const tbmDays = getTBMDays(emp.id)
                    return (
                      <tr key={emp.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fff5f5', borderBottom: '1px solid #fee2e2' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: '700', color: '#1e3a5f' }}>{emp.name}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{emp.role}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{formatRanges(tbmDays)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>06:30 ~ 15:30</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: '700', color: '#dc2626' }}>{tbmDays.length}일</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 실 근무일 양식 */}
          <div style={{ background: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ background: '#1e3a5f', color: '#fbbf24', padding: '0.6rem 1rem', fontWeight: '700', fontSize: '0.875rem' }}>
              실 근무일 현황 ({year}년 {month}월)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['이름', '직종 및 등급', '실 근무일자', '근무시간', '근무일수'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const workDays = getWorkDays(emp.id)
                    return (
                      <tr key={emp.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: '700', color: '#1e3a5f' }}>{emp.name}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{emp.grade || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{formatRanges(workDays)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>08:00 ~ 17:00</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: '700', color: '#1e3a5f' }}>{workDays.length}일</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
