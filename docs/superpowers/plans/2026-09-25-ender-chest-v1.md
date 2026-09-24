# Ender Chest v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows PC · 맥미니 · 아이폰 사이에서 텍스트/링크/파일을 넣으면 다른 기기에 실시간으로 뜨는 개인 상자(PWA)를 Supabase 위에 만든다.

**Architecture:** 단일 Vite+React PWA가 supabase-js로 Postgres(RLS)·Storage·Realtime에 직접 접근한다. 서버 코드는 아이폰 단축어용 Deno Edge Function `share` 하나뿐이다. 순수 로직(URL 판별, 파일 규칙, 만료 계산, 목록 상태)은 `src/lib`에 UI와 분리해 vitest로 검증한다.

**Tech Stack:** Node.js 22 LTS, Vite 5, React 18, TypeScript 5 strict, @supabase/supabase-js v2, vite-plugin-pwa, vitest, Supabase CLI(`npx supabase`), Deno(Edge Function 런타임)

**Spec:** `docs/superpowers/specs/2026-09-25-ender-chest-v1-design.md` (기획서 원문은 `docs/PLAN.md`)

## Global Constraints

- TypeScript `strict: true`, `noUnusedLocals`, `noUnusedParameters`. `any` 금지(`unknown` 후 좁히기).
- 외부 상태 관리 라이브러리 없음. React 훅 + Supabase 콜백만.
- UI 문구는 한국어. 에러 토스트도 한국어.
- 파일 상한 `50 * 1024 * 1024` 바이트. 차단 확장자: `exe msi bat cmd com scr vbs jar apk dmg pkg` (.sh .ps1 .js 는 허용).
- 만료 프리셋 `'1h' | '1d' | '7d' | 'never'`, 기본 `'7d'`.
- Storage 버킷 이름 `chest`, 오브젝트 경로 `<user_id>/<uuid>-<sanitized_name>`. 서명 URL 유효 3600초.
- `.env` 는 절대 커밋하지 않는다. `service_role` 키는 저장소 어디에도 없어야 한다 (`grep -r service_role src supabase` 결과 0건, 단 Edge Function 내부의 `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` 호출은 예외).
- 커밋 메시지는 Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). 각 커밋 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- git 커밋은 `git -c user.name="Seung1_dot" -c user.email="may0909@sch.ac.kr" commit ...` 형태로 (전역 git 설정이 없을 수 있음). 첫 Task에서 로컬 저장소 설정으로 고정한다.
- **Node PATH 주의**: Node는 관리자 권한 없이 포터블 zip으로 `C:SERS	EMPADMIN
ODEJS` ̗� ̄�̹�͖�ˋ�(WINGET MSIˊ� UAC ̊�̝� ͕�̚�). ̃� ̅�̗� PATHʰ� ̕� ̞�͞� ̈� ̞�ˋ�. 모든 npm/node 명령 앞에 `export PATH="/c/Users/tempadmin/nodejs:$PATH"` 를 붙인다 (Bash 툴 기준).
- 실행 명령은 저장소 루트 `D:\EC LAB\ender` (Bash: `/d/EC\ LAB/ender`) 에서 실행한다. 경로에 공백이 있으므로 항상 따옴표로 감싼다.

## 파일 구조

```
ender/
├── index.html                      Vite 진입 HTML (한국어 lang, 메타, 아이콘 링크)
├── package.json                    scripts: dev / build / preview / test / typecheck / check / icons
├── vite.config.ts                  react + VitePWA + vitest 설정
├── tsconfig.json
├── .gitignore  .env.example  README.md
├── public/
│   ├── icon.svg                    원본 아이콘
│   └── icons/icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png (scripts/make-icons.mjs 산출)
├── scripts/make-icons.mjs          SVG → PNG (@resvg/resvg-js)
├── src/
│   ├── main.tsx  App.tsx  vite-env.d.ts
│   ├── lib/
│   │   ├── supabase.ts             createClient
│   │   ├── detect.ts  detect.test.ts        detectKind, isSafeHttpUrl, linkTitle
│   │   ├── files.ts   files.test.ts         MAX_FILE_BYTES, isBlockedFile, sanitizeFileName, formatSize, isImageMime, validateFile, clipboardFileName
│   │   ├── expiry.ts  expiry.test.ts        ExpiryPreset, computeExpiresAt, describeRemaining, isExpiryPreset
│   │   ├── device.ts  device.test.ts        defaultDeviceName, getDeviceName, setDeviceName
│   │   ├── itemsState.ts itemsState.test.ts sortItems, mergeItem, withoutItem, filterItems, isExpired
│   │   ├── items.ts                ItemRow, buildTextPayload, buildFilePath, listItems, addTextItem, addFileItem, deleteItem, setPinned, getSignedUrl, getDownloadUrl, cleanupExpired
│   │   ├── tokens.ts  tokens.test.ts        base64url, hex, generateToken, createShareToken, listShareTokens, revokeShareToken
│   │   ├── toast.ts                모듈 수준 토스트 버스
│   │   └── errors.ts               messageOf(unknown): string
│   ├── hooks/
│   │   ├── useSession.ts  useItems.ts  usePaste.ts  useDropzone.ts  useSignedUrl.ts  useStoredExpiry.ts
│   ├── components/
│   │   ├── AuthScreen.tsx  ChestScreen.tsx  Composer.tsx  ItemList.tsx  ItemCard.tsx
│   │   ├── SearchBar.tsx  DropOverlay.tsx  SettingsDialog.tsx  TokenSection.tsx  ToastHost.tsx
│   └── styles/global.css
└── supabase/
    ├── config.toml                 (npx supabase init 산출, Phase 3)
    ├── migrations/0001_init.sql  0002_storage.sql
    └── functions/share/index.ts  rules.ts
```

---

### Task 1: 개발 환경과 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/styles/global.css`

**Interfaces:**
- Produces: `npm run check` (= `tsc --noEmit && vitest run && vite build`) 가 통과하는 빈 앱. 이후 모든 Task는 이 스크립트로 검증한다.

- [ ] **Step 1: Node.js LTS 설치 (PowerShell 툴)**

```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
```

Expected: "Successfully installed". 이미 설치돼 있으면 "already installed" 도 OK.

- [ ] **Step 2: 설치 확인 (Bash 툴)**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && node --version && npm --version
```

Expected: `v22.x.x` 와 `10.x.x` 계열. `command not found` 면 `ls "/c/Users/tempadmin/nodejs"` 로 경로 확인 후 PATH 수정.

- [ ] **Step 3: git 로컬 설정 고정**

```bash
cd "/d/EC LAB/ender" && git config user.name "Seung1_dot" && git config user.email "may0909@sch.ac.kr" && git config core.autocrlf false && git config --list --local | grep -E "user|autocrlf"
```

이후 커밋은 `-c` 옵션 없이 `git commit -m` 으로 한다.

- [ ] **Step 4: package.json 작성**

```json
{
  "name": "ender-chest",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --host",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run test && npm run build",
    "icons": "node scripts/make-icons.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vite-plugin-pwa": "^0.20.5",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 5: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "vite.config.ts", "scripts"]
}
```

- [ ] **Step 6: vite.config.ts 작성 (PWA 플러그인은 Task 12에서 채운다)**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 7: index.html 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f1115" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <title>Ender Chest</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: src/vite-env.d.ts, src/main.tsx, src/App.tsx, src/styles/global.css 작성**

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/App.tsx` (임시. Task 7에서 교체):
```tsx
export function App() {
  return (
    <main className="screen">
      <h1>📦 Ender Chest</h1>
      <p>스캐폴드 완료</p>
    </main>
  )
}
```

`src/styles/global.css`:
```css
:root {
  color-scheme: dark;
  --bg: #0f1115;
  --bg-elev: #171a21;
  --bg-hover: #1e222b;
  --border: #2a2f3a;
  --text: #e6e8ee;
  --text-dim: #9aa3b2;
  --accent: #7c5cff;
  --accent-text: #ffffff;
  --danger: #ff5c7a;
  --ok: #3ddc97;
  --radius: 12px;
  --font: system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --bg: #f6f7fb;
    --bg-elev: #ffffff;
    --bg-hover: #eef0f6;
    --border: #d9dde7;
    --text: #171a21;
    --text-dim: #5d6675;
  }
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--accent); }
.screen { max-width: 760px; margin: 0 auto; padding: 16px; min-height: 100%; }
```

- [ ] **Step 9: .gitignore 와 .env.example 작성**

`.gitignore`:
```
node_modules
dist
dev-dist
.env
.env.*
!.env.example
.vercel
.superpowers
supabase/.temp
supabase/.branches
*.log
.DS_Store
Thumbs.db
```

`.env.example`:
```
# Supabase 대시보드 → Project Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 10: 의존성 설치 및 검증**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm install && npm run check
```

Expected: `tsc` 에러 0, vitest 는 "No test files found" 를 출력하고 종료 코드 0, `vite build` 가 `dist/` 생성.

- [ ] **Step 11: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git commit -m "chore: scaffold Vite + React + TypeScript project

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: URL 판별 `detect.ts`

**Files:**
- Create: `src/lib/detect.ts`, `src/lib/detect.test.ts`

**Interfaces:**
- Produces:
  - `type TextKind = 'text' | 'link'`
  - `detectKind(text: string): TextKind` — 공백 제거 후 전체가 하나의 http(s) URL이면 `'link'`
  - `isSafeHttpUrl(s: string): boolean` — `http:`/`https:` 프로토콜의 파싱 가능한 URL
  - `linkTitle(url: string): string` — 호스트명(`www.` 제거) + 경로 첫 세그먼트. 예: `https://www.youtube.com/watch?v=x` → `youtube.com/watch`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/detect.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { detectKind, isSafeHttpUrl, linkTitle } from './detect'

describe('detectKind', () => {
  it('일반 문장은 text', () => {
    expect(detectKind('오늘 회의 3시')).toBe('text')
  })
  it('http(s) URL 하나만 있으면 link', () => {
    expect(detectKind('https://example.com/a?b=1')).toBe('link')
    expect(detectKind('http://example.com')).toBe('link')
  })
  it('앞뒤 공백·줄바꿈은 무시', () => {
    expect(detectKind('  https://example.com \n')).toBe('link')
  })
  it('URL 뒤에 다른 글자가 있으면 text', () => {
    expect(detectKind('https://example.com 봐줘')).toBe('text')
  })
  it('여러 줄이면 text', () => {
    expect(detectKind('https://a.com\nhttps://b.com')).toBe('text')
  })
  it('http(s) 이외 스킴은 text', () => {
    expect(detectKind('ftp://files.example.com')).toBe('text')
    expect(detectKind('javascript:alert(1)')).toBe('text')
  })
  it('빈 문자열은 text', () => {
    expect(detectKind('')).toBe('text')
  })
})

