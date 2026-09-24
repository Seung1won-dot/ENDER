# Ender Chest v1 — 구현 설계 (실사용 범위)

작성일: 2026-09-25
기준 문서: `docs/PLAN.md` (기획서 v2). 이 문서는 기획서를 **개인 실사용 v1** 범위로 좁히고, 구현에 필요한 결정을 고정한다. 기획서와 충돌하면 이 문서가 우선한다.

## 1. 목표와 범위

**목표**: Windows PC와 맥미니 사이에서 텍스트·링크·파일을 "넣으면 다른 쪽에 바로 뜨는" 개인 상자. 아이폰에서는 단축어로 넣고 PWA로 꺼낸다. 2주 실사용 후 카톡 나에게 보내기를 열지 않게 되면 성공.

**포함 (기획서 FR-01~13 + FR-14 일부)**

| ID | 기능 | 비고 |
| :-- | :-- | :-- |
| FR-01 | 이메일+비밀번호 로그인·회원가입·로그아웃. 매직링크는 보조 버튼 | 기획서는 매직링크 단독. 변경 이유 §3 |
| FR-02 | 텍스트 아이템 추가·조회·삭제 | |
| FR-03 | URL 자동 판별 → 링크 아이템 | `http(s)` 스킴만 |
| FR-04 | 파일 업로드(≤50MB)·다운로드·삭제 | 실행 파일 확장자 차단 |
| FR-05 | 모든 기기 실시간 갱신 (INSERT/UPDATE/DELETE) | Supabase Realtime |
| FR-07 | iOS 단축어 → Edge Function `share` | Phase 3 |
| FR-08 | 개인 토큰 발급·목록·폐기 UI | Phase 3 |
| FR-09 | PC에서 Ctrl+V(텍스트·이미지), 드래그&드롭, 파일 선택 | 핵심 넣기 경로 |
| FR-10 | 복사 / 다른 앱으로 공유(Web Share API) | |
| FR-11 | 고정(pin), 검색(제목·본문·파일명) | 클라이언트 필터 |
| FR-12 | 이미지 썸네일 | 서명 URL |
| FR-13 | 출처 표시 | 기기 이름 (§3) |
| FR-14 | 만료 1h/1d/7d/영구, 기본 7d | 정리는 클라이언트 lazy cleanup (§3) |

**제외 (v1에서 만들지 않음)**

- FR-06 Android 공유 시트(share_target, SW IndexedDB 큐) — Android 기기 없음.
- Playwright E2E, GitHub Actions CI, 성능 측정 로그(client_sent_at), SUS 설문.
- Edge Function rate limit, OG 미리보기, 오프라인 목록 캐시, 여러 상자, 태그, 공개 링크, pg_cron.
- 기획서 6-2의 v2 항목 전부.

## 2. 아키텍처

```
넣기   PC/맥 브라우저: 입력창 · Ctrl+V · 드래그&드롭 · 파일 선택
       아이폰 단축어:  POST /functions/v1/share (X-Share-Token)
                          │
                          ▼
       Supabase   Auth(email+pw, magic link) · Postgres(items, share_tokens; RLS)
                  Storage(bucket "chest", private; <uid>/<uuid>-<name>)
                  Realtime(postgres_changes on items, filter user_id)
                  Edge Function share (Deno, service_role은 런타임 env만)
                          │
                          ▼
꺼내기 PC/맥/아이폰 PWA: 실시간 목록 · 복사 · 다운로드 · Web Share · 고정 · 검색 · 삭제
```

- 프론트는 supabase-js로 DB/Storage에 직접 접근. 권한은 전부 RLS.
- 서버 코드는 Edge Function `share` 하나.
- 배포: GitHub → Vercel(Hobby). Edge Function은 `npx supabase functions deploy`.

## 3. 기획서 대비 결정과 이유

