import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const ROLES = ['책임 감리원', '보조 감리원', '기타']
const EMPTY = { name: '', role: '책임 감리원' }

export default function EmployeePage() {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(false)
  const [nameErr, setNameErr] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) { setNameErr('이름을 입력해주세요.'); return }
    const maxOrder = employees.length > 0 ? Math.max(...employees.map(e => e.order ?? 0)) : 0
    await addDoc(collection(db, 'employees'), {
      name: form.name.trim(), role: form.role,
      order: maxOrder + 1, createdAt: serverTimestamp(),
    })
    setForm(EMPTY)
    setAdding(false)
    setNameErr('')
  }

  const handleDelete = async (id) => {
    if (confirm('삭제하시겠습니까?')) await deleteDoc(doc(db, 'employees', id))
  }

  const move = async (idx, dir) => {
    const target = employees[idx + dir]
    if (!target) return
    const cur = employees[idx]
    await updateDoc(doc(db, 'employees', cur.id), { order: target.order })
    await updateDoc(doc(db, 'employees', target.id), { order: cur.order })
  }

  return (
    <div style={{ padding: '1rem 1.25rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f' }}>
          직원 관리 <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '400' }}>({employees.length}명)</span>
        </h1>
        <button onClick={() => setAdding(true)} style={{ padding: '0.5rem 1.25rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
          + 직원 추가
        </button>
      </div>

      {adding && (
        <div style={{ background: '#fff', border: '2px solid #1e3a5f', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: '700', color: '#1e3a5f', marginBottom: '1rem' }}>새 직원 추가</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelS}>이름 *</label>
              <input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setNameErr('') }}
                placeholder="직원 이름" style={{ ...inputS, border: nameErr ? '1px solid #ef4444' : '1px solid #e2e8f0' }} />
              {nameErr && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>{nameErr}</div>}
            </div>
            <div>
              <label style={labelS}>역할</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputS}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setAdding(false); setForm(EMPTY); setNameErr('') }}
              style={{ flex: 1, padding: '0.65rem', background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>취소</button>
            <button onClick={handleAdd}
              style={{ flex: 1, padding: '0.65rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>저장</button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {employees.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👷</div>
            등록된 직원이 없습니다.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['순서', '이름', '역할', ''].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} style={orderBtn}>↑</button>
                      <button onClick={() => move(idx, 1)} disabled={idx === employees.length - 1} style={orderBtn}>↓</button>
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: '700', color: '#1e3a5f' }}>{emp.name}</td>
                  <td style={{ padding: '0.7rem 1rem', color: '#374151' }}>{emp.role}</td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <button onClick={() => handleDelete(emp.id)}
                      style={{ padding: '0.3rem 0.75rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const labelS = { display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }
const inputS = { width: '100%', padding: '0.6rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }
const orderBtn = { padding: '2px 7px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', cursor: 'pointer', fontSize: '13px' }