describe('isSafeHttpUrl', () => {
  it('http/https 만 true', () => {
    expect(isSafeHttpUrl('https://a.com')).toBe(true)
    expect(isSafeHttpUrl('http://a.com')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})

describe('linkTitle', () => {
  it('www 제거 + 경로 첫 세그먼트', () => {
    expect(linkTitle('https://www.youtube.com/watch?v=abc')).toBe('youtube.com/watch')
  })
  it('경로 없으면 호스트만', () => {
    expect(linkTitle('https://github.com/')).toBe('github.com')
  })
  it('파싱 실패하면 원문 앞 60자', () => {
    expect(linkTitle('nope')).toBe('nope')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/detect.test.ts
```

Expected: FAIL — `Failed to resolve import "./detect"`.

- [ ] **Step 3: 구현**

`src/lib/detect.ts`:
```ts
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
```

- [ ] **Step 4: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/detect.test.ts
```

Expected: 11 passed.

- [ ] **Step 5: 커밋**

```bash
cd "/d/EC LAB/ender" && git add src/lib/detect.ts src/lib/detect.test.ts && git commit -m "feat: add URL detection helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: 파일 규칙 `files.ts`

**Files:**
- Create: `src/lib/files.ts`, `src/lib/files.test.ts`

**Interfaces:**
- Produces:
  - `MAX_FILE_BYTES = 52428800`
  - `fileExt(name: string): string` — 소문자 확장자, 없으면 `''`
  - `isBlockedFile(name: string): boolean`
  - `sanitizeFileName(name: string): string` — Storage 키용 ASCII `[A-Za-z0-9._-]`, 최대 100자, 비면 `'file'`
  - `formatSize(bytes: number): string` — `'0 B' | '1.0 KB' | '10.0 MB' | '1.5 GB'`
  - `isImageMime(mime: string | null | undefined): boolean`
  - `validateFile(file: { name: string; size: number }): string | null` — 거절 사유(한국어) 또는 null
  - `clipboardFileName(original: string, mime: string, now: Date): string` — 클립보드 기본명(`image.png`, 빈 이름)을 `pasted-YYYYMMDD-HHmmss.<ext>` 로

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/files.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  clipboardFileName,
  fileExt,
  formatSize,
  isBlockedFile,
  isImageMime,
  sanitizeFileName,
  validateFile,
} from './files'

describe('fileExt', () => {
  it('소문자 확장자', () => {
    expect(fileExt('Report.PDF')).toBe('pdf')
    expect(fileExt('archive.tar.gz')).toBe('gz')
  })
  it('없으면 빈 문자열', () => {
    expect(fileExt('README')).toBe('')
    expect(fileExt('.bashrc')).toBe('')
  })
})

describe('isBlockedFile', () => {
  it('실행 파일 차단', () => {
    for (const n of ['a.exe', 'a.MSI', 'a.bat', 'a.cmd', 'a.com', 'a.scr', 'a.vbs', 'a.jar', 'a.apk', 'a.dmg', 'a.pkg']) {
      expect(isBlockedFile(n), n).toBe(true)
    }
  })
  it('스크립트 텍스트와 일반 파일은 허용', () => {
    for (const n of ['a.sh', 'a.ps1', 'a.js', 'a.pdf', 'a.png', 'README']) {
      expect(isBlockedFile(n), n).toBe(false)
    }
  })
})

describe('sanitizeFileName', () => {
  it('한글·공백·특수문자를 _ 로', () => {
    expect(sanitizeFileName('회의 자료 (최종).pdf')).toBe('_.pdf')
  })
  it('ASCII 는 유지, 연속 _ 는 하나로', () => {
    expect(sanitizeFileName('my  file__v2.PNG')).toBe('my_file_v2.PNG')
  })
  it('경로 구분자 제거', () => {
    expect(sanitizeFileName('C:\\Users\\me\\a.txt')).toBe('a.txt')
    expect(sanitizeFileName('/tmp/a.txt')).toBe('a.txt')
  })
  it('선행 . 제거, 100자 제한, 빈 결과는 file', () => {
    expect(sanitizeFileName('..hidden')).toBe('hidden')
    expect(sanitizeFileName('x'.repeat(150)).length).toBe(100)
    expect(sanitizeFileName('한글만')).toBe('file')
  })
})

describe('formatSize', () => {
  it('단위 변환', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(10 * 1024 * 1024)).toBe('10.0 MB')
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB')
  })
})

describe('isImageMime', () => {
  it('image/* 만 true', () => {
    expect(isImageMime('image/png')).toBe(true)
    expect(isImageMime('application/pdf')).toBe(false)
    expect(isImageMime(null)).toBe(false)
    expect(isImageMime(undefined)).toBe(false)
  })
})

describe('validateFile', () => {
  it('정상 파일은 null', () => {
    expect(validateFile({ name: 'a.pdf', size: 1024 })).toBeNull()
  })
  it('차단 확장자', () => {
    expect(validateFile({ name: 'setup.exe', size: 10 })).toContain('실행 파일')
  })
  it('50MB 초과', () => {
    expect(validateFile({ name: 'big.zip', size: MAX_FILE_BYTES + 1 })).toContain('50MB')
    expect(validateFile({ name: 'ok.zip', size: MAX_FILE_BYTES })).toBeNull()
  })
  it('빈 파일', () => {
    expect(validateFile({ name: 'empty.txt', size: 0 })).toContain('비어')
  })
})

describe('clipboardFileName', () => {
  const now = new Date(2026, 8, 25, 14, 5, 9) // 2026-09-25 14:05:09 로컬
  it('기본 이름 image.png 는 pasted-타임스탬프로', () => {
    expect(clipboardFileName('image.png', 'image/png', now)).toBe('pasted-20260925-140509.png')
  })
  it('빈 이름도 타임스탬프, 확장자는 MIME 에서', () => {
    expect(clipboardFileName('', 'image/jpeg', now)).toBe('pasted-20260925-140509.jpg')
  })
  it('다른 이름은 그대로', () => {
    expect(clipboardFileName('screenshot.png', 'image/png', now)).toBe('screenshot.png')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/files.test.ts
```

Expected: FAIL — import 해석 실패.

- [ ] **Step 3: 구현**

`src/lib/files.ts`:
```ts
export const MAX_FILE_BYTES = 50 * 1024 * 1024

const BLOCKED_EXT = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar', 'apk', 'dmg', 'pkg'])

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
}

export function fileExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
}

export function isBlockedFile(name: string): boolean {
  return BLOCKED_EXT.has(fileExt(name))
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
  const trimmed = cleaned.slice(0, 100)
  return /[A-Za-z0-9]/.test(trimmed) ? trimmed : 'file'
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${v.toFixed(1)} ${units[u]}`
}

export function isImageMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.startsWith('image/')
}

export function validateFile(file: { name: string; size: number }): string | null {
  if (isBlockedFile(file.name)) return `실행 파일은 넣을 수 없어요: ${file.name}`
  if (file.size <= 0) return `파일이 비어 있어요: ${file.name}`
  if (file.size > MAX_FILE_BYTES) return `50MB 를 넘는 파일이에요: ${file.name} (${formatSize(file.size)})`
  return null
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function clipboardFileName(original: string, mime: string, now: Date): string {
  const generic = original === '' || /^image\.[a-z0-9]+$/i.test(original)
  if (!generic) return original
  const ext = fileExt(original) || MIME_EXT[mime] || 'bin'
  const stamp =
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  return `pasted-${stamp}.${ext}`
}
```

- [ ] **Step 4: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/files.test.ts
```

Expected: 모든 테스트 passed. `sanitizeFileName('회의 자료 (최종).pdf')` 는 NFKD 후 한글이 전부 `_` 로 합쳐져 `_.pdf` 가 된다.

- [ ] **Step 5: 커밋**

```bash
cd "/d/EC LAB/ender" && git add src/lib/files.ts src/lib/files.test.ts && git commit -m "feat: add file naming and validation rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 만료 계산 `expiry.ts`

**Files:**
- Create: `src/lib/expiry.ts`, `src/lib/expiry.test.ts`

**Interfaces:**
- Produces:
  - `type ExpiryPreset = '1h' | '1d' | '7d' | 'never'`
  - `EXPIRY_PRESETS: ReadonlyArray<{ value: ExpiryPreset; label: string }>` — 라벨 `1시간`, `1일`, `7일`, `영구`
  - `DEFAULT_EXPIRY: ExpiryPreset = '7d'`
  - `isExpiryPreset(v: unknown): v is ExpiryPreset`
  - `computeExpiresAt(preset: ExpiryPreset, now?: Date): string | null` — ISO 문자열 또는 null
  - `describeRemaining(expiresAt: string | null, now?: Date): string | null` — `'영구'` 는 null, `'3일 남음'`, `'2시간 남음'`, `'5분 남음'`, `'만료됨'`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/expiry.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPIRY, EXPIRY_PRESETS, computeExpiresAt, describeRemaining, isExpiryPreset } from './expiry'

const now = new Date('2026-09-25T05:00:00.000Z')

describe('computeExpiresAt', () => {
  it('never 는 null', () => {
    expect(computeExpiresAt('never', now)).toBeNull()
  })
  it('1h / 1d / 7d', () => {
    expect(computeExpiresAt('1h', now)).toBe('2026-09-25T06:00:00.000Z')
    expect(computeExpiresAt('1d', now)).toBe('2026-09-26T05:00:00.000Z')
    expect(computeExpiresAt('7d', now)).toBe('2026-10-02T05:00:00.000Z')
  })
})

describe('presets', () => {
  it('기본값은 7d 이고 프리셋 목록에 있다', () => {
    expect(DEFAULT_EXPIRY).toBe('7d')
    expect(EXPIRY_PRESETS.map((p) => p.value)).toEqual(['1h', '1d', '7d', 'never'])
  })
  it('isExpiryPreset', () => {
    expect(isExpiryPreset('1h')).toBe(true)
    expect(isExpiryPreset('never')).toBe(true)
    expect(isExpiryPreset('2h')).toBe(false)
    expect(isExpiryPreset(null)).toBe(false)
  })
})

describe('describeRemaining', () => {
  it('null 이면 null', () => {
    expect(describeRemaining(null, now)).toBeNull()
  })
  it('일·시간·분 단위', () => {
    expect(describeRemaining('2026-09-28T05:00:00.000Z', now)).toBe('3일 남음')
    expect(describeRemaining('2026-09-25T07:30:00.000Z', now)).toBe('2시간 남음')
    expect(describeRemaining('2026-09-25T05:05:00.000Z', now)).toBe('5분 남음')
  })
  it('1분 미만은 곧 만료, 지났으면 만료됨', () => {
    expect(describeRemaining('2026-09-25T05:00:30.000Z', now)).toBe('곧 만료')
    expect(describeRemaining('2026-09-25T04:00:00.000Z', now)).toBe('만료됨')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/expiry.test.ts
```

Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/expiry.ts`:
```ts
export type ExpiryPreset = '1h' | '1d' | '7d' | 'never'

export const EXPIRY_PRESETS: ReadonlyArray<{ value: ExpiryPreset; label: string }> = [
  { value: '1h', label: '1시간' },
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: 'never', label: '영구' },
]

export const DEFAULT_EXPIRY: ExpiryPreset = '7d'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const PRESET_MS: Record<Exclude<ExpiryPreset, 'never'>, number> = {
  '1h': HOUR,
  '1d': DAY,
  '7d': 7 * DAY,
}

export function isExpiryPreset(v: unknown): v is ExpiryPreset {
  return v === '1h' || v === '1d' || v === '7d' || v === 'never'
}

export function computeExpiresAt(preset: ExpiryPreset, now: Date = new Date()): string | null {
  if (preset === 'never') return null
  return new Date(now.getTime() + PRESET_MS[preset]).toISOString()
}

export function describeRemaining(expiresAt: string | null, now: Date = new Date()): string | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - now.getTime()
  if (diff <= 0) return '만료됨'
  if (diff >= DAY) return `${Math.floor(diff / DAY)}일 남음`
  if (diff >= HOUR) return `${Math.floor(diff / HOUR)}시간 남음`
  const min = Math.floor(diff / 60000)
  return min >= 1 ? `${min}분 남음` : '곧 만료'
}
```

- [ ] **Step 4: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/expiry.test.ts
```

Expected: passed.

- [ ] **Step 5: 커밋**

```bash
cd "/d/EC LAB/ender" && git add src/lib/expiry.ts src/lib/expiry.test.ts && git commit -m "feat: add expiry presets and remaining-time formatting

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 기기 이름 `device.ts`

**Files:**
- Create: `src/lib/device.ts`, `src/lib/device.test.ts`

**Interfaces:**
- Produces:
  - `defaultDeviceName(ua: string): string` — `'iPhone' | 'iPad' | 'Android' | 'Mac' | 'Windows' | 'Linux' | '기기'`
  - `DEVICE_KEY = 'ec.device'`
  - `getDeviceName(storage?: Pick<Storage, 'getItem'>, ua?: string): string` — 저장값 없으면 기본값
  - `setDeviceName(name: string, storage?: Pick<Storage, 'setItem' | 'removeItem'>): void` — 공백만이면 삭제(기본값으로 복귀)
- 브라우저 전역(`localStorage`, `navigator`)은 인자 기본값으로만 참조해 node 환경 테스트가 가능하게 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/device.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DEVICE_KEY, defaultDeviceName, getDeviceName, setDeviceName } from './device'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
}

function memStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  }
}

describe('defaultDeviceName', () => {
  it('UA 별 기본 이름', () => {
    expect(defaultDeviceName(UA.iphone)).toBe('iPhone')
    expect(defaultDeviceName(UA.ipad)).toBe('iPad')
    expect(defaultDeviceName(UA.android)).toBe('Android')
    expect(defaultDeviceName(UA.mac)).toBe('Mac')
    expect(defaultDeviceName(UA.win)).toBe('Windows')
    expect(defaultDeviceName(UA.linux)).toBe('Linux')
    expect(defaultDeviceName('')).toBe('기기')
  })
})

describe('get/setDeviceName', () => {
  it('저장값이 없으면 UA 기본값', () => {
    expect(getDeviceName(memStorage(), UA.mac)).toBe('Mac')
  })
  it('저장값이 있으면 그것', () => {
    expect(getDeviceName(memStorage({ [DEVICE_KEY]: '맥미니' }), UA.mac)).toBe('맥미니')
  })
  it('set 은 trim 해서 저장, 공백만이면 삭제', () => {
    const s = memStorage()
    setDeviceName('  연구실 PC ', s)
    expect(s.dump()).toEqual({ [DEVICE_KEY]: '연구실 PC' })
    setDeviceName('   ', s)
    expect(s.dump()).toEqual({})
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/device.test.ts
```

Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/device.ts`:
```ts
export const DEVICE_KEY = 'ec.device'

export function defaultDeviceName(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux|X11/.test(ua)) return 'Linux'
  return '기기'
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function getDeviceName(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  const saved = storage?.getItem(DEVICE_KEY)
  return saved && saved.trim() ? saved : defaultDeviceName(ua)
}

export function setDeviceName(
  name: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null = browserStorage(),
): void {
  if (!storage) return
  const t = name.trim()
  if (t) storage.setItem(DEVICE_KEY, t)
  else storage.removeItem(DEVICE_KEY)
}
```

- [ ] **Step 4: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/device.test.ts
```

Expected: passed.

- [ ] **Step 5: 커밋**

```bash
cd "/d/EC LAB/ender" && git add src/lib/device.ts src/lib/device.test.ts && git commit -m "feat: add device name detection and storage

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 6: Supabase 스키마 마이그레이션과 클라이언트

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/migrations/0002_storage.sql`, `src/lib/supabase.ts`, `src/lib/errors.ts`, `.env`

**Interfaces:**
- Produces:
  - DB 테이블 `public.items`, `public.share_tokens` (컬럼은 스펙 §4 그대로), RLS 정책, Realtime publication, Storage 버킷 `chest` + 정책
  - `supabase: SupabaseClient` (`src/lib/supabase.ts`)
  - `messageOf(e: unknown): string` (`src/lib/errors.ts`) — Error/PostgrestError/문자열을 한국어 fallback 포함 문자열로
- 사용자 개입: Supabase 대시보드 SQL Editor 에 두 SQL 을 순서대로 붙여 실행. (`npx supabase db push` 는 Phase 3 에서 CLI 로그인 후 사용)

- [ ] **Step 1: 0001_init.sql 작성**

`supabase/migrations/0001_init.sql`:
```sql
-- Ender Chest v1: items, share_tokens, RLS, realtime

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('text', 'link', 'file')),
  title       text,
  content     text,
  file_path   text,
  file_name   text,
  file_size   bigint,
  mime_type   text,
  source      text,
  pinned      boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists items_user_created_idx on public.items (user_id, created_at desc);
create index if not exists items_expires_idx on public.items (expires_at) where expires_at is not null;

alter table public.items enable row level security;

create policy "items owner select" on public.items
  for select to authenticated using (auth.uid() = user_id);
create policy "items owner insert" on public.items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "items owner update" on public.items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items owner delete" on public.items
  for delete to authenticated using (auth.uid() = user_id);

-- Realtime: DELETE 이벤트에 user_id 필터를 적용하려면 replica identity full 필요
alter table public.items replica identity full;
alter publication supabase_realtime add table public.items;

create table if not exists public.share_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

alter table public.share_tokens enable row level security;

create policy "share_tokens owner select" on public.share_tokens
  for select to authenticated using (auth.uid() = user_id);
create policy "share_tokens owner insert" on public.share_tokens
  for insert to authenticated with check (auth.uid() = user_id);
create policy "share_tokens owner update" on public.share_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "share_tokens owner delete" on public.share_tokens
  for delete to authenticated using (auth.uid() = user_id);
```

- [ ] **Step 2: 0002_storage.sql 작성**

`supabase/migrations/0002_storage.sql`:
```sql
-- 비공개 버킷 chest, 경로 첫 폴더 = auth.uid()

insert into storage.buckets (id, name, public, file_size_limit)
values ('chest', 'chest', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "chest owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 3: src/lib/supabase.ts 와 src/lib/errors.ts 작성**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 .env 에 없습니다. .env.example 을 참고하세요.')
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

`src/lib/errors.ts`:
```ts
export function messageOf(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return '알 수 없는 오류가 발생했어요'
}
```

- [ ] **Step 4: .env 작성 (커밋 금지)**

사용자가 전달한 값으로 `.env` 를 만든다. 프로젝트 ref 는 `yimqpqnxebkypsjwfbbj`. anon key 는 사용자에게 받아 채운다.

```
VITE_SUPABASE_URL=https://yimqpqnxebkypsjwfbbj.supabase.co
VITE_SUPABASE_ANON_KEY=<사용자가 준 anon key>
```

```bash
cd "/d/EC LAB/ender" && git check-ignore .env && echo "ignored OK"
```

Expected: `.env` 와 `ignored OK` 출력.

- [ ] **Step 5: 사용자에게 SQL 적용 요청**

사용자에게 다음을 안내한다:
1. https://supabase.com/dashboard/project/yimqpqnxebkypsjwfbbj/sql/new 열기
2. `supabase/migrations/0001_init.sql` 전체를 붙여 Run → "Success. No rows returned"
3. 새 쿼리로 `supabase/migrations/0002_storage.sql` 붙여 Run
4. Authentication → Providers → Email → "Confirm email" OFF 권장
5. Authentication → URL Configuration → Site URL `http://localhost:5173`, Redirect URLs 에 `http://localhost:5173/**` 추가

확인: Table Editor 에 `items`, `share_tokens` 가 보이고 Storage 에 `chest` 버킷(Private)이 보인다.

- [ ] **Step 6: 타입체크 후 커밋**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run typecheck && git add supabase/migrations src/lib/supabase.ts src/lib/errors.ts && git status --short && git commit -m "feat: add database schema, RLS policies, storage bucket and supabase client

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

`git status --short` 에 `.env` 가 나타나면 중단하고 `.gitignore` 를 확인한다.

---

### Task 7: 세션 훅과 로그인 화면

**Files:**
- Create: `src/hooks/useSession.ts`, `src/components/AuthScreen.tsx`, `src/components/ChestScreen.tsx` (임시 껍데기), `src/lib/toast.ts`, `src/components/ToastHost.tsx`
- Modify: `src/App.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `supabase`, `messageOf`
- Produces:
  - `useSession(): Session | null | undefined` — `undefined` 는 로딩 중
  - `toast.info(msg: string)`, `toast.error(msg: string)`, `subscribeToasts(fn): () => void` (`src/lib/toast.ts`)
  - `<ToastHost />` 컴포넌트
  - `<AuthScreen />`, `<ChestScreen session={Session} />`

- [ ] **Step 1: 토스트 버스 작성**

`src/lib/toast.ts`:
```ts
export type ToastLevel = 'info' | 'error'
export interface ToastMessage {
  id: number
  level: ToastLevel
  text: string
}

type Listener = (t: ToastMessage) => void
const listeners = new Set<Listener>()
let seq = 0

function emit(level: ToastLevel, text: string): void {
  const t: ToastMessage = { id: ++seq, level, text }
  listeners.forEach((l) => l(t))
  if (level === 'error') console.error('[toast]', text)
}

export const toast = {
  info: (text: string) => emit('info', text),
  error: (text: string) => emit('error', text),
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
```

`src/components/ToastHost.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { subscribeToasts, type ToastMessage } from '../lib/toast'

const TTL_MS = 3500

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev, t])
      window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), TTL_MS)
    })
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.level}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: useSession 작성**