| 결정 | 이유 |
| :-- | :-- |
| 로그인 기본을 이메일+비밀번호로 | Supabase 기본 SMTP는 인증 메일 발송 제한이 매우 낮다. 개발 중 반복 로그인과 기기 3대 로그인에 매직링크만 쓰면 막힌다. 비밀번호는 기기당 1회. 매직링크 버튼은 그대로 두어 원하면 쓸 수 있게 한다. |
| `chests` 테이블 생략, `items` 단일 테이블 | 여러 상자는 v2. 사용자당 상자 하나가 암묵적. 확장 시 nullable `chest_id` 추가 마이그레이션으로 충분. |
| 만료 정리를 클라이언트가 수행 | 매일 여는 개인 도구. 앱 로드 시 본인 만료 아이템의 Storage 오브젝트 → 행을 삭제. 목록 조회는 항상 `expires_at is null or expires_at > now()`. pg_cron + Edge Function 조합은 서버 코드와 Storage 삭제 권한 문제를 늘린다. |
| `source`를 기기 이름으로 | PC↔맥미니 시나리오에서 "맥미니에서 넣음"이 유용. 설정에서 1회 입력, localStorage `ec.device`에 저장. 기본값은 UA 기반("Windows"/"Mac"/"iPhone"). 단축어 경로는 `X-Source` 헤더 또는 "iPhone 단축어". |
| 검색을 클라이언트 필터로 | 최근 500개를 한 번에 불러오고 즉시 필터. 개인 사용에서 충분. tsvector는 v2. |
| PWA는 vite-plugin-pwa | 기획서의 "수동 manifest+sw.js"는 학습 목적이었고 share_target도 빠졌다. 설치 가능 + 앱 셸 프리캐시만 필요하므로 플러그인 10줄로 끝. |
| Edge Function rate limit 생략 | 개인 토큰 1~2개. 토큰 해시 저장·즉시 폐기·`last_used_at`으로 충분. |

## 4. 데이터 모델

### `public.items`

| 컬럼 | 타입 | 제약 |
| :-- | :-- | :-- |
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | not null, FK auth.users(id) on delete cascade, default auth.uid() |
| kind | text | not null, check in ('text','link','file') |
| title | text | null 허용. 링크·파일은 표시용 제목 |
| content | text | text 본문 또는 link URL. file은 null |
| file_path | text | Storage 경로 `<uid>/<uuid>-<safe_name>`. file만 |
| file_name | text | 원본 파일명 |
| file_size | bigint | 바이트 |
| mime_type | text | |
| source | text | 기기 이름 |
| pinned | boolean | not null default false |
| expires_at | timestamptz | null = 영구 |
| created_at | timestamptz | not null default now() |

인덱스: `(user_id, created_at desc)`, `(expires_at) where expires_at is not null`.

### `public.share_tokens`

| 컬럼 | 타입 | 제약 |
| :-- | :-- | :-- |
| id | uuid | PK |
| user_id | uuid | not null, FK auth.users, default auth.uid() |
| token_hash | text | not null, unique. sha256(token) hex |
| label | text | "아이폰 단축어" 등 |
| created_at | timestamptz | default now() |
| last_used_at | timestamptz | |

### RLS

- `items`, `share_tokens`: select/insert/update/delete 모두 `auth.uid() = user_id`. insert는 `with check` 동일.
- `storage.objects` (bucket `chest`): select/insert/update/delete 모두 `bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text`.
- Realtime: `alter publication supabase_realtime add table public.items;` RLS가 구독에도 적용됨.

### Storage

- 버킷 `chest`, public = false, file_size_limit 50MB.
- 다운로드·썸네일은 `createSignedUrl(path, 3600)`. 이미지 `onError` 시 URL 재발급 1회.

## 5. 프론트엔드 구성

스택: Vite + React 18 + TypeScript strict, CSS 변수(다크 기본, `prefers-color-scheme` 존중), vite-plugin-pwa, supabase-js v2, vitest. 상태 관리 라이브러리 없음.

