import type { ItemRow } from './items'
import { fileExt, isImageMime } from './files'

/** 미리보기 창이 고르는 표시 방식 */
export type PreviewKind = 'text' | 'link' | 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'none'

/** 브라우저가 텍스트로 받아 보여 줄 수 있는 확장자 (코드·설정·데이터 파일) */
const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'jsonl', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'xml', 'html', 'htm', 'css', 'scss', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'py', 'ipynb', 'rb', 'go', 'rs', 'java',
  'kt', 'c', 'h', 'cpp', 'hpp', 'cs', 'swift', 'php', 'sh', 'bash', 'zsh', 'ps1', 'sql', 'r', 'm', 'tex', 'bib', 'srt',
  'vtt', 'gitignore', 'dockerfile',
])

const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus'])

/** 텍스트 파일 미리보기로 받아 올 최대 크기. 넘으면 앞부분만 보이지 않고 다운로드 안내만 한다. */
export const TEXT_PREVIEW_MAX = 512 * 1024

export function previewKindOf(item: Pick<ItemRow, 'kind' | 'mime_type' | 'file_name' | 'file_size'>): PreviewKind {
  if (item.kind === 'text') return 'text'
  if (item.kind === 'link') return 'link'
  const mime = item.mime_type ?? ''
  const ext = fileExt(item.file_name ?? '')
  if (isImageMime(mime) && mime !== 'image/heic' && mime !== 'image/heif') return 'image'
  if (mime.startsWith('video/') || VIDEO_EXT.has(ext)) return 'video'
  if (mime.startsWith('audio/') || AUDIO_EXT.has(ext)) return 'audio'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  const textual = mime.startsWith('text/') || mime === 'application/json' || TEXT_EXT.has(ext)
  if (textual && (item.file_size ?? 0) <= TEXT_PREVIEW_MAX) return 'code'
  return 'none'
}

/** 파일 타일에 쓰는 짧은 확장자 표기 (최대 4글자, 대문자). 없으면 FILE. */
export function extBadge(name: string | null | undefined): string {
  const ext = fileExt(name ?? '')
  return ext ? ext.slice(0, 4).toUpperCase() : 'FILE'
}

/** 링크의 도메인 (www. 제거). 주소가 아니면 null. */
export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** 목록 행에 보일 제목 한 줄 */
export function itemTitle(item: Pick<ItemRow, 'kind' | 'title' | 'content' | 'file_name'>): string {
  if (item.kind === 'file') return item.file_name ?? item.title ?? '파일'
  if (item.kind === 'link') return item.title || item.content || '링크'
  const first = (item.content ?? '').split(/\r?\n/).find((l) => l.trim() !== '')
  return (first ?? item.title ?? '').trim() || '빈 메모'
}

/** 텍스트 항목의 둘째 줄 이후 요약 (목록 행 보조 줄) */
export function textExcerpt(content: string | null | undefined, max = 140): string {
  const lines = (content ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.slice(1).join('  ').slice(0, max)
}

export interface DayGroup<T> {
  key: string
  label: string
  items: T[]
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** 날짜 묶음 이름: 오늘 · 어제 · 11월 2일 월요일 · (해가 다르면) 2025년 11월 2일 */
export function dayLabel(d: Date, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}년 ${md}`
  return `${md} ${WEEKDAY[d.getDay()]}요일`
}

/** 최신순으로 정렬된 항목을 날짜별로 묶는다. 순서는 그대로 유지한다. */
export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  let current: DayGroup<T> | null = null
  for (const it of items) {
    const d = new Date(it.created_at)
    const key = dayKey(d)
    if (!current || current.key !== key) {
      current = { key, label: dayLabel(d, now), items: [] }
      groups.push(current)
    }
    current.items.push(it)
  }
  return groups
}

export const UNKNOWN_SOURCE = '알 수 없음'

/** 기기별 개수. 많은 순, 같으면 이름순. 출처 없는 항목은 맨 뒤. */
export function countBySource(items: ReadonlyArray<Pick<ItemRow, 'source'>>): Array<{ source: string; count: number }> {
  const map = new Map<string, number>()
  for (const it of items) {
    const s = it.source?.trim() || UNKNOWN_SOURCE
    map.set(s, (map.get(s) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort(
      (a, b) =>
        Number(a.source === UNKNOWN_SOURCE) - Number(b.source === UNKNOWN_SOURCE) ||
        b.count - a.count ||
        a.source.localeCompare(b.source, 'ko'),
    )
}

/** 상자에 든 파일 용량 합계(바이트) */
export function totalFileBytes(items: ReadonlyArray<Pick<ItemRow, 'kind' | 'file_size'>>): number {
  return items.reduce((sum, it) => sum + (it.kind === 'file' ? (it.file_size ?? 0) : 0), 0)
}

/** 시각 표시: 오늘이면 "오후 3:12", 아니면 "11. 2. 오후 3:12" */
export function timeLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  return `${d.getMonth() + 1}. ${d.getDate()}. ${time}`
}

/** 미리보기 창 머리의 전체 날짜 */
export function fullDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
