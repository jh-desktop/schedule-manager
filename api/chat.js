export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, context } = req.body

  const systemPrompt = `당신은 건설 현장 감리원 근무계획표 시스템의 AI 어시스턴트입니다.
사용자의 질문에 친절하고 간결하게 한국어로 답변하세요.

근무 상태 안내:
- 근무(검정): 일반 근무일
- TBM(빨간색): Tool Box Meeting - 안전 교육 미팅이 있는 근무일
- 휴무(흰색): 휴무일 (일요일 기본값)

역할: 책임 감리원, 보조 감리원, 기타
직종 및 등급: 전기/특급, 전기/고급, 전기/중급, 전기/초급, 토목/초급, 사무원

${context ? `=== 현재 근무 데이터 ===\n${context}` : '현재 근무 데이터가 없습니다.'}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API 오류' })
    }

    res.status(200).json({ content: data.content[0].text })
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
}
