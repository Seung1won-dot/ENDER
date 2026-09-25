export type TextKind = 'text' | 'link'

const SINGLE_URL = /^https?:\/\/\S+$/i

export function isSafeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function detectKind(text: string): TextKind {
  const t = text.trim()
  if (!t || !SINGLE_URL.test(t)) return 'text'
  return isSafeHttpUrl(t) ? 'link' : 'text'
}

// 코드·명령·JSON 처럼 보이는 줄의 흔적: 괄호·세미콜론·대입, 들여쓰기, 명령어·키워드로 시작, --옵션, "키":
// (들여쓴 글머리표 "  - 항목" 은 코드가 아니라 목록이므로 제외)
const CODE_LINE =
  /[{};=<>[\]`$#|\\]|=>|::|->|^\s{2,}(?![-*•]\s)\S|^(sudo|apt|brew|npm|npx|pnpm|yarn|git|docker|curl|wget|ssh|scp|qm|pct|systemctl|pip|python|node|deno|cd|export|import|from|def|class|function|const|let|var|return|if|for|while|echo|cat|grep|sed|awk)\b|\s--?[a-z]|"[^"]*"\s*:/

/** 두 줄 이상이고 대부분의 줄이 코드처럼 보이면 true. 모노 글꼴로 보여 줄지 정할 때 쓴다. */
export function looksLikeCode(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return false
  const codeish = lines.filter((l) => CODE_LINE.test(l)).length
  return codeish / lines.length >= 0.6
}

export function linkTitle(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return seg ? `${host}/${seg}` : host
  } catch {
    return url.slice(0, 60)
  }
}