`src/hooks/useSession.ts`:
```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return session
}
```

- [ ] **Step 3: AuthScreen 작성**

`src/components/AuthScreen.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setNotice('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인하세요.')
      }
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function magicLink() {
    if (!email) {
      toast.error('이메일을 먼저 입력하세요')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setNotice('로그인 링크를 메일로 보냈어요. 이 기기에서 링크를 열어주세요.')
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen auth">
      <h1>📦 Ender Chest</h1>
      <p className="dim">어디서 열어도 같은 내용물이 보이는 나만의 상자</p>

      <form onSubmit={submit} className="auth-form">
        <label>
          이메일
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          {mode === 'login' ? '로그인' : '가입하기'}
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={magicLink}>
          비밀번호 없이 메일 링크로 로그인
        </button>
      </form>

      {notice && <p className="notice">{notice}</p>}

      <p className="dim">
        {mode === 'login' ? (
          <>
            계정이 없나요?{' '}
            <button type="button" className="link" onClick={() => setMode('signup')}>
              가입
            </button>
          </>
        ) : (
          <>
            이미 계정이 있나요?{' '}
            <button type="button" className="link" onClick={() => setMode('login')}>
              로그인
            </button>
          </>
        )}
      </p>
    </main>
  )
}
```

- [ ] **Step 4: ChestScreen 임시 껍데기와 App 작성**

`src/components/ChestScreen.tsx` (Task 9에서 교체):
```tsx
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function ChestScreen({ session }: { session: Session }) {
  return (
    <main className="screen">
      <header className="topbar">
        <h1>📦 Ender Chest</h1>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
      </header>
      <p className="dim">{session.user.email} 로 로그인됨. 상자는 비어 있어요.</p>
    </main>
  )
}
```

`src/App.tsx`:
```tsx
import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { ChestScreen } from './components/ChestScreen'
import { ToastHost } from './components/ToastHost'

export function App() {
  const session = useSession()

  return (
    <>
      {session === undefined ? (
        <main className="screen">
          <p className="dim">불러오는 중…</p>
        </main>
      ) : session ? (
        <ChestScreen session={session} />
      ) : (
        <AuthScreen />
      )}
      <ToastHost />
    </>
  )
}
```

- [ ] **Step 5: global.css 에 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.dim { color: var(--text-dim); }
.notice { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; }

.auth { max-width: 380px; padding-top: 12vh; }
.auth h1 { margin-bottom: 4px; }
.auth-form { display: grid; gap: 12px; margin: 24px 0 12px; }
.auth-form label { display: grid; gap: 6px; font-size: 13px; color: var(--text-dim); }

input[type='text'], input[type='email'], input[type='password'], input[type='search'], select, textarea {
  width: 100%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  outline: none;
}
input:focus, select:focus, textarea:focus { border-color: var(--accent); }

button.primary { background: var(--accent); color: var(--accent-text); border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; }
button.ghost { background: transparent; color: var(--text-dim); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; }
button.ghost:hover { background: var(--bg-hover); color: var(--text); }
button.link { background: none; border: 0; padding: 0; color: var(--accent); text-decoration: underline; }
button:disabled { opacity: 0.6; cursor: default; }

.topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.topbar h1 { font-size: 20px; margin: 0; }

.toast-host { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); display: grid; gap: 8px; z-index: 50; pointer-events: none; }
.toast { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
.toast-error { border-color: var(--danger); }
```

- [ ] **Step 6: 로컬 실행으로 수동 검증**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run typecheck && (npm run dev > /tmp/ec-dev.log 2>&1 &) && sleep 4 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```

Expected: `200`. 브라우저에서 http://localhost:5173 열어 확인 (사용자 또는 실행자):
1. 가입 탭에서 이메일·비밀번호(6자 이상) 입력 → "Confirm email" 을 꺼두었다면 즉시 ChestScreen 이 뜬다.
2. 로그아웃 → 로그인 화면으로 돌아온다. 같은 자격으로 로그인 → 다시 ChestScreen.
3. 새로고침해도 세션이 유지된다.
4. 잘못된 비밀번호 → 하단에 빨간 테두리 토스트.

- [ ] **Step 7: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add email/password auth screen, session hook and toast host

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 8: 아이템 타입, 목록 상태 함수, 데이터 계층

**Files:**
- Create: `src/lib/itemsState.ts`, `src/lib/itemsState.test.ts`, `src/lib/items.ts`

**Interfaces:**
- Consumes: `detectKind`, `linkTitle` (Task 2), `sanitizeFileName` (Task 3), `supabase` (Task 6)
- Produces (`src/lib/items.ts`):
  - `type ItemKind = 'text' | 'link' | 'file'`
  - `interface ItemRow { id; user_id; kind; title; content; file_path; file_name; file_size; mime_type; source; pinned; expires_at; created_at }` (스펙 §4 컬럼, null 허용 컬럼은 `| null`)
  - `ITEMS_TABLE = 'items'`, `BUCKET = 'chest'`, `SIGNED_URL_TTL = 3600`
  - `buildTextPayload(input: { text: string; source: string; expiresAt: string | null }): TextPayload` — 순수
  - `buildFilePath(userId: string, fileName: string, uuid: string): string` — 순수
  - `listItems(): Promise<ItemRow[]>`
  - `addTextItem(input: { text; source; expiresAt }): Promise<ItemRow>`
  - `addFileItem(file: File, opts: { userId: string; source: string; expiresAt: string | null }): Promise<ItemRow>`
  - `deleteItem(item: ItemRow): Promise<void>`
  - `setPinned(id: string, pinned: boolean): Promise<void>`
  - `getSignedUrl(path: string): Promise<string>` — 미리보기용
  - `getDownloadUrl(path: string, fileName: string): Promise<string>` — `download` 옵션으로 첨부 다운로드
  - `cleanupExpired(): Promise<number>` — 삭제한 개수
- Produces (`src/lib/itemsState.ts`, 전부 순수):
  - `isExpired(item: Pick<ItemRow,'expires_at'>, now?: Date): boolean`
  - `sortItems(items: ItemRow[]): ItemRow[]` — pinned desc, created_at desc (새 배열)
  - `mergeItem(items: ItemRow[], row: ItemRow, now?: Date): ItemRow[]` — 같은 id 교체 또는 삽입, 만료면 제거, 정렬 유지
  - `withoutItem(items: ItemRow[], id: string): ItemRow[]`
  - `filterItems(items: ItemRow[], query: string): ItemRow[]` — title/content/file_name 대소문자 무시 부분 일치, 빈 쿼리는 원본

- [ ] **Step 1: 실패하는 테스트 작성 (순수 함수만)**

`src/lib/itemsState.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { ItemRow } from './items'
import { buildFilePath, buildTextPayload } from './items'
import { filterItems, isExpired, mergeItem, sortItems, withoutItem } from './itemsState'

function row(over: Partial<ItemRow> & { id: string }): ItemRow {
  return {
    user_id: 'u1',
    kind: 'text',
    title: null,
    content: null,
    file_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    source: null,
    pinned: false,
    expires_at: null,
    created_at: '2026-09-25T00:00:00.000Z',
    ...over,
  }
}

const now = new Date('2026-09-25T12:00:00.000Z')

describe('buildTextPayload', () => {
  it('URL 은 link + 호스트 제목', () => {
    const p = buildTextPayload({ text: ' https://www.youtube.com/watch?v=x ', source: 'Mac', expiresAt: null })
    expect(p).toEqual({
      kind: 'link',
      title: 'youtube.com/watch',
      content: 'https://www.youtube.com/watch?v=x',
      source: 'Mac',
      expires_at: null,
    })
  })
  it('텍스트는 첫 줄 80자를 제목으로', () => {
    const long = 'a'.repeat(100)
    const p = buildTextPayload({ text: `${long}\n둘째 줄`, source: 'PC', expiresAt: '2026-10-02T00:00:00.000Z' })
    expect(p.kind).toBe('text')
    expect(p.title).toBe('a'.repeat(80))
    expect(p.content).toBe(`${long}\n둘째 줄`)
    expect(p.expires_at).toBe('2026-10-02T00:00:00.000Z')
  })
  it('내용이 공백만이면 예외', () => {
    expect(() => buildTextPayload({ text: '   ', source: 'PC', expiresAt: null })).toThrow()
  })
})

describe('buildFilePath', () => {
  it('uid/uuid-정규화이름', () => {
    expect(buildFilePath('u1', '회의 (최종).pdf', 'abc-123')).toBe('u1/abc-123-_.pdf')
  })
})

describe('isExpired', () => {
  it('null 은 만료 아님, 과거는 만료', () => {
    expect(isExpired({ expires_at: null }, now)).toBe(false)
    expect(isExpired({ expires_at: '2026-09-25T11:59:59.000Z' }, now)).toBe(true)
    expect(isExpired({ expires_at: '2026-09-25T12:00:01.000Z' }, now)).toBe(false)
  })
})

describe('sortItems', () => {
  it('고정 먼저, 그 다음 최신순', () => {
    const a = row({ id: 'a', created_at: '2026-09-25T01:00:00Z' })
    const b = row({ id: 'b', created_at: '2026-09-25T03:00:00Z' })
    const c = row({ id: 'c', created_at: '2026-09-25T02:00:00Z', pinned: true })
    expect(sortItems([a, b, c]).map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('mergeItem', () => {
  const a = row({ id: 'a', created_at: '2026-09-25T01:00:00Z' })
  const b = row({ id: 'b', created_at: '2026-09-25T02:00:00Z' })
  it('새 id 는 삽입 후 정렬', () => {
    const c = row({ id: 'c', created_at: '2026-09-25T03:00:00Z' })
    expect(mergeItem([b, a], c, now).map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
  it('같은 id 는 교체', () => {
    const b2 = { ...b, pinned: true }
    const out = mergeItem([b, a], b2, now)
    expect(out.length).toBe(2)
    expect(out[0]).toEqual(b2)
  })
  it('만료된 행은 제거', () => {
    const bExpired = { ...b, expires_at: '2026-09-25T00:00:00Z' }
    expect(mergeItem([b, a], bExpired, now).map((x) => x.id)).toEqual(['a'])
  })
})

describe('withoutItem', () => {
  it('id 제거', () => {
    expect(withoutItem([row({ id: 'a' }), row({ id: 'b' })], 'a').map((x) => x.id)).toEqual(['b'])
  })
})

describe('filterItems', () => {
  const items = [
    row({ id: '1', title: '회의록', content: '9월 정기 회의' }),
    row({ id: '2', kind: 'link', title: 'github.com/foo', content: 'https://github.com/foo' }),
    row({ id: '3', kind: 'file', file_name: 'Report_FINAL.pdf' }),
  ]
  it('빈 쿼리는 원본', () => {
    expect(filterItems(items, '  ')).toBe(items)
  })
  it('제목·본문·파일명 부분 일치, 대소문자 무시', () => {
    expect(filterItems(items, '정기').map((x) => x.id)).toEqual(['1'])
    expect(filterItems(items, 'GITHUB').map((x) => x.id)).toEqual(['2'])
    expect(filterItems(items, 'final').map((x) => x.id)).toEqual(['3'])
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/itemsState.test.ts
```

Expected: FAIL.

- [ ] **Step 3: itemsState.ts 구현**

`src/lib/itemsState.ts`:
```ts
import type { ItemRow } from './items'

export function isExpired(item: Pick<ItemRow, 'expires_at'>, now: Date = new Date()): boolean {
  return item.expires_at !== null && new Date(item.expires_at).getTime() <= now.getTime()
}

export function sortItems(items: ItemRow[]): ItemRow[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.created_at.localeCompare(a.created_at)
  })
}

export function mergeItem(items: ItemRow[], row: ItemRow, now: Date = new Date()): ItemRow[] {
  const rest = items.filter((x) => x.id !== row.id)
  if (isExpired(row, now)) return rest
  return sortItems([...rest, row])
}

export function withoutItem(items: ItemRow[], id: string): ItemRow[] {
  return items.filter((x) => x.id !== id)
}

export function filterItems(items: ItemRow[], query: string): ItemRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((x) =>
    [x.title, x.content, x.file_name].some((f) => typeof f === 'string' && f.toLowerCase().includes(q)),
  )
}
```

- [ ] **Step 4: items.ts 구현**

`src/lib/items.ts`:
```ts
import { supabase } from './supabase'
import { detectKind, linkTitle } from './detect'
import { sanitizeFileName } from './files'

export type ItemKind = 'text' | 'link' | 'file'

export interface ItemRow {
  id: string
  user_id: string
  kind: ItemKind
  title: string | null
  content: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  source: string | null
  pinned: boolean
  expires_at: string | null
  created_at: string
}

export const ITEMS_TABLE = 'items'
export const BUCKET = 'chest'
export const SIGNED_URL_TTL = 3600
const LIST_LIMIT = 500
const TITLE_MAX = 80

export interface TextPayload {
  kind: 'text' | 'link'
  title: string
  content: string
  source: string
  expires_at: string | null
}

export function buildTextPayload(input: { text: string; source: string; expiresAt: string | null }): TextPayload {
  const trimmed = input.text.trim()
  if (!trimmed) throw new Error('넣을 내용이 없어요')
  const kind = detectKind(trimmed)
  const title = kind === 'link' ? linkTitle(trimmed) : (trimmed.split(/\r?\n/)[0] ?? '').slice(0, TITLE_MAX)
  return { kind, title, content: trimmed, source: input.source, expires_at: input.expiresAt }
}

export function buildFilePath(userId: string, fileName: string, uuid: string): string {
  return `${userId}/${uuid}-${sanitizeFileName(fileName)}`
}

function notExpiredFilter() {
  return `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
}

