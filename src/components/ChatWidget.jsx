import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore'
import { db } from '../firebase'

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDayIdx = (y, m, d) => new Date(y, m - 1, d).getDay()

const formatRanges = (days) => {
  if (days.length === 0) return '없음'
  const ranges = []
  let start = days[0], end = days[0]
  for (let i = 1; i < days.length; i++) {
    if (days[i] === end + 1) { end = days[i] }
    else { ranges.push(start === end ? `${start}일` : `${start}~${end}일`); start = end = days[i] }
  }
  ranges.push(start === end ? `${start}일` : `${start}~${end}일`)
  return ranges.join(', ')
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 근무계획표 관련 질문이 있으시면 편하게 물어보세요 😊' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState({})
  const bottomRef = useRef(null)

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    if (employees.length === 0) return
    const unsubs = employees.map(emp => {
      const docId = `${year}-${month}-${emp.id}`
      return onSnapshot(doc(db, 'schedules', docId), snap => {
        setSchedules(prev => ({ ...prev, [emp.id]: snap.exists() ? snap.data() : {} }))
      })
    })
    return () => unsubs.forEach(u => u())
  }, [employees, year, month])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const buildContext = () => {
    if (employees.length === 0) return ''
    const n = getDaysInMonth(year, month)
    const lines = [`${year}년 ${month}월 근무 현황 (직원 ${employees.length}명)\n`]
    employees.forEach(emp => {
      const days = schedules[emp.id]?.days || {}
      const workDays = [], tbmDays = []
      for (let d = 1; d <= n; d++) {
        const isSun = getDayIdx(year, month, d) === 0
        const state = days[d] ?? (isSun ? 'off' : 'work')
        if (state !== 'off') workDays.push(d)
        if (state === 'tbm') tbmDays.push(d)
      }
      lines.push(`• ${emp.name} (${emp.role}, ${emp.grade || '-'}): 근무 ${workDays.length}일 [${formatRanges(workDays)}], TBM ${tbmDays.length}일 [${formatRanges(tbmDays)}]`)
    })
    return lines.join('\n')
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 300,
          width: '52px', height: '52px', borderRadius: '50%',
          background: open ? '#475569' : '#1e3a5f',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        title="AI 어시스턴트"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 300,
          width: '340px', maxWidth: 'calc(100vw - 2rem)',
          background: '#fff', borderRadius: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', maxHeight: '520px',
        }}>
          {/* 헤더 */}
          <div style={{ background: '#1e3a5f', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <div>
              <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '0.9rem' }}>AI 어시스턴트</div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{year}년 {month}월 근무 데이터 연동 중</div>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '0.55rem 0.875rem',
                  borderRadius: m.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  background: m.role === 'user' ? '#1e3a5f' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.55rem 0.875rem', borderRadius: '1rem 1rem 1rem 0.25rem', background: '#f1f5f9', fontSize: '0.85rem', color: '#94a3b8' }}>
                  입력 중...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 추천 질문 */}
          {messages.length === 1 && (
            <div style={{ padding: '0 0.875rem 0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['이번 달 TBM 현황 알려줘', 'TBM 가장 많은 직원은?', '근무일수 요약해줘'].map(q => (
                <button key={q} onClick={() => { setInput(q) }} style={{
                  padding: '0.3rem 0.6rem', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '1rem', fontSize: '0.75rem', cursor: 'pointer', color: '#475569',
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 입력창 */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="질문을 입력하세요..."
              disabled={loading}
              style={{
                flex: 1, padding: '0.55rem 0.75rem',
                border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.55rem 0.875rem', background: '#1e3a5f', color: '#fff',
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: '600',
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  )
}
