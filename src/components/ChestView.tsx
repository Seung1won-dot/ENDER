import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { ChestApi } from '../lib/api'
import type { ItemRow } from '../lib/items'
import type { LiveStatus } from '../hooks/useItems'
import { validateFile } from '../lib/files'
import { computeExpiresAt, type ExpiryPreset } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { isSafeHttpUrl } from '../lib/detect'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { filterItems, kindOf } from '../lib/itemsState'
import { countBySource, totalFileBytes } from '../lib/preview'
import { EASE } from '../lib/motion'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { useArrivals } from '../hooks/useNotify'
import { ItemList, type UploadJob } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { PreviewPane } from './PreviewPane'
import { SearchBar } from './SearchBar'
import { Sidebar, StatusBadge, VIEWS, type View } from './Sidebar'
import type { ItemAction } from './ItemRowView'
import { Icon, Mark } from './Icon'

interface Props {
  items: ItemRow[]
  loading: boolean
  error: string | null
  status: LiveStatus
  reload: () => Promise<void> | void
  upsertLocal: (row: ItemRow) => void
  removeLocal: (id: string) => void
  api: ChestApi
  email: string
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onOpenSettings: () => void
}

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const UNDO_MS = 5000
const COPIED_MS = 1400
const UPLOAD_CONCURRENCY = 3

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const VIEW_TITLE: Record<View, string> = Object.fromEntries(VIEWS.map((v) => [v.value, v.label])) as Record<View, string>