export async function listItems(): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .or(notExpiredFilter())
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)
  if (error) throw error
  return (data ?? []) as ItemRow[]
}

export async function addTextItem(input: { text: string; source: string; expiresAt: string | null }): Promise<ItemRow> {
  const payload = buildTextPayload(input)
  const { data, error } = await supabase.from(ITEMS_TABLE).insert(payload).select('*').single()
  if (error) throw error
  return data as ItemRow
}

export async function addFileItem(
  file: File,
  opts: { userId: string; source: string; expiresAt: string | null },
): Promise<ItemRow> {
  const path = buildFilePath(opts.userId, file.name, crypto.randomUUID())
  const contentType = file.type || 'application/octet-stream'

  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false })
  if (up.error) throw up.error

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .insert({
      kind: 'file',
      title: file.name,
      content: null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: contentType,
      source: opts.source,
      expires_at: opts.expiresAt,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data as ItemRow
}

export async function deleteItem(item: ItemRow): Promise<void> {
  if (item.file_path) {
    const { error } = await supabase.storage.from(BUCKET).remove([item.file_path])
    if (error) throw error
  }
  const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', item.id)
  if (error) throw error
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from(ITEMS_TABLE).update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function getDownloadUrl(path: string, fileName: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL, { download: fileName })
  if (error) throw error
  return data.signedUrl
}

export async function cleanupExpired(): Promise<number> {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('id, file_path')
    .lt('expires_at', new Date().toISOString())
  if (error) throw error
  const rows = (data ?? []) as Array<Pick<ItemRow, 'id' | 'file_path'>>
  if (rows.length === 0) return 0

  const paths = rows.map((r) => r.file_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (paths.length > 0) {
    const rm = await supabase.storage.from(BUCKET).remove(paths)
    if (rm.error) throw rm.error
  }
  const del = await supabase.from(ITEMS_TABLE).delete().in('id', rows.map((r) => r.id))
  if (del.error) throw del.error
  return rows.length
}
```

주의: `items.ts` 는 `supabase.ts` 를 import 하므로 vitest(node)에서 로드하면 `import.meta.env` 가 비어 예외가 난다. 테스트 파일이 `buildTextPayload` 만 쓰더라도 모듈 전체가 평가되기 때문에, `vite.config.ts` 의 `test` 에 환경변수를 넣어 준다:

```ts
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
```

- [ ] **Step 5: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/itemsState.test.ts && npm run typecheck
```

Expected: 모두 passed, 타입 에러 0.

- [ ] **Step 6: 커밋**

```bash
cd "/d/EC LAB/ender" && git add src/lib/items.ts src/lib/itemsState.ts src/lib/itemsState.test.ts vite.config.ts && git commit -m "feat: add items data layer and pure list-state helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: 실시간 목록 — useItems, ItemList, ItemCard, ChestScreen

**Files:**
- Create: `src/hooks/useItems.ts`, `src/components/ItemList.tsx`, `src/components/ItemCard.tsx`
- Modify: `src/components/ChestScreen.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `listItems`, `ItemRow`, `mergeItem`, `withoutItem`, `sortItems`, `supabase`, `describeRemaining`, `formatSize`, `isSafeHttpUrl`
- Produces:
  - `useItems(userId: string): { items: ItemRow[]; loading: boolean; status: 'connecting' | 'live' | 'offline'; reload: () => Promise<void>; removeLocal: (id: string) => void; upsertLocal: (row: ItemRow) => void }`
  - `<ItemList items onAction />`, `<ItemCard item onAction />` 에서 `onAction(kind: ItemAction, item: ItemRow)`; `type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete'` (실제 동작은 Task 11에서 연결, 이 Task 에서는 `console.log`)

- [ ] **Step 1: useItems 작성**

`src/hooks/useItems.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ITEMS_TABLE, listItems, type ItemRow } from '../lib/items'
import { mergeItem, withoutItem } from '../lib/itemsState'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'

export type LiveStatus = 'connecting' | 'live' | 'offline'

export function useItems(userId: string) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const reloading = useRef(false)

  const reload = useCallback(async () => {
    if (reloading.current) return
    reloading.current = true
    try {
      setItems(await listItems())
    } catch (e) {
      toast.error(`목록을 불러오지 못했어요: ${messageOf(e)}`)
    } finally {
      reloading.current = false
      setLoading(false)
    }
  }, [])

  const upsertLocal = useCallback((row: ItemRow) => setItems((prev) => mergeItem(prev, row)), [])
  const removeLocal = useCallback((id: string) => setItems((prev) => withoutItem(prev, id)), [])

  useEffect(() => {
    void reload()

    const onChange = (payload: RealtimePostgresChangesPayload<ItemRow>) => {
      if (payload.eventType === 'DELETE') {
        const old = payload.old as Partial<ItemRow>
        if (old.id) removeLocal(old.id)
        return
      }
      upsertLocal(payload.new as ItemRow)
    }

    const channel = supabase
      .channel(`items:${userId}`)
      .on<ItemRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: ITEMS_TABLE, filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live')
          void reload()
        } else if (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('offline')
        } else {
          setStatus('connecting')
        }
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [userId, reload, upsertLocal, removeLocal])

  return { items, loading, status, reload, removeLocal, upsertLocal }
}
```

- [ ] **Step 2: ItemCard 작성**

`src/components/ItemCard.tsx`:
```tsx
import type { ItemRow } from '../lib/items'
import { formatSize, isImageMime } from '../lib/files'
import { describeRemaining } from '../lib/expiry'
import { isSafeHttpUrl } from '../lib/detect'

export type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete'

interface Props {
  item: ItemRow
  canShare: boolean
  thumbUrl?: string | null
  onAction: (action: ItemAction, item: ItemRow) => void
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${time}`
}

export function ItemCard({ item, canShare, thumbUrl, onAction }: Props) {
  const remaining = describeRemaining(item.expires_at)
  const isImage = item.kind === 'file' && isImageMime(item.mime_type)

  return (
    <article className={`card card-${item.kind}${item.pinned ? ' pinned' : ''}`}>
      <div className="card-body">
        {item.kind === 'text' && <pre className="card-text">{item.content}</pre>}

        {item.kind === 'link' && item.content && isSafeHttpUrl(item.content) && (
          <a className="card-link" href={item.content} target="_blank" rel="noopener noreferrer">
            <span className="card-link-title">{item.title ?? item.content}</span>
            <span className="card-link-url">{item.content}</span>
          </a>
        )}

        {item.kind === 'file' && (
          <div className="card-file">
            {isImage && thumbUrl ? (
              <img className="card-thumb" src={thumbUrl} alt={item.file_name ?? ''} loading="lazy" />
            ) : (
              <span className="card-file-icon" aria-hidden>
                📄
              </span>
            )}
            <div>
              <div className="card-file-name">{item.file_name}</div>
              <div className="dim small">{item.file_size !== null ? formatSize(item.file_size) : ''}</div>
            </div>
          </div>
        )}
      </div>

      <footer className="card-meta">
        <span className="dim small">
          {item.source ? `${item.source} · ` : ''}
          {timeLabel(item.created_at)}
          {remaining ? ` · ${remaining}` : ''}
        </span>
        <span className="card-actions">
          {(item.kind === 'text' || item.kind === 'link') && (
            <button className="icon" title="복사" onClick={() => onAction('copy', item)}>
              복사
            </button>
          )}
          {item.kind === 'link' && (
            <button className="icon" title="열기" onClick={() => onAction('open', item)}>
              열기
            </button>
          )}
          {item.kind === 'file' && (
            <button className="icon" title="다운로드" onClick={() => onAction('download', item)}>
              다운로드
            </button>
          )}
          {canShare && (
            <button className="icon" title="다른 앱으로 공유" onClick={() => onAction('share', item)}>
              공유
            </button>
          )}
          <button className="icon" title={item.pinned ? '고정 해제' : '고정'} onClick={() => onAction('pin', item)}>
            {item.pinned ? '📌' : '고정'}
          </button>
          <button className="icon danger" title="삭제" onClick={() => onAction('delete', item)}>
            삭제
          </button>
        </span>
      </footer>
    </article>
  )
}
```

- [ ] **Step 3: ItemList 작성**

`src/components/ItemList.tsx`:
```tsx
import type { ItemRow } from '../lib/items'
import { ItemCard, type ItemAction } from './ItemCard'

interface Props {
  items: ItemRow[]
  loading: boolean
  canShare: boolean
  thumbUrls: Record<string, string | null>
  onAction: (action: ItemAction, item: ItemRow) => void
}

export function ItemList({ items, loading, canShare, thumbUrls, onAction }: Props) {
  if (loading) return <p className="dim">불러오는 중…</p>
  if (items.length === 0) {
    return (
      <div className="empty">
        <p>상자가 비어 있어요.</p>
        <p className="dim small">위 입력창에 적거나, Ctrl+V 로 붙이거나, 파일을 창에 끌어다 놓으세요.</p>
      </div>
    )
  }
  return (
    <section className="list">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          canShare={canShare}
          thumbUrl={item.file_path ? thumbUrls[item.file_path] : null}
          onAction={onAction}
        />
      ))}
    </section>
  )
}
```

- [ ] **Step 4: ChestScreen 교체**

`src/components/ChestScreen.tsx`:
```tsx
import { useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ItemRow } from '../lib/items'
import { useItems } from '../hooks/useItems'
import { ItemList } from './ItemList'
import type { ItemAction } from './ItemCard'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status } = useItems(userId)

  const onAction = useCallback((action: ItemAction, item: ItemRow) => {
    console.log('action', action, item.id)
  }, [])

  return (
    <main className="screen">
      <header className="topbar">
        <h1>
          📦 Ender Chest <span className={`dot dot-${status}`} title={status} />
        </h1>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
      </header>

      <ItemList items={items} loading={loading} canShare={false} thumbUrls={{}} onAction={onAction} />
    </main>
  )
}
```

- [ ] **Step 5: 카드 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.small { font-size: 12px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; vertical-align: middle; background: var(--text-dim); }
.dot-live { background: var(--ok); }
.dot-offline { background: var(--danger); }

.list { display: grid; gap: 10px; }
.empty { text-align: center; padding: 48px 12px; color: var(--text-dim); }

.card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
.card.pinned { border-color: var(--accent); }
.card-body { overflow-wrap: anywhere; }
.card-text { margin: 0; white-space: pre-wrap; font-family: var(--font); max-height: 240px; overflow: auto; }
.card-link { display: grid; gap: 2px; text-decoration: none; }
.card-link-title { color: var(--text); font-weight: 600; }
.card-link-url { color: var(--text-dim); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-file { display: flex; gap: 12px; align-items: center; }
.card-file-icon { font-size: 28px; }
.card-file-name { font-weight: 600; }
.card-thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; background: var(--bg); }

.card-meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.card-actions { display: flex; gap: 4px; flex-wrap: wrap; }
button.icon { background: transparent; border: 1px solid transparent; border-radius: 8px; padding: 4px 8px; color: var(--text-dim); font-size: 13px; }
button.icon:hover { background: var(--bg-hover); color: var(--text); border-color: var(--border); }
button.icon.danger:hover { color: var(--danger); }
```

