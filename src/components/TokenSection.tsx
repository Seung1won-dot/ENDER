import { useEffect, useState } from 'react'
import { createShareToken, listShareTokens, revokeShareToken, type ShareTokenRow } from '../lib/tokens'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { Icon } from './Icon'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share`

const SHORT: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }

function tokenMeta(r: ShareTokenRow): string {
  const made = new Date(r.created_at).toLocaleDateString('ko-KR', { dateStyle: 'short' })
  const used = r.last_used_at ? `마지막 사용 ${new Date(r.last_used_at).toLocaleString('ko-KR', SHORT)}` : '아직 사용 안 함'
  return `만든 날 ${made} · ${used}`
}

/** 설정 창 안의 단축어 토큰 구역. 창이 열릴 때마다 목록을 다시 읽고, 닫히면 방금 만든 토큰 표시를 지운다. */
export function TokenSection({ open }: { open: boolean }) {
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
    if (open) void refresh()
    else setFresh(null)
  }, [open])

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

  async function copyFresh() {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      toast.info('토큰을 복사했어요')
    } catch (e) {
      toast.error(messageOf(e))
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
    <div className="field">
      <span className="field-label">단축어 토큰</span>
      <span className="field-help">
        아이폰 단축어가 아래 주소로 보낼 때 쓰는 개인 키. 생성 직후 한 번만 표시돼요.
        <code className="token-url">{FUNCTION_URL}</code>
      </span>

      {fresh && (
        <div className="token-fresh" role="status">
          <code>{fresh}</code>
          <div className="row-inline end">
            <button type="button" className="btn btn-ghost" onClick={() => void copyFresh()}>
              <Icon name="copy" size={16} />
              복사
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFresh(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      <ul className="token-list">
        {rows.map((r) => (
          <li key={r.id} className="token-item">
            <span className="token-text">
              <span className="token-name">{r.label ?? '(이름 없음)'}</span>
              <span className="token-meta">{tokenMeta(r)}</span>
            </span>
            <button
              type="button"
              className="icon-btn danger"
              title="폐기"
              aria-label={`${r.label ?? '토큰'} 폐기`}
              onClick={() => void revoke(r.id)}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="token-item dim small">토큰이 없어요.</li>}
      </ul>

      <div className="row-inline">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="토큰 이름"
          aria-label="토큰 이름"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void create()}>
          <Icon name="key" size={16} />새 토큰
        </button>
      </div>
    </div>
  )
}