export function ChestView({ items, loading, error, status, reload, upsertLocal, removeLocal, api, email, expiry, onExpiryChange: setExpiry, onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('all')
  const [source, setSource] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadJob[]>([])
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set())
  const anchor = useRef<string | null>(null)
  const deleteTimers = useRef(new Map<string, { timer: number; run: () => void }>())
  const myDevice = useMemo(() => getDeviceName(), [])

  const live = useMemo(() => items.filter((i) => !pendingDelete.has(i.id)), [items, pendingDelete])
  const thumbUrls = useThumbUrls(live, api.viewUrl)
  const { fresh, markSeen } = useArrivals(live, loading, myDevice)

  // ---------- 보기·검색 ----------
  const counts = useMemo(() => {
    const c: Record<View, number> = { all: live.length, pinned: 0, text: 0, link: 0, image: 0, file: 0 }
    for (const it of live) {
      if (it.pinned) c.pinned += 1
      c[kindOf(it)] += 1
    }
    return c
  }, [live])
  const sources = useMemo(() => countBySource(live), [live])
  const usedBytes = useMemo(() => totalFileBytes(live), [live])

  const visible = useMemo(() => {
    let list = filterItems(live, query)
    const q = query.trim().toLowerCase()
    if (q) {
      const bySource = live.filter((i) => (i.source ?? '').toLowerCase().includes(q))
      const ids = new Set(list.map((i) => i.id))
      list = [...list, ...bySource.filter((i) => !ids.has(i.id))].sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    if (source) list = list.filter((i) => (i.source?.trim() || '알 수 없음') === source)
    if (view === 'pinned') list = list.filter((i) => i.pinned)
    else if (view !== 'all') list = list.filter((i) => kindOf(i) === view)
    return list
  }, [live, query, view, source])

  const splitPinned = view === 'all' && !source && query.trim() === ''
  const ordered = useMemo(
    () => (splitPinned ? [...visible.filter((i) => i.pinned), ...visible.filter((i) => !i.pinned)] : visible),
    [visible, splitPinned],
  )
  const active = useMemo(() => live.find((i) => i.id === activeId) ?? null, [live, activeId])
  const filtered = query.trim() !== '' || view !== 'all' || source !== null

  // 사라진 항목은 선택에서도 뺀다
  useEffect(() => {
    if (activeId && !live.some((i) => i.id === activeId)) setActiveId(null)
    setChecked((prev) => {
      if (prev.size === 0) return prev
      const ids = new Set(live.map((i) => i.id))
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [live, activeId])

  // 폰에서는 미리보기가 전체 화면이라, 뒤로 가기(스와이프)로 닫히게 기록을 한 칸 쌓는다.
  useEffect(() => {
    if (!activeId || !window.matchMedia('(max-width: 899px)').matches) return
    if (!(history.state as { pv?: boolean } | null)?.pv) history.pushState({ ...(history.state ?? {}), pv: true }, '')
  }, [activeId])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (!(e.state as { pv?: boolean } | null)?.pv) setActiveId(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const closePreview = useCallback(() => {
    if ((history.state as { pv?: boolean } | null)?.pv) history.back()
    else setActiveId(null)
  }, [])

  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(null), COPIED_MS)
    return () => window.clearTimeout(t)
  }, [copiedId])

  const clearFilters = useCallback(() => {
    setQuery('')
    setView('all')
    setSource(null)
  }, [])

  // ---------- 넣기 ----------
  const submitText = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        const row = await api.addText(text, { source: myDevice, expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
        return true
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
        return false
      }
    },
    [api, expiry, myDevice, upsertLocal],
  )

  const submitFiles = useCallback(
    (files: File[]) => {
      const accepted: Array<{ job: UploadJob; file: File }> = []
      for (const file of files) {
        const problem = validateFile(file)
        if (problem) toast.error(problem)
        else accepted.push({ job: { id: crypto.randomUUID(), name: file.name, size: file.size }, file })
      }
      if (accepted.length === 0) return
      setUploads((prev) => [...prev, ...accepted.map((a) => a.job)])
      const expiresAt = computeExpiresAt(expiry)
      let next = 0
      let done = 0
      let failed = 0
      const worker = async () => {
        while (next < accepted.length) {
          const { job, file } = accepted[next++]!
          try {
            const row = await api.addFile(file, { source: myDevice, expiresAt })
            upsertLocal(row)
            done += 1
          } catch (e) {
            failed += 1
            toast.error(`${file.name} 올리지 못했어요: ${messageOf(e)}`)
          } finally {
            setUploads((prev) => prev.filter((u) => u.id !== job.id))
          }
        }
      }
      void Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, accepted.length) }, worker)).then(() => {
        if (done > 0) toast.info(done === 1 && failed === 0 ? `${accepted[0]!.file.name} 넣었어요` : `파일 ${done}개 넣었어요`)
      })
    },
    [api, expiry, myDevice, upsertLocal],
  )

  const pasteText = useCallback((text: string) => void submitText(text).then((ok) => ok && toast.info('붙여넣은 내용을 넣었어요')), [submitText])
  usePaste(pasteText, submitFiles)
  const dragging = useDropzone(submitFiles)

  // ---------- 삭제 (되돌리기 5초) ----------
  const scheduleDelete = useCallback(
    (targets: ItemRow[]) => {
      if (targets.length === 0) return
      const ids = targets.map((t) => t.id)
      setPendingDelete((prev) => new Set([...prev, ...ids]))
      setChecked(new Set())
      const key = ids.join(',')
      const run = () => {
        deleteTimers.current.delete(key)
        void (async () => {
          let failed = 0
          for (const t of targets) {
            try {
              await api.remove(t)
              removeLocal(t.id)
            } catch {
              failed += 1
            }
          }
          setPendingDelete((prev) => {
            const next = new Set(prev)
            ids.forEach((id) => next.delete(id))
            return next
          })
          if (failed > 0) {
            toast.error(`${failed}개를 지우지 못했어요. 다시 시도해 주세요.`)
            void reload()
          }
        })()
      }
      const timer = window.setTimeout(run, UNDO_MS)
      deleteTimers.current.set(key, { timer, run })
      toast.info(targets.length === 1 ? '삭제했어요' : `${targets.length}개 삭제했어요`, {
        ttl: UNDO_MS,
        action: {
          label: '되돌리기',
          run: () => {
            window.clearTimeout(timer)
            deleteTimers.current.delete(key)
            setPendingDelete((prev) => {
              const next = new Set(prev)
              ids.forEach((id) => next.delete(id))
              return next
            })
          },
        },
      })
    },
    [api, removeLocal, reload],
  )

  // 창을 닫으면 기다리던 삭제를 바로 보낸다
  useEffect(() => {
    const flush = () => {
      for (const { timer, run } of deleteTimers.current.values()) {
        window.clearTimeout(timer)
        run()
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // ---------- 항목 동작 ----------
  const onAction = useCallback(
    async (action: ItemAction, item: ItemRow): Promise<boolean> => {
      try {
        switch (action) {
          case 'copy':
            if (item.kind === 'file') return false
            await navigator.clipboard.writeText(item.content ?? '')
            setCopiedId(item.id)
            toast.info('복사했어요')
            break
          case 'open':
            if (item.content && isSafeHttpUrl(item.content)) window.open(item.content, '_blank', 'noopener,noreferrer')
            break
          case 'download':
            if (!item.file_path) return false
            triggerDownload(await api.downloadUrl(item.file_path, item.file_name ?? 'file'), item.file_name ?? 'file')
            break
          case 'share': {
            if (item.kind === 'file' && item.file_path) {
              const url = await api.viewUrl(item.file_path)
              const blob = await (await fetch(url)).blob()
              const file = new File([blob], item.file_name ?? 'file', { type: item.mime_type ?? blob.type })
              if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: item.file_name ?? undefined })
              else await navigator.share({ title: item.file_name ?? undefined, url })
            } else if (item.kind === 'link' && item.content) {
              await navigator.share({ title: item.title ?? undefined, url: item.content })
            } else {
              await navigator.share({ text: item.content ?? '' })
            }
            break
          }
          case 'pin': {
            const pinned = !item.pinned
            upsertLocal({ ...item, pinned })
            upsertLocal(await api.update(item.id, { pinned }))
            break
          }
          case 'delete':
            scheduleDelete([item])
            break
        }
        markSeen(item.id)
        return true
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return false
        toast.error(messageOf(e))
        void reload()
        return false
      }
    },
    [api, upsertLocal, scheduleDelete, reload, markSeen],
  )

  const saveText = useCallback(
    async (item: ItemRow, text: string) => {
      try {
        upsertLocal(await api.update(item.id, { text }))
        toast.info('저장했어요')
        return true
      } catch (e) {
        toast.error(`저장하지 못했어요: ${messageOf(e)}`)
        return false
      }
    },
    [api, upsertLocal],
  )

  const setItemExpiry = useCallback(
    (item: ItemRow, preset: ExpiryPreset) => {
      void (async () => {
        try {
          upsertLocal(await api.update(item.id, { expires_at: computeExpiresAt(preset) }))
          toast.info(preset === 'never' ? '계속 보관해요' : '보관 기간을 바꿨어요')
        } catch (e) {
          toast.error(messageOf(e))
        }
      })()
    },
    [api, upsertLocal],
  )

  // ---------- 선택 ----------
  function openItem(item: ItemRow, e: MouseEvent) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleCheck(item, e)
      return
    }
    setActiveId(item.id)
    anchor.current = item.id
    markSeen(item.id)
  }

  function toggleCheck(item: ItemRow, e: MouseEvent) {
    e.stopPropagation()
    setChecked((prev) => {
      const next = new Set(prev)
      if (e.shiftKey && anchor.current) {
        const a = ordered.findIndex((i) => i.id === anchor.current)
        const b = ordered.findIndex((i) => i.id === item.id)
        if (a >= 0 && b >= 0) {
          const [from, to] = a < b ? [a, b] : [b, a]
          for (const it of ordered.slice(from, to + 1)) next.add(it.id)
          return next
        }
      }
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
    anchor.current = item.id
  }

  const checkedItems = useMemo(() => ordered.filter((i) => checked.has(i.id)), [ordered, checked])

  async function bulkDownload() {
    const files = checkedItems.filter((i) => i.kind === 'file' && i.file_path)
    for (const f of files) {
      try {
        triggerDownload(await api.downloadUrl(f.file_path!, f.file_name ?? 'file'), f.file_name ?? 'file')
        await new Promise((r) => setTimeout(r, 450))
      } catch (e) {
        toast.error(`${f.file_name} 받지 못했어요: ${messageOf(e)}`)
      }
    }
  }

  async function bulkCopy() {
    const texts = checkedItems.filter((i) => i.kind !== 'file').map((i) => i.content ?? '')
    if (texts.length === 0) return
    try {
      await navigator.clipboard.writeText(texts.join('\n\n'))
      toast.info(`${texts.length}개를 한꺼번에 복사했어요`)
    } catch (e) {
      toast.error(messageOf(e))
    }
  }

  async function bulkPin() {
    const allPinned = checkedItems.every((i) => i.pinned)
    for (const it of checkedItems) {
      try {
        upsertLocal({ ...it, pinned: !allPinned })
        upsertLocal(await api.update(it.id, { pinned: !allPinned }))
      } catch (e) {
        toast.error(messageOf(e))
      }
    }
  }

  // ---------- 키보드 ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('dialog[open]')) return
      if (e.altKey) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'a') {
        if (ordered.length === 0) return
        e.preventDefault()
        setChecked(new Set(ordered.map((i) => i.id)))
        return
      }
      if (mod) return

      const idx = activeId ? ordered.findIndex((i) => i.id === activeId) : -1
      const move = (d: number) => {
        if (ordered.length === 0) return
        const n = idx < 0 ? (d > 0 ? 0 : ordered.length - 1) : Math.max(0, Math.min(ordered.length - 1, idx + d))
        const it = ordered[n]!
        setActiveId(it.id)
        anchor.current = it.id
        markSeen(it.id)
        const el = document.querySelector<HTMLElement>(`[data-id="${it.id}"]`)
        el?.querySelector<HTMLElement>('.row-hit')?.focus({ preventScroll: true })
        el?.scrollIntoView({ block: 'nearest' })
      }
      const cur = idx >= 0 ? ordered[idx]! : null
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          move(1)
          break
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          move(-1)
          break
        case 'Escape':
          if (checked.size > 0) setChecked(new Set())
          else if (activeId) closePreview()
          break
        case 'Enter':
          // 행 위(또는 아무 데도 아닌 곳)에서 Enter = 기본 동작(복사·다운로드). 다른 버튼·링크는 원래대로.
          if (
            cur &&
            (!(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) ||
              (e.target as HTMLElement).classList.contains('row-hit'))
          ) {
            e.preventDefault()
            void onAction(cur.kind === 'file' ? 'download' : 'copy', cur)
          }
          break
        case 'c':
          if (cur) void onAction('copy', cur)
          break
        case 'd':
          if (cur) void onAction('download', cur)
          break
        case 'o':
          if (cur) void onAction('open', cur)
          break
        case 'p':
          if (cur) void onAction('pin', cur)
          break
        case 'x':
          if (cur) {
            setChecked((prev) => {
              const next = new Set(prev)
              if (next.has(cur.id)) next.delete(cur.id)
              else next.add(cur.id)
              return next
            })
          }
          break
        case 'Delete':
        case 'Backspace':
          if (checkedItems.length > 0) scheduleDelete(checkedItems)
          else if (cur) {
            const after = ordered[idx + 1] ?? ordered[idx - 1] ?? null
            scheduleDelete([cur])
            setActiveId(after?.id ?? null)
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ordered, activeId, checked, checkedItems, onAction, scheduleDelete, markSeen, closePreview])

  const heading = source ?? VIEW_TITLE[view]
  const fileCount = checkedItems.filter((i) => i.kind === 'file').length
  const textCount = checkedItems.length - fileCount

  return (
    <div className={active ? 'app has-preview' : 'app'}>
      <Sidebar
        status={status}
        view={view}
        counts={counts}
        onView={setView}
        sources={sources}
        source={source}
        myDevice={myDevice}
        onSource={setSource}
        usedBytes={usedBytes}
        email={email}
        onOpenSettings={onOpenSettings}
      />

      <main className="main">
        <header className="mobile-bar">
          <Mark size={22} />
          <span className="side-name">Ender Chest</span>
          <StatusBadge status={status} />
          <span className="spacer" />
          <button type="button" className="icon-btn" aria-label="설정" onClick={onOpenSettings}>
            <Icon name="sliders" size={18} />
          </button>
        </header>

        <div className="main-head">
          <h1 className="main-title">
            {heading}
            <span className="main-count">{visible.length}</span>
          </h1>
          <span className="spacer" />
          <SearchBar value={query} onChange={setQuery} />
        </div>

        <div className="view-chips" role="group" aria-label="보기">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              className="chip-btn"
              aria-pressed={view === v.value && !source}
              onClick={() => {
                setView(v.value)
                setSource(null)
              }}
            >
              {v.label}
              <span className="chip-count">{counts[v.value]}</span>
            </button>
          ))}
        </div>

        <Composer expiry={expiry} onExpiryChange={setExpiry} onSubmitText={submitText} onPickFiles={submitFiles} busy={uploads.length > 0} />

        <AnimatePresence>
          {checked.size > 0 && (
            <m.div
              className="select-bar"
              role="toolbar"
              aria-label="선택한 항목"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: EASE }}
            >
              <span className="select-count">{checked.size}개 선택</span>
              <span className="spacer" />
              {fileCount > 0 && (
                <button type="button" className="btn btn-quiet" onClick={() => void bulkDownload()}>
                  <Icon name="download" size={15} />
                  <span className="hide-sm">다운로드</span>
                </button>
              )}
              {textCount > 0 && (
                <button type="button" className="btn btn-quiet" onClick={() => void bulkCopy()}>
                  <Icon name="copy" size={15} />
                  <span className="hide-sm">복사</span>
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={() => void bulkPin()}>
                <Icon name="pin" size={15} />
                <span className="hide-sm">고정</span>
              </button>
              <button type="button" className="btn btn-quiet danger" onClick={() => scheduleDelete(checkedItems)}>
                <Icon name="trash" size={15} />
                <span className="hide-sm">삭제</span>
              </button>
              <button type="button" className="icon-btn" aria-label="선택 해제" onClick={() => setChecked(new Set())}>
                <Icon name="close" size={16} />
              </button>
            </m.div>
          )}
        </AnimatePresence>

        <ItemList
          items={visible}
          splitPinned={splitPinned}
          loading={loading}
          error={error}
          onRetry={() => void reload()}
          filtered={filtered}
          filterKey={`${view}|${source ?? ''}|${query.trim().toLowerCase()}`}
          thumbUrls={thumbUrls}
          activeId={activeId}
          checked={checked}
          fresh={fresh}
          copiedId={copiedId}
          uploads={uploads}
          onOpen={openItem}
          onToggleCheck={toggleCheck}
          onAction={onAction}
          onClearFilters={clearFilters}
        />
      </main>

      <PreviewPane
        item={active}
        api={api}
        canShare={canShare}
        copied={active !== null && copiedId === active.id}
        onAction={onAction}
        onSaveText={saveText}
        onSetExpiry={setItemExpiry}
        onClose={closePreview}
      />

      <DropOverlay active={dragging} />
    </div>
  )
}
