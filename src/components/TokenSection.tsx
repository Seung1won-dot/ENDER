import { useEffect, useState } from 'react'
import { createShareToken, listShareTokens, revokeShareToken, type ShareTokenRow } from '../lib/tokens'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share`

export function TokenSection() {
  const [rows, setRows] = useState<ShareTokenRow[]>([])
  const [label, setLabel] = useState('아이폰 단축어')
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      setRows(await listShareTokens())
    } catch (e) {
      toast.error(messageOf(e))
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function create() {
    setBusy(true)
    try {
      const { token } = await createShareToken(label)
      setFresh(token)
      await refresh()
    } catch (e) {
      toast.error(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('이 토큰을 폐기할까요? 연결된 단축어는 더 이상 동작하지 않아요.')) return
    try {
      await revokeShareToken(id)
      await refresh()
    } catch (e) {
      toast.error(messageOf(e))
    }
  }

  return (
    <section className="field">
      단축어 토큰
      <span className="dim small">
        아이폰 단축어가 <code>{FUNCTION_URL}</code> 로 보낼 때 쓰는 개인 키. 생성 직후 한 번만 표시돼요.
      </span>

      {fresh && (
        <div className="token-fresh">
          <code>{fresh}</code>
          <div className="row end">
            <button
              className="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(fresh)
                toast.info('토큰을 복사했어요')
              }}
            >
              복사
            </button>
            <button className="ghost" onClick={() => setFresh(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      <ul className="token-list">
        {rows.map((r) => (
          <li key={r.id}>
            <span>
              {r.label ?? '(이름 없음)'}
              <span className="dim small">
                {' '}
                · {new Date(r.created_at).toLocaleDateString('ko-KR')}
                {r.last_used_at ? ` · 마지막 사용 ${new Date(r.last_used_at).toLocaleString('ko-KR')}` : ' · 미사용'}
              </span>
            </span>
            <button className="icon danger" onClick={() => void revoke(r.id)}>
              폐기
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="dim small">토큰이 없어요.</li>}
      </ul>

      <div className="row">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="토큰 이름" />
        <button className="primary" disabled={busy} onClick={() => void create()}>
          새 토큰
        </button>
      </div>
    </section>
  )
}