```
src/
  main.tsx              진입, PWA 등록
  App.tsx               세션 분기: AuthScreen | ChestScreen
  lib/
    supabase.ts         createClient(env)
    items.ts            listItems / addText / addFile / deleteItem / togglePin / cleanupExpired
    tokens.ts           createToken / listTokens / revokeToken  (Phase 3)
    detect.ts           detectKind(text) → 'text' | 'link'        [vitest]
    files.ts            sanitizeFileName, isBlockedFile, formatSize, isImage  [vitest]
    expiry.ts           computeExpiresAt(preset, now), EXPIRY_PRESETS      [vitest]
    device.ts           getDeviceName / setDeviceName (localStorage, UA 기본값)
  hooks/
    useSession.ts       supabase.auth.onAuthStateChange
    useItems.ts         초기 로드 + Realtime 구독 + visibilitychange 재조회 + 낙관적 삭제
    usePaste.ts         document paste → 텍스트/이미지 분기
    useDropzone.ts      window dragenter/dragover/drop + 오버레이 상태
  components/
    AuthScreen.tsx      이메일·비밀번호 로그인/가입, 매직링크 버튼
    Composer.tsx        상단 입력창 + 만료 선택 + 파일 선택 버튼
    ItemList.tsx        고정 → 최신순. 검색어 필터
    ItemCard.tsx        kind별 렌더(텍스트/링크/파일/이미지 썸네일) + 액션 버튼
    SearchBar.tsx
    DropOverlay.tsx
    SettingsDialog.tsx  기기 이름, 기본 만료, 로그아웃, 토큰 관리(Phase 3)
    Toast.tsx
  styles/
    global.css          변수, 리셋, 레이아웃
```

### 핵심 동작

- **넣기 판별**: 붙여넣기/입력 텍스트 → `detectKind`. 정확히 하나의 `http(s)://` URL만 있으면 `link`, 아니면 `text`. 클립보드에 파일이 있으면 `file`(이미지는 `pasted-<timestamp>.png`).
- **파일 업로드**: `isBlockedFile` (exe, msi, bat, cmd, com, scr, vbs, jar, apk, dmg, pkg; 스크립트 텍스트 파일 .sh .ps1 .js 는 허용) 및 50MB 초과 시 토스트로 거절. 경로 `<uid>/<uuid>-<sanitized>`. 업로드 성공 후 `items.insert`. 삽입 실패 시 업로드한 오브젝트 삭제(보상).
- **실시간**: 채널 `items:<uid>`, `postgres_changes` filter `user_id=eq.<uid>`. INSERT는 최상단 삽입(중복 id 무시), UPDATE는 교체, DELETE는 제거. `SUBSCRIBED` 이외 상태로 떨어지거나 `visibilitychange`로 복귀하면 전체 재조회.
- **정렬**: pinned desc, created_at desc.
- **만료**: Composer의 만료 선택(1h/1d/7d/영구). 마지막 선택을 localStorage `ec.expiry`에 기억, 기본 7d. 앱 로드 시 `cleanupExpired()`: 본인 만료 행 조회 → Storage remove → 행 delete.
- **복사**: text/link는 `navigator.clipboard.writeText`. 파일은 서명 URL로 다운로드(`<a download>`). `navigator.share` 가능하면 공유 버튼 노출.
- **삭제**: 낙관적으로 목록에서 제거 → file이면 Storage remove → 행 delete. 실패 시 재조회.
- **키보드**: Composer에서 Enter 전송, Shift+Enter 줄바꿈. 그 외 단축키는 v2.

### 에러 처리

- 모든 Supabase 호출은 `{ data, error }` 검사. 실패는 Toast로 한국어 메시지 + console.error.
- 네트워크 끊김: Realtime 상태를 헤더 점(●)으로 표시. 재연결 시 재조회.
- 세션 만료: `onAuthStateChange`에서 `SIGNED_OUT` 수신 시 AuthScreen으로.

## 6. Edge Function `share` (Phase 3)

`supabase/functions/share/index.ts` (Deno). 배포 시 `--no-verify-jwt`.