- [ ] **Step 6: 수동 검증 — 실시간 반영**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run typecheck
```

브라우저 검증 (dev 서버가 Task 7에서 떠 있지 않으면 `npm run dev` 재실행):
1. 로그인 후 상단 점이 초록(`live`)으로 바뀐다.
2. Supabase 대시보드 Table Editor → items → Insert row: `kind=text`, `content=안녕`, `user_id`는 Authentication → Users 의 내 uid. 저장하면 **앱 새로고침 없이** 카드가 최상단에 뜬다.
3. 대시보드에서 그 행의 `pinned` 를 true 로 → 카드 테두리가 보라색으로 바뀌며 위로 이동.
4. 대시보드에서 행 삭제 → 카드가 사라진다.
5. 탭을 다른 곳으로 옮겼다 돌아오면 목록이 재조회된다(네트워크 탭에서 `items?select=*` 요청 확인).

- [ ] **Step 7: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add realtime items list with item cards

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 10: 넣기 — Composer, Ctrl+V, 드래그&드롭

**Files:**
- Create: `src/hooks/useStoredExpiry.ts`, `src/hooks/usePaste.ts`, `src/hooks/useDropzone.ts`, `src/components/Composer.tsx`, `src/components/DropOverlay.tsx`
- Modify: `src/components/ChestScreen.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `addTextItem`, `addFileItem`, `validateFile`, `clipboardFileName`, `computeExpiresAt`, `EXPIRY_PRESETS`, `DEFAULT_EXPIRY`, `isExpiryPreset`, `getDeviceName`, `toast`, `messageOf`, `upsertLocal` (Task 9)
- Produces:
  - `useStoredExpiry(): [ExpiryPreset, (p: ExpiryPreset) => void]` — localStorage `ec.expiry`
  - `usePaste(onText: (t: string) => void, onFiles: (f: File[]) => void): void`
  - `useDropzone(onFiles: (f: File[]) => void): boolean` — 드래그 중 여부
  - `<Composer expiry onExpiryChange onSubmitText onPickFiles busy />`
  - `<DropOverlay active />`

- [ ] **Step 1: useStoredExpiry 작성**

`src/hooks/useStoredExpiry.ts`:
```ts
import { useCallback, useState } from 'react'
import { DEFAULT_EXPIRY, isExpiryPreset, type ExpiryPreset } from '../lib/expiry'

export const EXPIRY_KEY = 'ec.expiry'

function readStored(): ExpiryPreset {
  try {
    const v = localStorage.getItem(EXPIRY_KEY)
    return isExpiryPreset(v) ? v : DEFAULT_EXPIRY
  } catch {
    return DEFAULT_EXPIRY
  }
}

export function useStoredExpiry(): [ExpiryPreset, (p: ExpiryPreset) => void] {
  const [value, setValue] = useState<ExpiryPreset>(readStored)
  const set = useCallback((p: ExpiryPreset) => {
    setValue(p)
    try {
      localStorage.setItem(EXPIRY_KEY, p)
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [])
  return [value, set]
}
```

- [ ] **Step 2: usePaste 작성**

`src/hooks/usePaste.ts`:
```ts
import { useEffect } from 'react'
import { clipboardFileName } from '../lib/files'

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

export function usePaste(onText: (text: string) => void, onFiles: (files: File[]) => void): void {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const data = e.clipboardData
      if (!data) return

      const files = Array.from(data.files)
      if (files.length > 0) {
        e.preventDefault()
        const now = new Date()
        onFiles(files.map((f) => new File([f], clipboardFileName(f.name, f.type, now), { type: f.type })))
        return
      }

      if (isEditable(e.target)) return

      const text = data.getData('text/plain')
      if (text.trim()) {
        e.preventDefault()
        onText(text)
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [onText, onFiles])
}
```

- [ ] **Step 3: useDropzone 작성**

`src/hooks/useDropzone.ts`:
```ts
import { useEffect, useState } from 'react'

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export function useDropzone(onFiles: (files: File[]) => void): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) onFiles(files)
    }

    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [onFiles])

  return active
}
```

- [ ] **Step 4: Composer 와 DropOverlay 작성**

`src/components/Composer.tsx`:
```tsx
import { useRef, useState, type KeyboardEvent } from 'react'
import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'

interface Props {
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onSubmitText: (text: string) => Promise<void>
  onPickFiles: (files: File[]) => void
  busy: boolean
}

export function Composer({ expiry, onExpiryChange, onSubmitText, onPickFiles, busy }: Props) {
  const [text, setText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function send() {
    const t = text.trim()
    if (!t || busy) return
    await onSubmitText(t)
    setText('')
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="composer">
      <textarea
        rows={2}
        placeholder="텍스트나 링크를 적고 Enter (줄바꿈은 Shift+Enter). 화면 어디서든 Ctrl+V, 파일은 끌어다 놓기."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        disabled={busy}
      />
      <div className="composer-bar">
        <label className="dim small">
          만료{' '}
          <select value={expiry} onChange={(e) => onExpiryChange(e.target.value as ExpiryPreset)}>
            {EXPIRY_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) onPickFiles(files)
          }}
        />
        <button className="ghost" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          파일 선택
        </button>
        <button className="primary" type="button" disabled={busy || !text.trim()} onClick={() => void send()}>
          넣기
        </button>
      </div>
    </div>
  )
}
```

`src/components/DropOverlay.tsx`:
```tsx
export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="drop-overlay" aria-hidden>
      <div className="drop-box">📦 여기에 놓으면 상자에 들어가요</div>
    </div>
  )
}
```

- [ ] **Step 5: ChestScreen 에 넣기 흐름 연결**

`src/components/ChestScreen.tsx` 전체 교체:
```tsx
import { useCallback, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { addFileItem, addTextItem, type ItemRow } from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import type { ItemAction } from './ItemCard'

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status, upsertLocal } = useItems(userId)
  const [expiry, setExpiry] = useStoredExpiry()
  const [busy, setBusy] = useState(false)

  const submitText = useCallback(
    async (text: string) => {
      setBusy(true)
      try {
        const row = await addTextItem({ text, source: getDeviceName(), expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
      } finally {
        setBusy(false)
      }
    },
    [expiry, upsertLocal],
  )

  const submitFiles = useCallback(
    (files: File[]) => {
      void (async () => {
        setBusy(true)
        try {
          for (const file of files) {
            const problem = validateFile(file)
            if (problem) {
              toast.error(problem)
              continue
            }
            try {
              const row = await addFileItem(file, {
                userId,
                source: getDeviceName(),
                expiresAt: computeExpiresAt(expiry),
              })
              upsertLocal(row)
              toast.info(`${file.name} 넣었어요`)
            } catch (e) {
              toast.error(`${file.name} 업로드 실패: ${messageOf(e)}`)
            }
          }
        } finally {
          setBusy(false)
        }
      })()
    },
    [expiry, userId, upsertLocal],
  )

  const pasteText = useCallback((text: string) => void submitText(text), [submitText])
  usePaste(pasteText, submitFiles)
  const dragging = useDropzone(submitFiles)

  const onAction = useCallback((action: ItemAction, item: ItemRow) => {
    console.log('action', action, item.id)
  }, [])

  return (
    <main className="screen">
      <header className="topbar">
        <h1>
          📦 Ender Chest <span className={`dot dot-${status}`} title={status} />
        </h1>
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
      </header>

      <Composer
        expiry={expiry}
        onExpiryChange={setExpiry}
        onSubmitText={submitText}
        onPickFiles={submitFiles}
        busy={busy}
      />

      <ItemList items={items} loading={loading} canShare={false} thumbUrls={{}} onAction={onAction} />
      <DropOverlay active={dragging} />
    </main>
  )
}
```

