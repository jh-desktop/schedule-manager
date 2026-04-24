import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { db } from '../firebase'

const STATE_LABEL = { work: '근무', off: '휴무', tbm: 'TBM' }
const STATE_COLOR = { work: '#1a1a1a', off: '#94a3b8', tbm: '#dc2626' }
const STATE_BG = { work: '#f0fdf4', off: '#f8fafc', tbm: '#fef2f2' }

export default function HistoryPage() {
  const [employees, setEmployees] = useState([])
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => {
      const emps = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEmployees(emps)
      if (emps.length > 0) setSelectedEmpId(prev => prev || emps[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedEmpId) { setHistory([]); return }
    const q = query(collection(db, 'history'), where('employeeId', '==', selectedEmpId))
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      all.sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0))
      setHistory(all.slice(0, 5))
    })
  }, [selectedEmpId])

  const selectedEmp = employees.find(e => e.id === selectedEmpId)

  return (
    <div style={{ padding: '1rem 1.25rem', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f' }}>
          근무 변경 이력
        </h1>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>직원 선택</label>
        <select
          value={selectedEmpId}
          onChange={e => setSelectedEmpId(e.target.value)}
          style={{ padding: '0.6rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', minWidth: '160px', background: '#fff' }}
        >
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
        {selectedEmp && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
            {selectedEmp.role} · {selectedEmp.grade || '-'}
          </span>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            이력이 없습니다.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['날짜', '변경 전', '→', '변경 후', '변경 시각'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(h => {
                const ts = h.timestamp?.toDate?.()
                const timeStr = ts
                  ? ts.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '-'
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#1e3a5f' }}>
                      {h.year}년 {h.month}월 {h.day}일
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.3rem', background: STATE_BG[h.from] || '#f1f5f9', color: STATE_COLOR[h.from] || '#374151', fontWeight: '600', fontSize: '0.8rem' }}>
                        {STATE_LABEL[h.from] || h.from}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.25rem', color: '#94a3b8', fontSize: '0.8rem' }}>→</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.3rem', background: STATE_BG[h.to] || '#f1f5f9', color: STATE_COLOR[h.to] || '#374151', fontWeight: '600', fontSize: '0.8rem' }}>
                        {STATE_LABEL[h.to] || h.to}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>{timeStr}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
        직원별 최근 5개 이력만 표시됩니다.
      </div>
    </div>
  )
}