- 헤더 `X-Share-Token: ec_<base64url 32B>` 필수. 선택 `X-Source`.
- 본문: `application/json` `{text?, title?, url?, expires_in?: '1h'|'1d'|'7d'|'never'}` 또는 `multipart/form-data` (`text`, `title`, `url`, `file`/`files[]`).
- 처리: sha256(token) → `share_tokens` 조회(service_role 클라이언트) → 없으면 401 → 파일은 Storage 업로드(`<user_id>/…`, 50MB·확장자 검사) → `items.insert(user_id, …)` → `last_used_at = now()` → `200 {ok:true, inserted:[ids]}`.
- 에러: 400(내용 없음/크기 초과/차단 확장자), 401, 500(메시지 포함). CORS 허용.
- 토큰 UI: SettingsDialog에서 생성(`crypto.getRandomValues` 32B → base64url, 접두 `ec_`), sha256은 WebCrypto로 클라이언트에서 계산해 해시만 insert. 평문은 생성 직후 1회만 표시. 폐기 = 행 delete.
- 단축어 레시피는 README에 스크린샷 없는 텍스트 단계로 기록.

## 7. 보안 체크리스트 (기획서 §12 중 v1 해당분)

- 모든 테이블 RLS 활성 + 정책. 버킷 비공개. 서명 URL 1시간.
- `.env` gitignore, `.env.example`만 커밋. `service_role`은 코드·저장소 어디에도 없음 (Edge Function은 런타임 env `SUPABASE_SERVICE_ROLE_KEY` 자동 주입).
- 토큰 해시만 저장. 링크는 `rel="noopener noreferrer"`, `http(s)`만. React 기본 이스케이프.
- 파일 크기·확장자 검사는 클라이언트와 Edge Function 양쪽.

## 8. 테스트

- **vitest**: `detect.ts`, `files.ts`, `expiry.ts`의 순수 함수. 각 경계값 포함.
- **수동 매트릭스**: Windows Chrome / macOS Safari·Chrome / iPhone Safari(홈 화면) / iOS 단축어 × {텍스트, 링크, 이미지, 파일, 실시간 반영, 복사·다운로드·공유, 고정, 검색, 만료}.
- **보안 수동**: 계정 B로 계정 A의 item id 조회·삭제 → 0건. 잘못된 토큰으로 `/share` → 401.
- `tsc --noEmit` + `vitest run` + `vite build`를 로컬 스크립트 `npm run check`로.

## 9. 단계

| Phase | 내용 | 완료 신호 | 사용자 개입 |
| :-- | :-- | :-- | :-- |
| 0 | Node LTS 설치(winget), Vite 스캐폴드, 마이그레이션 SQL, AuthScreen, 순수 함수+테스트 | 로컬에서 로그인 후 빈 상자 화면 | Supabase 프로젝트 생성 → URL·anon key 전달. 마이그레이션은 SQL Editor에 붙이거나 `npx supabase db push` |
| 1 | items CRUD, Realtime, 파일 업로드·서명 URL·썸네일, Ctrl+V, 드래그&드롭, 복사·다운로드·공유·삭제·고정·검색·만료·기기 이름 | 탭 두 개에서 한쪽에 넣으면 다른 쪽이 즉시 바뀐다 | 없음 |
| 2 | GitHub push, Vercel 배포, Auth URL 설정, 맥미니·아이폰에서 접속 | 맥미니에서 넣으면 PC에 1초 안에 뜬다 | GitHub 저장소 생성, Vercel 가입(GitHub 로그인), 환경변수 입력 |
| 3 | Edge Function `share`, 토큰 UI, 단축어 레시피, README | 아이폰 공유 시트 → 단축어 → PC에 뜬다 | `npx supabase login`, 단축어 제작 |

## 10. 저장소 구성

```
ender/
├── README.md
├── docs/PLAN.md, docs/superpowers/specs/, docs/ADR/
├── src/            (§5)
├── public/         icons
├── supabase/
│   ├── migrations/0001_init.sql      items, share_tokens, RLS, realtime publication
│   ├── migrations/0002_storage.sql   bucket chest + storage policies
│   └── functions/share/index.ts
├── .env.example
├── .gitignore
├── index.html, vite.config.ts, tsconfig.json, package.json
```