- [ ] **Step 6: 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.composer { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; margin-bottom: 14px; }
.composer textarea { border: 0; background: transparent; padding: 6px 4px; resize: vertical; min-height: 44px; }
.composer textarea:focus { border: 0; }
.composer-bar { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.composer-bar select { width: auto; padding: 4px 8px; }
.spacer { flex: 1; }

.drop-overlay { position: fixed; inset: 0; background: rgba(15, 17, 21, 0.75); display: grid; place-items: center; z-index: 40; pointer-events: none; }
.drop-box { border: 2px dashed var(--accent); border-radius: 16px; padding: 32px 40px; font-size: 18px; background: var(--bg-elev); }
```

- [ ] **Step 7: 수동 검증**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run check
```

브라우저 (탭 두 개 열어두고):
1. 탭 A 입력창에 `테스트 메모` + Enter → 두 탭 모두에 카드. 출처가 `Windows`(기본 기기 이름) 로 표시.
2. 탭 A 에 `https://github.com/supabase/supabase` + Enter → 링크 카드, 제목 `github.com/supabase`.
3. 다른 앱에서 텍스트 복사 후 탭 B 의 **빈 곳을 클릭**해 포커스를 뺀 뒤 Ctrl+V → 카드 생성. 입력창에 포커스가 있을 때 Ctrl+V 는 입력창에만 붙는다.
4. 스크린샷(Win+Shift+S) 후 Ctrl+V → `pasted-YYYYMMDD-HHmmss.png` 파일 카드 (썸네일은 Task 11).
5. 탐색기에서 PDF 를 창에 드래그 → 오버레이 표시 → 놓으면 파일 카드 + "넣었어요" 토스트.
6. `.exe` 드래그 → "실행 파일은 넣을 수 없어요" 토스트, 카드 없음.
7. 만료를 `1시간` 으로 바꾸고 넣으면 카드 메타에 `59분 남음`. 새로고침해도 선택이 `1시간` 으로 유지.
8. Supabase Storage → chest 버킷에 `<uid>/<uuid>-<name>` 오브젝트가 있다.

- [ ] **Step 8: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add composer, clipboard paste and drag-and-drop ingestion

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: 꺼내기 — 액션, 썸네일, 검색, 설정, 만료 정리

**Files:**
- Create: `src/hooks/useSignedUrl.ts`, `src/components/SearchBar.tsx`, `src/components/SettingsDialog.tsx`
- Modify: `src/components/ChestScreen.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `deleteItem`, `setPinned`, `getSignedUrl`, `getDownloadUrl`, `cleanupExpired`, `filterItems`, `isImageMime`, `getDeviceName`, `setDeviceName`, `removeLocal`, `upsertLocal`, `reload`
- Produces:
  - `useThumbUrls(items: ItemRow[]): Record<string, string | null>` — 이미지 파일마다 서명 URL, 실패 시 1회 재발급
  - `<SearchBar value onChange />`
  - `<SettingsDialog open onClose expiry onExpiryChange onDeviceChange />` (토큰 섹션은 Task 14 에서 추가)
  - ChestScreen 의 `onAction` 이 6개 액션을 실제로 수행

- [ ] **Step 1: useThumbUrls 작성**

`src/hooks/useSignedUrl.ts`:
```ts
import { useEffect, useRef, useState } from 'react'
import { getSignedUrl, type ItemRow } from '../lib/items'
import { isImageMime } from '../lib/files'

const REFRESH_MS = 50 * 60 * 1000 // 서명 URL 은 60분. 50분마다 갱신

export function useThumbUrls(items: ItemRow[]): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const issuedAt = useRef<Record<string, number>>({})

  useEffect(() => {
    const now = Date.now()
    const need = items.filter(
      (it) =>
        it.kind === 'file' &&
        it.file_path &&
        isImageMime(it.mime_type) &&
        (!(it.file_path in urls) || now - (issuedAt.current[it.file_path] ?? 0) > REFRESH_MS),
    )
    if (need.length === 0) return

    let cancelled = false
    void Promise.all(
      need.map(async (it) => {
        const path = it.file_path as string
        try {
          const url = await getSignedUrl(path)
          return [path, url] as const
        } catch {
          return [path, null] as const
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      const t = Date.now()
      setUrls((prev) => {
        const next = { ...prev }
        for (const [p, u] of pairs) {
          next[p] = u
          issuedAt.current[p] = t
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [items, urls])

  return urls
}
```

- [ ] **Step 2: SearchBar 작성**

`src/components/SearchBar.tsx`:
```tsx
import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        ref.current?.focus()
      } else if (e.key === 'Escape' && el === ref.current) {
        onChange('')
        ref.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange])

  return (
    <input
      ref={ref}
      type="search"
      className="search"
      placeholder="검색 ( / )"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
```

- [ ] **Step 3: SettingsDialog 작성**

`src/components/SettingsDialog.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceName, setDeviceName } from '../lib/device'
import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'

interface Props {
  open: boolean
  onClose: () => void
  email: string
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onDeviceChange: (name: string) => void
}

export function SettingsDialog({ open, onClose, email, expiry, onExpiryChange, onDeviceChange }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [device, setDevice] = useState(getDeviceName())

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function saveDevice() {
    setDeviceName(device)
    const effective = getDeviceName()
    setDevice(effective)
    onDeviceChange(effective)
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <h2>설정</h2>
      <p className="dim small">{email}</p>

      <label className="field">
        이 기기 이름
        <div className="row">
          <input
            type="text"
            value={device}
            placeholder="예: 연구실 PC, 맥미니"
            onChange={(e) => setDevice(e.target.value)}
            onBlur={saveDevice}
            onKeyDown={(e) => e.key === 'Enter' && saveDevice()}
          />
        </div>
        <span className="dim small">아이템에 "어느 기기에서 넣었는지" 로 표시돼요.</span>
      </label>

      <label className="field">
        기본 만료
        <select value={expiry} onChange={(e) => onExpiryChange(e.target.value as ExpiryPreset)}>
          {EXPIRY_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div id="settings-extra" />

      <div className="row end">
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 4: ChestScreen 에 액션·검색·설정·정리 연결**

`src/components/ChestScreen.tsx` 전체 교체:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  addFileItem,
  addTextItem,
  cleanupExpired,
  deleteItem,
  getDownloadUrl,
  getSignedUrl,
  setPinned,
  type ItemRow,
} from '../lib/items'
import { validateFile } from '../lib/files'
import { computeExpiresAt } from '../lib/expiry'
import { getDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { filterItems } from '../lib/itemsState'
import { useItems } from '../hooks/useItems'
import { useStoredExpiry } from '../hooks/useStoredExpiry'
import { usePaste } from '../hooks/usePaste'
import { useDropzone } from '../hooks/useDropzone'
import { useThumbUrls } from '../hooks/useSignedUrl'
import { ItemList } from './ItemList'
import { Composer } from './Composer'
import { DropOverlay } from './DropOverlay'
import { SearchBar } from './SearchBar'
import { SettingsDialog } from './SettingsDialog'
import type { ItemAction } from './ItemCard'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

async function shareItem(item: ItemRow): Promise<void> {
  if (item.kind === 'file' && item.file_path) {
    const url = await getSignedUrl(item.file_path)
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], item.file_name ?? 'file', { type: item.mime_type ?? blob.type })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: item.file_name ?? undefined })
      return
    }
    await navigator.share({ title: item.file_name ?? undefined, url })
    return
  }
  if (item.kind === 'link' && item.content) {
    await navigator.share({ title: item.title ?? undefined, url: item.content })
    return
  }
  await navigator.share({ text: item.content ?? '' })
}

export function ChestScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const { items, loading, status, reload, upsertLocal, removeLocal } = useItems(userId)
  const [expiry, setExpiry] = useStoredExpiry()
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setDeviceTick] = useState(0)
  const thumbUrls = useThumbUrls(items)

  useEffect(() => {
    void cleanupExpired()
      .then((n) => n > 0 && reload())
      .catch((e) => console.warn('cleanupExpired', messageOf(e)))
  }, [reload])

  const visible = useMemo(() => filterItems(items, query), [items, query])

  const submitText = useCallback(
    async (text: string) => {
      setBusy(true)
      try {
        const row = await addTextItem({ text, source: getDeviceName(), expiresAt: computeExpiresAt(expiry) })
        upsertLocal(row)
      } catch (e) {
        toast.error(`넣지 못했어요: ${messageOf(e)}`)
      } finally {
        setBusy(false)
      }
    },
    [expiry, upsertLocal],
  )

  const submitFiles = useCallback(
    (files: File[]) => {
      void (async () => {
        setBusy(true)
        try {
          for (const file of files) {
            const problem = validateFile(file)
            if (problem) {
              toast.error(problem)
              continue
            }
            try {
              const row = await addFileItem(file, {
                userId,
                source: getDeviceName(),
                expiresAt: computeExpiresAt(expiry),
              })
              upsertLocal(row)
              toast.info(`${file.name} 넣었어요`)
            } catch (e) {
              toast.error(`${file.name} 업로드 실패: ${messageOf(e)}`)
            }
          }
        } finally {
          setBusy(false)
        }
      })()
    },
    [expiry, userId, upsertLocal],
  )

  const pasteText = useCallback((text: string) => void submitText(text), [submitText])
  usePaste(pasteText, submitFiles)
  const dragging = useDropzone(submitFiles)

  const onAction = useCallback(
    (action: ItemAction, item: ItemRow) => {
      void (async () => {
        try {
          switch (action) {
            case 'copy':
              await navigator.clipboard.writeText(item.content ?? '')
              toast.info('복사했어요')
              break
            case 'open':
              if (item.content) window.open(item.content, '_blank', 'noopener,noreferrer')
              break
            case 'download': {
              if (!item.file_path) return
              const url = await getDownloadUrl(item.file_path, item.file_name ?? 'file')
              const a = document.createElement('a')
              a.href = url
              a.download = item.file_name ?? 'file'
              a.rel = 'noopener'
              document.body.appendChild(a)
              a.click()
              a.remove()
              break
            }
            case 'share':
              await shareItem(item)
              break
            case 'pin':
              upsertLocal({ ...item, pinned: !item.pinned })
              await setPinned(item.id, !item.pinned)
              break
            case 'delete':
              if (!window.confirm('이 아이템을 삭제할까요?')) return
              removeLocal(item.id)
              await deleteItem(item)
              break
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          toast.error(messageOf(e))
          void reload()
        }
      })()
    },
    [upsertLocal, removeLocal, reload],
  )

  return (
    <main className="screen">
      <header className="topbar">
        <h1>
          📦 Ender Chest <span className={`dot dot-${status}`} title={status} />
        </h1>
        <div className="row">
          <SearchBar value={query} onChange={setQuery} />
          <button className="ghost" title="설정" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </header>

      <Composer
        expiry={expiry}
        onExpiryChange={setExpiry}
        onSubmitText={submitText}
        onPickFiles={submitFiles}
        busy={busy}
      />

      {query && visible.length === 0 && !loading ? (
        <p className="dim">"{query}" 에 맞는 아이템이 없어요.</p>
      ) : (
        <ItemList items={visible} loading={loading} canShare={canShare} thumbUrls={thumbUrls} onAction={onAction} />
      )}

      <DropOverlay active={dragging} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={session.user.email ?? ''}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onDeviceChange={() => setDeviceTick((t) => t + 1)}
      />
    </main>
  )
}
```

- [ ] **Step 5: 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.row { display: flex; gap: 8px; align-items: center; }
.row.end { justify-content: flex-end; margin-top: 16px; }
.search { width: 200px; padding: 8px 10px; }
@media (max-width: 480px) { .search { width: 130px; } }

.dialog { background: var(--bg-elev); color: var(--text); border: 1px solid var(--border); border-radius: 16px; padding: 20px; width: min(440px, calc(100vw - 32px)); }
.dialog::backdrop { background: rgba(0, 0, 0, 0.55); }
.dialog h2 { margin: 0 0 4px; font-size: 18px; }
.field { display: grid; gap: 6px; margin-top: 16px; font-size: 13px; color: var(--text-dim); }
.field input, .field select { color: var(--text); }
```

- [ ] **Step 6: 수동 검증**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run check
```

브라우저:
1. 텍스트 카드 `복사` → 다른 곳에 Ctrl+V 하면 내용이 붙는다. 토스트 "복사했어요".
2. 링크 카드 `열기` → 새 탭.
3. 이미지 카드에 썸네일이 보인다. PDF 카드 `다운로드` → 원본 파일명으로 저장된다.
4. `고정` → 즉시 위로 올라가고 다른 탭에도 반영. 다시 누르면 해제.
5. `삭제` → confirm → 카드 제거, Storage 오브젝트도 사라짐(대시보드 확인).
6. `/` 키 → 검색창 포커스. `github` 입력 → 링크 카드만 남음. Esc → 초기화.
7. ⚙ → 기기 이름을 `연구실 PC` 로 → 이후 넣은 카드 출처가 `연구실 PC`. 기본 만료 변경이 Composer 의 선택과 동기화.
8. 만료 검증: 대시보드에서 한 행의 `expires_at` 을 과거로 수정 → 새로고침하면 그 카드가 사라지고 Storage 오브젝트(파일이었다면)도 삭제.

- [ ] **Step 7: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add item actions, thumbnails, search, settings and expiry cleanup

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 12: PWA — manifest, 아이콘, 설치

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `public/icons/*.png` (스크립트 산출)
- Modify: `vite.config.ts`, `package.json` (devDependency 추가), `src/main.tsx`

**Interfaces:**
- Produces: 데스크톱 Chrome/Edge 에서 "앱 설치", iPhone Safari 에서 "홈 화면에 추가" 가 아이콘·이름과 함께 동작. 빌드 산출물에 `manifest.webmanifest`, `sw.js` 포함.

- [ ] **Step 1: 원본 SVG 아이콘 작성**

`public/icon.svg` (엔더 상자: 어두운 보라 배경 + 상자 실루엣 + 청록 눈):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1b1230"/>
  <rect x="96" y="176" width="320" height="224" rx="24" fill="#2d1f4d" stroke="#6b4fd6" stroke-width="12"/>
  <rect x="96" y="176" width="320" height="72" rx="24" fill="#3a2a63" stroke="#6b4fd6" stroke-width="12"/>
  <rect x="232" y="228" width="48" height="56" rx="10" fill="#0f1115" stroke="#6b4fd6" stroke-width="8"/>
  <circle cx="256" cy="256" r="10" fill="#3ddc97"/>
  <rect x="120" y="128" width="272" height="36" rx="12" fill="#6b4fd6" opacity="0.6"/>
</svg>
```

- [ ] **Step 2: 아이콘 생성 스크립트와 의존성**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm install -D @resvg/resvg-js@^2.6.2
```

`scripts/make-icons.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of targets) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), png)
  console.log('wrote', name, size)
}
```

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run icons && ls -la public/icons
```

Expected: 4개 PNG 생성. (maskable 은 SVG 배경이 전면을 채우므로 같은 렌더를 그대로 쓴다.)

- [ ] **Step 3: vite.config.ts 에 VitePWA 추가**

`vite.config.ts` 전체:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ender Chest',
        short_name: 'Ender',
        description: '어디서 열어도 같은 내용물이 보이는 나만의 상자',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
```

- [ ] **Step 4: 서비스워커 등록**

`src/main.tsx` 상단 import 뒤에 추가:
```tsx
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
```

- [ ] **Step 5: 빌드 검증**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run check && ls dist | grep -E "manifest|sw.js|workbox" && (npm run preview -- --port 4173 > /tmp/ec-preview.log 2>&1 &) && sleep 3 && curl -s http://localhost:4173/manifest.webmanifest | head -c 300
```

Expected: `dist/manifest.webmanifest`, `dist/sw.js`, `dist/workbox-*.js` 존재. manifest JSON 에 `"name":"Ender Chest"`.

브라우저 http://localhost:4173 → 주소창 우측 "설치" 아이콘이 뜬다. 설치하면 독립 창으로 열린다. DevTools → Application → Manifest 에 경고 0.

- [ ] **Step 6: 커밋**

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add PWA manifest, icons and service worker

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: 배포 — GitHub, Vercel, Auth URL, README 셋업 절

**Files:**
- Create: `README.md`, `vercel.json`
- 사용자 개입: GitHub 저장소(이미 있으면 주소 전달), Vercel 가입(GitHub 로그인), 환경변수 입력

**Interfaces:**
- Produces: `https://<project>.vercel.app` 에서 앱 동작. 맥미니·아이폰에서 로그인 가능. README 로 제3자가 셋업 가능.

- [ ] **Step 1: vercel.json 작성 (SPA 폴백 + 보안 헤더)**

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/((?!assets/|icons/|manifest.webmanifest|sw.js|workbox-).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

- [ ] **Step 2: README.md 작성 (셋업 절. 단축어 절은 Task 16 에서 추가)**

`README.md`:
```markdown
# 📦 Ender Chest

어디서 열어도 같은 내용물이 보이는 나만의 상자. 폰에서 넣으면 PC 에서 바로 꺼내고, PC 에서 넣으면 폰에서 바로 꺼낸다.
메신저 "나에게 보내기" 의 대체재. PWA + Supabase, 운영 비용 0원.

- 텍스트 · 링크 · 파일(≤50MB) 저장, 모든 기기 실시간 반영
- PC: 입력창, **Ctrl+V**(텍스트·이미지), **드래그&드롭**, 파일 선택
- 아이폰: 공유 시트 → 단축어 → 상자 (아래 "iOS 단축어")
- 복사 · 다운로드 · 다른 앱으로 공유 · 고정 · 검색(`/`) · 만료(1h/1d/7d/영구)
- 데이터는 내 Supabase 프로젝트에만. RLS 로 본인 데이터만 접근.

기획서: `docs/PLAN.md` · 구현 스펙: `docs/superpowers/specs/`

## 셋업 (30분)

### 1. Supabase

1. https://supabase.com 에서 프로젝트 생성 (Region: Seoul 권장).
2. SQL Editor 에서 `supabase/migrations/0001_init.sql`, `0002_storage.sql` 을 순서대로 실행.
3. Authentication → Providers → Email: 개인용이면 **Confirm email OFF** 권장.
4. Authentication → URL Configuration:
   - Site URL: 배포 주소 (예: `https://enderchest.vercel.app`)
   - Redirect URLs: `http://localhost:5173/**`, `https://enderchest.vercel.app/**`
5. Project Settings → API 에서 **Project URL** 과 **anon public key** 를 복사.

### 2. 로컬 실행

```bash
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 채우기
npm install
npm run dev            # http://localhost:5173
```

`npm run check` = 타입체크 + 단위 테스트 + 빌드.

### 3. Vercel 배포

1. GitHub 에 push.
2. https://vercel.com → GitHub 로 로그인 → Add New Project → 이 저장소 Import.
3. Framework Preset: Vite (자동 감지). Environment Variables 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가.
4. Deploy → `https://<프로젝트>.vercel.app`. 이 주소를 Supabase URL Configuration 에 등록(위 1-4).

### 4. 기기 등록

- PC/맥: 브라우저 주소창의 "설치" 아이콘 → 독립 창 앱으로.
- 아이폰: Safari → 공유 → "홈 화면에 추가".
- ⚙ 설정에서 기기 이름을 정하면 카드에 출처로 표시된다.

## 구조

```
src/lib        순수 로직 + Supabase 데이터 계층 (vitest)
src/hooks      세션 · 실시간 목록 · 붙여넣기 · 드롭존 · 서명 URL
src/components 화면
supabase/migrations   스키마 · RLS · Storage 정책
supabase/functions/share  아이폰 단축어용 Edge Function
```

## 보안 메모

- 모든 테이블 RLS `auth.uid() = user_id`. Storage 는 경로 첫 폴더 = uid.
- 파일은 비공개 버킷 + 1시간 서명 URL.
- 단축어 토큰은 SHA-256 해시만 저장. 생성 직후 1회만 표시.
- `service_role` 키는 Edge Function 런타임 환경변수에만 존재한다. 저장소에 넣지 말 것.
```

- [ ] **Step 3: 저장소 상태 점검 후 커밋**

```bash
cd "/d/EC LAB/ender" && git check-ignore .env && ! grep -rn "service_role" src supabase/migrations && git add -A && git status --short && git commit -m "docs: add README setup guide and vercel config

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: `.env` 무시 확인, `service_role` grep 결과 없음(`!` 로 반전되어 성공), 커밋 완료.

- [ ] **Step 4: GitHub 원격 연결과 push**

사용자가 만든 저장소 주소를 받는다 (예: `https://github.com/<user>/enderchest.git`). 없으면 https://github.com/new 에서 **Private** 저장소 `enderchest` 생성(README 추가 안 함)을 요청한다.

```bash
cd "/d/EC LAB/ender" && git remote add origin <저장소 주소> && git push -u origin main
```

인증 프롬프트가 뜨면 사용자에게 `! git push -u origin main` 을 터미널에서 직접 실행하도록 안내한다.

- [ ] **Step 5: Vercel 배포 (사용자)**

사용자에게 안내:
1. https://vercel.com/signup → Continue with GitHub.
2. Add New → Project → `enderchest` Import.
3. Environment Variables: `VITE_SUPABASE_URL` = `https://yimqpqnxebkypsjwfbbj.supabase.co`, `VITE_SUPABASE_ANON_KEY` = anon key.
4. Deploy. 완료되면 주소(`https://xxx.vercel.app`)를 알려달라고 요청.
5. Supabase → Authentication → URL Configuration → Site URL 을 그 주소로, Redirect URLs 에 `https://xxx.vercel.app/**` 추가.

- [ ] **Step 6: 배포 검증**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<배포주소>/ && curl -s https://<배포주소>/manifest.webmanifest | head -c 120
```

Expected: `200`, manifest JSON.

사용자 검증: 맥미니 브라우저에서 배포 주소 접속 → 로그인 → 텍스트 넣기 → **Windows PC 화면에 1초 안에 카드 등장**. 아이폰 Safari 에서도 로그인·조회·복사가 된다.

---
### Task 14: 개인 토큰 — tokens.ts 와 설정 UI

**Files:**
- Create: `src/lib/tokens.ts`, `src/lib/tokens.test.ts`, `src/components/TokenSection.tsx`
- Modify: `src/components/SettingsDialog.tsx`

**Interfaces:**
- Consumes: `supabase`, `toast`, `messageOf`
- Produces (`src/lib/tokens.ts`):
  - `TOKENS_TABLE = 'share_tokens'`, `TOKEN_PREFIX = 'ec_'`
  - `interface ShareTokenRow { id: string; label: string | null; created_at: string; last_used_at: string | null }`
  - `base64url(bytes: Uint8Array): string` — 패딩 없음
  - `hex(buf: ArrayBuffer): string`
  - `sha256Hex(text: string): Promise<string>` — WebCrypto
  - `generateToken(random?: (n: number) => Uint8Array): string` — `ec_` + base64url(32B)
  - `createShareToken(label: string): Promise<{ token: string; row: ShareTokenRow }>`
  - `listShareTokens(): Promise<ShareTokenRow[]>`
  - `revokeShareToken(id: string): Promise<void>`
  - `<TokenSection />` — 설정 다이얼로그 안에서 토큰 목록·생성·폐기

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tokens.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { TOKEN_PREFIX, base64url, generateToken, hex, sha256Hex } from './tokens'

describe('base64url', () => {
  it('RFC 4648 §5, 패딩 없음', () => {
    expect(base64url(new Uint8Array([]))).toBe('')
    expect(base64url(new Uint8Array([0xfb, 0xff]))).toBe('-_8')
    expect(base64url(new Uint8Array([104, 101, 108, 108, 111]))).toBe('aGVsbG8')
  })
})

describe('hex', () => {
  it('소문자 2자리', () => {
    expect(hex(new Uint8Array([0, 1, 255]).buffer)).toBe('0001ff')
  })
})

describe('sha256Hex', () => {
  it('알려진 해시', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('generateToken', () => {
  it('ec_ 접두 + 32바이트 base64url (43자)', () => {
    const t = generateToken((n) => new Uint8Array(n).fill(7))
    expect(t.startsWith(TOKEN_PREFIX)).toBe(true)
    expect(t.length).toBe(TOKEN_PREFIX.length + 43)
    expect(t).toMatch(/^ec_[A-Za-z0-9_-]+$/)
  })
  it('기본 난수는 매번 다르다', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/tokens.test.ts
```

Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/tokens.ts`:
```ts
import { supabase } from './supabase'

export const TOKENS_TABLE = 'share_tokens'
export const TOKEN_PREFIX = 'ec_'
const TOKEN_BYTES = 32

export interface ShareTokenRow {
  id: string
  label: string | null
  created_at: string
  last_used_at: string | null
}

export function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return hex(digest)
}

export function generateToken(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return TOKEN_PREFIX + base64url(random(TOKEN_BYTES))
}

export async function createShareToken(label: string): Promise<{ token: string; row: ShareTokenRow }> {
  const token = generateToken()
  const token_hash = await sha256Hex(token)
  const { data, error } = await supabase
    .from(TOKENS_TABLE)
    .insert({ token_hash, label: label.trim() || null })
    .select('id, label, created_at, last_used_at')
    .single()
  if (error) throw error
  return { token, row: data as ShareTokenRow }
}

export async function listShareTokens(): Promise<ShareTokenRow[]> {
  const { data, error } = await supabase
    .from(TOKENS_TABLE)
    .select('id, label, created_at, last_used_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShareTokenRow[]
}

export async function revokeShareToken(id: string): Promise<void> {
  const { error } = await supabase.from(TOKENS_TABLE).delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: 통과 확인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx vitest run src/lib/tokens.test.ts
```

Expected: passed. (Node 22 는 `btoa`, `crypto.subtle` 전역 제공.)

- [ ] **Step 5: TokenSection 작성**

`src/components/TokenSection.tsx`:
```tsx
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
```

- [ ] **Step 6: SettingsDialog 에 삽입 + 스타일**

`src/components/SettingsDialog.tsx` 에서 `<div id="settings-extra" />` 를 `<TokenSection />` 로 바꾸고 상단에 `import { TokenSection } from './TokenSection'` 추가.

`src/styles/global.css` 끝에 추가:
```css
code { font-family: var(--mono); font-size: 12px; background: var(--bg); padding: 2px 6px; border-radius: 6px; overflow-wrap: anywhere; }
.token-fresh { border: 1px solid var(--ok); border-radius: 10px; padding: 10px; display: grid; gap: 8px; }
.token-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.token-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--text); }
```

- [ ] **Step 7: 검증 후 커밋**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run check
```

브라우저: ⚙ → "새 토큰" → `ec_...` 43자 표시, 복사 동작, 목록에 "미사용" 항목 추가. 대시보드 `share_tokens` 에 `token_hash` 64자 hex 만 저장되고 평문은 없다. "폐기" → 행 삭제.

```bash
cd "/d/EC LAB/ender" && git add -A && git status --short && git commit -m "feat: add personal share tokens with settings UI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Edge Function `share`

**Files:**
- Create: `supabase/functions/share/index.ts`, `supabase/functions/share/rules.ts`, `supabase/functions/share/deno.json`, `supabase/config.toml` (CLI 가 생성)
- Modify: `package.json` (devDependency `supabase`)

**Interfaces:**
- Consumes: DB `share_tokens`, `items`, Storage `chest`. 런타임 env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase 가 자동 주입)
- Produces: `POST https://yimqpqnxebkypsjwfbbj.supabase.co/functions/v1/share` — 스펙 §6 계약. `rules.ts` 는 `src/lib` 의 detect/files/expiry 규칙을 Deno 용으로 복제한 것(주석으로 원본 위치 명시. 규칙을 바꾸면 양쪽 모두 수정).

- [ ] **Step 1: Supabase CLI 설치·초기화·로그인**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm install -D supabase@latest && npx supabase --version && npx supabase init --force
```

Expected: 버전 출력, `supabase/config.toml` 생성. (`init` 이 VS Code 설정 생성 여부를 묻으면 `--with-vscode-settings` 없이 기본값. 프롬프트로 멈추면 `echo n | npx supabase init --force`.)

로그인은 브라우저 인증이 필요하므로 **사용자가 터미널에서 직접** 실행:
```
! npx supabase login
```
그 다음 실행자가:
```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx supabase link --project-ref yimqpqnxebkypsjwfbbj
```
DB 비밀번호를 물으면 사용자에게 받는다(프로젝트 생성 때 저장한 값). 비밀번호 입력 프롬프트가 안 뜨면 `-p <password>` 옵션.

- [ ] **Step 2: rules.ts 작성 (순수 규칙 복제)**

`supabase/functions/share/rules.ts`:
```ts
// src/lib/detect.ts, files.ts, expiry.ts 의 규칙을 Deno 용으로 복제. 바꾸면 양쪽 모두 수정.

export const MAX_FILE_BYTES = 50 * 1024 * 1024
const BLOCKED_EXT = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar', 'apk', 'dmg', 'pkg'])
const SINGLE_URL = /^https?:\/\/\S+$/i
const HOUR = 3600_000
const DAY = 24 * HOUR
const PRESET_MS: Record<string, number> = { '1h': HOUR, '1d': DAY, '7d': 7 * DAY }

export function isSafeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function detectKind(text: string): 'text' | 'link' {
  const t = text.trim()
  if (!t || !SINGLE_URL.test(t)) return 'text'
  return isSafeHttpUrl(t) ? 'link' : 'text'
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

export function fileExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const i = base.lastIndexOf('.')
  return i <= 0 ? '' : base.slice(i + 1).toLowerCase()
}

export function isBlockedFile(name: string): boolean {
  return BLOCKED_EXT.has(fileExt(name))
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
  const trimmed = cleaned.slice(0, 100)
  return /[A-Za-z0-9]/.test(trimmed) ? trimmed : 'file'
}

export function computeExpiresAt(preset: string | null | undefined, now = new Date()): string | null {
  if (!preset || preset === 'never') return null
  const ms = PRESET_MS[preset]
  if (ms === undefined) return new Date(now.getTime() + PRESET_MS['7d']).toISOString()
  return new Date(now.getTime() + ms).toISOString()
}

export function buildTextPayload(text: string): { kind: 'text' | 'link'; title: string; content: string } {
  const trimmed = text.trim()
  const kind = detectKind(trimmed)
  const title = kind === 'link' ? linkTitle(trimmed) : (trimmed.split(/\r?\n/)[0] ?? '').slice(0, 80)
  return { kind, title, content: trimmed }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 3: index.ts 작성**

`supabase/functions/share/deno.json`:
```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  }
}
```

`supabase/functions/share/index.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import {
  MAX_FILE_BYTES,
  buildTextPayload,
  computeExpiresAt,
  isBlockedFile,
  sanitizeFileName,
  sha256Hex,
} from './rules.ts'

const BUCKET = 'chest'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-share-token, x-source',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface Incoming {
  texts: string[]
  title: string | null
  files: File[]
  expiresIn: string | null
}

async function parseBody(req: Request): Promise<Incoming> {
  const ct = req.headers.get('content-type') ?? ''
  const out: Incoming = { texts: [], title: null, files: [], expiresIn: null }

  if (ct.includes('application/json')) {
    const body = (await req.json()) as Record<string, unknown>
    for (const key of ['text', 'url']) {
      const v = body[key]
      if (typeof v === 'string' && v.trim()) out.texts.push(v)
    }
    if (typeof body.title === 'string') out.title = body.title
    if (typeof body.expires_in === 'string') out.expiresIn = body.expires_in
    return out
  }

  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData()
    for (const key of ['text', 'url']) {
      const v = form.get(key)
      if (typeof v === 'string' && v.trim()) out.texts.push(v)
    }
    const title = form.get('title')
    if (typeof title === 'string') out.title = title
    const exp = form.get('expires_in')
    if (typeof exp === 'string') out.expiresIn = exp
    for (const key of ['file', 'files[]', 'files']) {
      for (const v of form.getAll(key)) {
        if (v instanceof File && v.size > 0) out.files.push(v)
      }
    }
    return out
  }

  const raw = (await req.text()).trim()
  if (raw) out.texts.push(raw)
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' })

  const token = req.headers.get('x-share-token')
  if (!token) return json(401, { ok: false, error: 'X-Share-Token 헤더가 없어요' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const tokenHash = await sha256Hex(token)
  const { data: tok, error: tokErr } = await admin
    .from('share_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (tokErr) return json(500, { ok: false, error: tokErr.message })
  if (!tok) return json(401, { ok: false, error: '유효하지 않은 토큰이에요' })

  let incoming: Incoming
  try {
    incoming = await parseBody(req)
  } catch (e) {
    return json(400, { ok: false, error: `본문을 읽을 수 없어요: ${e instanceof Error ? e.message : String(e)}` })
  }
  if (incoming.texts.length === 0 && incoming.files.length === 0) {
    return json(400, { ok: false, error: '넣을 내용이 없어요' })
  }

  for (const f of incoming.files) {
    if (isBlockedFile(f.name)) return json(400, { ok: false, error: `실행 파일은 넣을 수 없어요: ${f.name}` })
    if (f.size > MAX_FILE_BYTES) return json(400, { ok: false, error: `50MB 를 넘는 파일이에요: ${f.name}` })
  }

  const source = req.headers.get('x-source') ?? 'iPhone 단축어'
  const expiresAt = computeExpiresAt(incoming.expiresIn)
  const inserted: string[] = []

  for (const text of incoming.texts) {
    const p = buildTextPayload(text)
    const { data, error } = await admin
      .from('items')
      .insert({
        user_id: tok.user_id,
        kind: p.kind,
        title: incoming.title?.trim() || p.title,
        content: p.content,
        source,
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (error) return json(500, { ok: false, error: error.message, inserted })
    inserted.push(data.id as string)
  }

  for (const f of incoming.files) {
    const path = `${tok.user_id}/${crypto.randomUUID()}-${sanitizeFileName(f.name)}`
    const contentType = f.type || 'application/octet-stream'
    const up = await admin.storage.from(BUCKET).upload(path, f, { contentType, upsert: false })
    if (up.error) return json(500, { ok: false, error: `업로드 실패: ${up.error.message}`, inserted })

    const { data, error } = await admin
      .from('items')
      .insert({
        user_id: tok.user_id,
        kind: 'file',
        title: f.name,
        file_path: path,
        file_name: f.name,
        file_size: f.size,
        mime_type: contentType,
        source,
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (error) {
      await admin.storage.from(BUCKET).remove([path])
      return json(500, { ok: false, error: error.message, inserted })
    }
    inserted.push(data.id as string)
  }

  await admin.from('share_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tok.id)

  return json(200, { ok: true, inserted })
})
```

- [ ] **Step 4: (선택) Deno 로 타입체크**

```powershell
winget install -e --id DenoLand.Deno --accept-source-agreements --accept-package-agreements
```
```bash
export PATH="$HOME/.deno/bin:/c/Users/tempadmin/.deno/bin:$PATH" && cd "/d/EC LAB/ender/supabase/functions/share" && deno check index.ts
```

Expected: 에러 0. Deno 설치를 건너뛰면 Step 5 배포 로그가 타입 오류를 알려준다.

- [ ] **Step 5: 배포**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npx supabase functions deploy share --no-verify-jwt --project-ref yimqpqnxebkypsjwfbbj
```

Expected: `Deployed Functions on project yimqpqnxebkypsjwfbbj: share`. `--no-verify-jwt` 는 Authorization 헤더 대신 X-Share-Token 으로 인증하기 위해 필수.

- [ ] **Step 6: curl 로 계약 검증**

토큰은 Task 14 UI 에서 생성한 값을 사용자에게 받는다 (`ec_...`). 아래 `$TOKEN` 에 넣는다.

```bash
FN=https://yimqpqnxebkypsjwfbbj.supabase.co/functions/v1/share
# 401: 토큰 없음
curl -s -o /dev/null -w "%{http_code}\n" -X POST $FN -H "Content-Type: application/json" -d '{"text":"x"}'
# 401: 잘못된 토큰
curl -s -o /dev/null -w "%{http_code}\n" -X POST $FN -H "X-Share-Token: ec_wrong" -H "Content-Type: application/json" -d '{"text":"x"}'
# 400: 내용 없음
curl -s -X POST $FN -H "X-Share-Token: $TOKEN" -H "Content-Type: application/json" -d '{}'
# 200: 텍스트
curl -s -X POST $FN -H "X-Share-Token: $TOKEN" -H "X-Source: curl" -H "Content-Type: application/json" -d '{"text":"엣지 함수 테스트","expires_in":"1h"}'
# 200: URL → link
curl -s -X POST $FN -H "X-Share-Token: $TOKEN" -H "Content-Type: application/json" -d '{"url":"https://supabase.com/docs"}'
# 200: 파일 (multipart)
echo "hello" > /tmp/hello.txt && curl -s -X POST $FN -H "X-Share-Token: $TOKEN" -F "file=@/tmp/hello.txt"
# 400: 차단 확장자
echo "x" > /tmp/evil.exe && curl -s -X POST $FN -H "X-Share-Token: $TOKEN" -F "file=@/tmp/evil.exe"
```

Expected: `401`, `401`, `{"ok":false,"error":"넣을 내용이 없어요"}`, `{"ok":true,"inserted":["..."]}` ×3, `{"ok":false,"error":"실행 파일은 …"}`. 열려 있는 앱 화면에 `curl` 출처 카드들이 실시간으로 뜬다. 설정의 토큰 목록에 "마지막 사용" 시각이 갱신된다.

- [ ] **Step 7: 커밋**

```bash
cd "/d/EC LAB/ender" && ! grep -rn "service_role" src && git add -A && git status --short && git commit -m "feat: add share edge function for iOS shortcut ingestion

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

`supabase/.temp` 가 스테이징되면 `.gitignore` 확인. `service_role` 문자열은 `supabase/functions/share/index.ts` 의 `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` 에만 존재해야 한다 (`src` 에서는 0건).

---

### Task 16: iOS 단축어 레시피와 마무리

**Files:**
- Modify: `README.md`
- Create: `docs/ADR/001-supabase-and-no-server.md`

**Interfaces:**
- Produces: 아이폰 공유 시트 → 단축어 → 상자에 들어가는 실사용 경로. README 만 보고 제3자가 재현 가능.

- [ ] **Step 1: README 에 단축어 절 추가**

`README.md` 의 "## 구조" 앞에 삽입:
```markdown
## iOS 단축어 (아이폰에서 넣기)

iOS Safari 는 PWA 공유 대상을 지원하지 않아 단축어가 공유 시트 역할을 한다.

### 준비
1. 앱 ⚙ 설정 → "새 토큰" → `ec_...` 복사 (한 번만 표시된다).
2. 함수 주소: `https://<프로젝트 ref>.supabase.co/functions/v1/share`

### 단축어 A: 텍스트·링크 보내기
1. 단축어 앱 → + → 이름 "Ender Chest"
2. **공유 시트에서 받기** 켜기. 받을 유형: 텍스트, URL, Safari 웹 페이지.
3. 동작 추가 **URL의 콘텐츠 가져오기**
   - URL: 위 함수 주소
   - 방법: POST
   - 헤더: `X-Share-Token` = 복사한 토큰, `X-Source` = `iPhone`
   - 요청 본문: JSON
     - `text` = `단축어 입력` (변수)
4. (선택) **알림 표시**: "상자에 넣었어요"
5. 공유 시트에서 사용: Safari 공유 → Ender Chest.

### 단축어 B: 사진·파일 보내기
1. 새 단축어 "Ender Chest 파일". 공유 시트 받을 유형: 이미지, 파일, PDF, 미디어.
2. **URL의 콘텐츠 가져오기**
   - 방법 POST, 헤더 동일
   - 요청 본문: **양식(Form)**
     - 필드 `file`, 유형 **파일**, 값 `단축어 입력`
3. 사진 앱 → 공유 → Ender Chest 파일. 여러 장을 선택하면 각각 업로드된다.

### 확인
PC 화면에 출처 `iPhone` 카드가 1~2초 안에 뜬다. 안 되면: 토큰 오타(공백 포함 여부), 함수 주소의 프로젝트 ref, 단축어의 "공유 시트에서 받기" 유형을 확인.
응답 본문이 `{"ok":false,"error":"..."}` 면 그 메시지가 원인이다. 단축어 마지막에 "결과 보기" 동작을 넣으면 응답을 볼 수 있다.

### 만료 지정
JSON 본문에 `"expires_in": "1h" | "1d" | "7d" | "never"` 를 추가할 수 있다. 없으면 7일.
```

- [ ] **Step 2: ADR 작성**

`docs/ADR/001-supabase-and-no-server.md`:
```markdown
# ADR-001: Supabase 를 백엔드로, 자체 서버 코드는 Edge Function 하나만

날짜: 2026-09-25 · 상태: 채택

## 맥락
개인 실사용 도구. 운영 비용 0, 관리할 서버 0 이 목표. 인증·DB·파일·실시간·서버리스 함수가 모두 필요하다.

## 결정
- Supabase(Auth, Postgres+RLS, Storage, Realtime, Edge Functions) 를 단일 백엔드로 사용한다.
- 권한은 전부 RLS. 프론트가 supabase-js 로 DB/Storage 에 직접 접근한다.
- 자체 서버 코드는 아이폰 단축어용 `share` Edge Function 하나. 그 외 서버 로직(만료 정리 등)은 클라이언트가 수행한다.
- 로그인은 이메일+비밀번호를 기본으로 한다. 기본 SMTP 의 낮은 발송 제한 때문에 매직링크 단독은 부적합.

## 대안
- Firebase: NoSQL, RLS 같은 관계형 권한 모델 없음, 셀프 호스팅 불가.
- PocketBase: 단일 바이너리지만 호스팅할 서버가 필요.
- 직접 FastAPI: 운영 부담.

## 결과
- 서버 코드 최소화. Postgres 스키마와 RLS 정책이 곧 백엔드다.
- Supabase 무료 티어 의존(7일 미접속 시 일시정지). 매일 쓰는 앱이라 수용. 오픈소스라 셀프 호스팅 이관 경로가 있다.
```

- [ ] **Step 3: 최종 점검**

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH" && cd "/d/EC LAB/ender" && npm run check && git check-ignore .env && ! grep -rn "service_role" src && git status --short
```

Expected: check 통과, `.env` 무시, `src` 에 service_role 없음, 작업 트리 깨끗(커밋 전 변경만).

스펙 §1 표의 FR 별 수동 확인:
- FR-01 로그인/가입/로그아웃/매직링크 · FR-02 텍스트 · FR-03 링크 판별 · FR-04 파일 업/다운/삭제 · FR-05 실시간 · FR-07 단축어 · FR-08 토큰 · FR-09 Ctrl+V/드래그/파일 선택 · FR-10 복사/공유 · FR-11 고정/검색 · FR-12 썸네일 · FR-13 출처 · FR-14 만료
- 보안: 두 번째 계정을 만들어 로그인 → 첫 계정 아이템이 0건. 브라우저 콘솔에서 `supabase.from('items').select('*')` 실행 결과가 본인 것만.

- [ ] **Step 4: 커밋과 push, 태그**

```bash
cd "/d/EC LAB/ender" && git add -A && git commit -m "docs: add iOS shortcut recipe and ADR-001

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git tag v0.1.0 && git push origin main --tags
```

Vercel 이 main push 를 감지해 자동 재배포한다. 사용자에게 아이폰 단축어 제작을 안내하고, 2주 실사용을 시작한다.

---

## 실행 순서 요약

| Phase | Tasks | 사용자 개입 |
| :-- | :-- | :-- |
| 0 | 1 → 2 → 3 → 4 → 5 → 6 → 7 | Task 6: anon key 전달, SQL Editor 에 마이그레이션 실행 |
| 1 | 8 → 9 → 10 → 11 → 12 | 없음 (브라우저 수동 검증은 실행자 또는 사용자) |
| 2 | 13 | GitHub 저장소 주소, Vercel 가입·배포, Auth URL 등록 |
| 3 | 14 → 15 → 16 | `npx supabase login`, DB 비밀번호, 단축어 제작 |

Task 2~5 는 서로 독립이라 병렬 가능. Task 8 은 2·3·6 에 의존. Task 14 는 6·11 에 의존. Task 15 는 14 의 토큰이 있어야 curl 검증이 된다.
