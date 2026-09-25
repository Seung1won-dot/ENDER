# Ender Chest 프로젝트 정리

기준일: 2026-09-25 · 버전 `v0.1.0` (`main` = `d6b8f84`) · 저장소: https://github.com/Seung1won-dot/ENDER

어디서 열어도 같은 내용물이 보이는 나만의 상자. Windows PC, 맥미니, 아이폰 사이에서 텍스트·링크·파일을 주고받는 개인용 인박스다. 메신저 "나에게 보내기"를 대신한다. PWA + Supabase 로 만들었고 운영 비용은 0원, 관리할 서버는 0대다.

---

## 1. 목적과 범위

| 항목 | 결정 |
|---|---|
| 목적 | 본인이 매일 쓰는 개인 도구. 발표·데모용 아님. 나중에 연구실에 소개할 수는 있음 |
| 핵심 장면 | 연구실 Windows PC ↔ 맥미니 데스크톱 브라우저 간 실시간 동기화 |
| 보조 장면 | 아이폰: 공유 시트 → 단축어 → 상자에 넣기, Safari 홈 화면 PWA 로 꺼내기 |
| 성공 기준 | 2주 동안 매일 쓰고도 불편하지 않다. 넣기(Ctrl+V, 드래그, 입력)와 꺼내기(복사, 다운로드)가 손에 붙는다 |
| 제외 | Android, 협업·공유 링크, 분석·성능 측정, E2E 테스트·CI (개인 실사용 우선) |

## 2. 현재 상태 (한눈에)

- 코드: v1 기능 전부 구현, 최종 리뷰 반영, 디자인 전면 교체(`v0.1.0` 태그), 그 뒤 v0.2~v0.4 로드맵 기능을 `feat/v1` 에 추가(§9 표). 스키마 변경 없음.
- 검사: `npm run check` 통과 (타입체크 + 단위 테스트 99개 + 빌드), `impeccable detect` 지적 0건.
- 인프라: Supabase 프로젝트 `yimqpqnxebkypsjwfbbj` 에 스키마·RLS·Storage·Realtime 적용 완료. Edge Function `share` 는 1일차 판이 배포돼 있고 2일차 수정분(요약·제목·만료 기본값)과 새 함수 `preview` 는 **배포 전**.
- 배포: **Vercel 미배포.** 지금은 로컬(`npm run dev`, http://localhost:5173)에서만 실행.
- 검증: 가입, 텍스트 넣기, 탭 두 개 실시간 반영은 확인. 나머지 수동 검증은 §9.

## 3. 기능

**넣기**
- 입력창: 텍스트나 링크를 적고 Enter (줄바꿈은 Shift+Enter). 단일 URL 은 자동으로 링크로 분류.
- 화면 어디서든 Ctrl+V: 텍스트·이미지(스크린샷). 파일 드래그&드롭, 파일 선택 버튼.
- 파일은 50MB 이하, 실행 파일(exe, msi, bat, cmd, com, scr, vbs, jar, apk, dmg, pkg)은 차단.
- 아이폰 단축어: 개인 토큰으로 Edge Function 에 POST (텍스트·URL·파일).
- 만료: 1시간 / 1일 / 7일 / 영구, 기본 7일. 마지막 선택을 기억.

**꺼내기·관리**
- 실시간 목록 (다른 기기에서 넣으면 1초 안에 반영, 새로 도착한 행은 살짝 내려오며 나타남). 탭이 숨겨진 동안 도착한 개수는 탭 제목 "(2) Ender Chest".
- 복사(이미지는 클립보드에 PNG) · 새 탭에서 열기 · 다운로드 · 다른 앱으로 공유(Web Share) · 고정 · 삭제(5초 안에 되돌리기) · 텍스트 인라인 편집.
- 검색(`/` 단축키, 제목·본문·파일명) + 종류 필터 칩(전체·텍스트·링크·이미지·파일, 개수 표시).
- 키보드 탐색: `j`/`k` 이동, `c` 복사, `Enter` 열기·다운로드, `e` 편집, `d` 삭제, `p` 고정, `x` 만료 메뉴.
- 링크는 페이지 제목(Edge Function `preview`)과 사이트 파비콘 표시. 코드처럼 보이는 텍스트는 모노 글꼴 상자.
- 이미지 썸네일(서명 URL, 50분마다 갱신). 긴 텍스트는 8줄(코드는 12줄)까지 보이고 "펼치기".
- 항목마다 출처 기기 이름 · 시각 · 남은 기간 표시. 남은 기간을 누르면 1일·7일 연장 또는 영구 보관. 1시간 미만이면 경고색.
- 만료된 항목은 앱을 열 때와 탭으로 돌아올 때(10분 간격) 정리(파일 삭제 → 행 삭제).
- 오프라인이거나 조회에 실패하면 기기에 남긴 마지막 목록을 보여 주고 배너로 알린다. 절전 복귀 때 Realtime 채널이 끊겨 있으면 다시 구독.
- 입력 중 내용은 탭 세션에 보존(새로고침·자동 업데이트에도 유지). 세션이 만료되면 안내하고 로그인 화면으로.

**설정**
- 이 기기 이름(출처 표시용), 화면 테마(자동/다크/라이트), 기본 만료, 파일 용량(무료 1GB 대비), 단축어 토큰 발급·목록·폐기, 로그아웃.

**아이폰**
- 단축어 응답 `summary`("링크 1개 넣었어요")를 알림에 표시. 입력창의 "붙여넣기" 버튼으로 클립보드의 글·이미지를 바로 넣기. 뒷면 탭 자동화 레시피는 README.

**계정**
- 이메일 + 비밀번호 기본, 메일 링크(매직링크) 보조. 가입은 이메일 확인 없이 바로.

## 4. 아키텍처

```
넣기  PC/맥 PWA: 입력창 · Ctrl+V · 드래그&드롭 · 파일 선택
      아이폰: 공유 시트 → 단축어 → POST /functions/v1/share (X-Share-Token)
                          │
                          ▼
                 Supabase 프로젝트 (서울)
                   Auth (이메일+비밀번호, 매직링크)
                   Postgres: items, share_tokens  (전부 RLS, 본인 행만)
                   Storage: 비공개 버킷 "chest", 경로 <uid>/<uuid>-<파일명>, 서명 URL 60분
                   Realtime: postgres_changes on items (user_id 필터)
                   Edge Function share (Deno, service_role 은 런타임 env 만)
                          │
                          ▼
꺼내기 PC/맥/아이폰 PWA: 실시간 목록 · 복사 · 다운로드 · 공유 · 고정 · 검색 · 필터 · 삭제
```

- 프론트는 supabase-js 로 DB·Storage 에 직접 접근한다. 권한은 전부 RLS 가 맡는다.
- 자체 서버 코드는 Edge Function 하나뿐. 만료 정리·검색·필터는 클라이언트가 한다.
- Vercel 은 정적 파일만 서빙한다(SPA rewrite + 서비스워커 헤더).

### 데이터 모델

`items`

| 열 | 타입 | 뜻 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | 소유자. 기본값 `auth.uid()`, 계정 삭제 시 함께 삭제 |
| kind | text | `text` / `link` / `file` |
| title | text | 표시용 제목 (링크는 호스트/첫 경로, 텍스트는 첫 줄 80자, 파일은 파일명) |
| content | text | 텍스트 본문 또는 링크 URL |
| file_path, file_name, file_size, mime_type | | 파일 항목만 |
| source | text | 넣은 기기 이름 |
| pinned | boolean | 고정 |
| expires_at | timestamptz | null 이면 영구 |
| created_at | timestamptz | |

`share_tokens`: `id`, `user_id`, `token_hash`(SHA-256, 평문은 생성 직후 한 번만 표시), `label`, `created_at`, `last_used_at`.

### 보안 원칙
- `items`, `share_tokens`: select/insert/update/delete 정책 각 4개, 조건은 모두 `auth.uid() = user_id`.
- `storage.objects`(버킷 `chest`): 경로의 첫 폴더가 본인 uid 일 때만 4가지 작업 허용. 버킷은 비공개, 다운로드는 서명 URL.
- Edge Function 은 토큰 해시로 사용자를 찾고 `service_role` 로 삽입한다. 토큰이 없거나 틀리면 401, 내용이 없으면 400, 실행 파일·50MB 초과는 400.
- 링크는 `http(s)` 만 열고 `rel="noopener noreferrer"`. 사용자에게 보이는 에러는 한국어.

## 5. 화면과 디자인 시스템 ("흑요석 상자")

- 기준 파일: `PRODUCT.md`(제품 사실), `DESIGN.md`(색·글꼴·구성 토큰과 규칙). 화면을 고칠 때 먼저 읽는다.
- 색: 흑요석 다크 기본(`#15161d`), 시스템 설정에 따라 스톤 라이트 자동. 강조는 엔더 청록(`#4fd1a5`, 라이트 `#0a6e53`) 하나. 주요 동작·선택·실시간·포커스에만 쓴다.
- 글꼴: IBM Plex Sans KR(본문) + IBM Plex Mono(시각·크기·토큰). Google Fonts, 서비스워커가 캐시.
- 구성: 상단바(마크 · 이름 · 연결 상태 · 검색 · 설정) → 입력 표면 → 종류 필터 칩 → 가로선으로 나눈 행 목록(고정됨 / 최근).
- 아이콘: 이모지 없이 `src/components/Icon.tsx` 의 SVG 한 벌. 앱 아이콘도 같은 상자 마크.
- 상태: hover·focus·disabled·로딩 스켈레톤·가르치는 빈 화면·필터 결과 없음·오류 토스트(설정 창 위에도 뜸).
- 지키는 규칙: 시스템 글꼴 없음, 그라데이션 없음, 카드 안 카드 없음, 색 배경 위 회색 본문 없음, 튕기는 효과 없음. `prefers-reduced-motion` 이면 움직임 전부 끔.

## 6. 저장소 구조

```
CLAUDE.md                  Claude Code 작업 규칙 (DESIGN-GUIDE.md 포함)
DESIGN-GUIDE.md            AI 티 없는 화면 만들기 가이드 (스킬 설치·검사 절차)
DESIGN.md / PRODUCT.md     디자인 기준 / 제품 기준
README.md                  셋업 가이드 (Supabase, 로컬, Vercel, 아이폰 단축어)
docs/PLAN.md               원 기획서
docs/PROGRESS.md           진행 상황·남은 일·결정 기록 (이어서 작업할 때 첫 문서)
docs/OVERVIEW.md           이 문서
docs/ADR/001-*.md          Supabase 단일 백엔드 결정
docs/superpowers/          구현 스펙과 계획서
index.html                 글꼴 링크, 테마색
vite.config.ts             Vite + PWA(manifest, 서비스워커, 글꼴 캐시) + vitest
vercel.json                SPA rewrite, 서비스워커 헤더
public/icon.svg, icons/    앱 아이콘 (scripts/make-icons.mjs 로 PNG 생성)
src/
  main.tsx, App.tsx        진입점, 세션에 따라 로그인/상자 화면
  styles/global.css        디자인 토큰과 전역 스타일
  components/
    AuthScreen.tsx         로그인·가입
    ChestScreen.tsx        상자 화면 (상태 조합, 넣기, 필터, 배너, 다이얼로그)
    TopBar.tsx             상단바 (마크·연결 상태·검색·설정)
    Composer.tsx           입력 표면 (초안 보존, 폰용 붙여넣기 버튼)
    ExpirySegment.tsx      만료 선택 세그먼트
    FilterChips.tsx        종류 필터 칩
    ItemList.tsx           목록·스켈레톤·빈/오류/오프라인 상태
    ItemRowView.tsx        항목 한 줄 (종류별 렌더, 파비콘, 코드 표시)
    RowActions.tsx         항목 동작 버튼 (data-action)
    RowEditor.tsx          텍스트 인라인 편집
    ExpiryMenu.tsx         남은 기간 + 연장 메뉴
    SearchBar.tsx          검색 (`/`)
    SettingsDialog.tsx     설정 창 (기기 이름, 테마, 기본 만료, 용량, 토큰)
    TokenSection.tsx       단축어 토큰 관리
    ToastHost.tsx          토스트 (popover, 되돌리기 버튼)
    DropOverlay.tsx        드래그 중 오버레이
    Icon.tsx               SVG 아이콘 + 상자 마크
  hooks/
    useSession.ts          Supabase 세션, 만료 안내
    useItems.ts            목록 조회 + 캐시 + Realtime 구독/재구독
    useItemActions.ts      복사·열기·다운로드·공유·고정·삭제(되돌리기)·연장·편집
    useRowKeys.ts          키보드 탐색 (j/k, c, Enter, e, d, p, x)
    useArrivals.ts         도착 연출 대상 + 탭 제목 개수
    useCleanup.ts          만료 정리 (열 때·탭 복귀)
    useOnline.ts           온라인 여부
    usePaste.ts            Ctrl+V 텍스트·이미지
    useDropzone.ts         드래그&드롭
    useSignedUrl.ts        썸네일 서명 URL
    useStoredExpiry.ts     만료 선택 기억
  lib/                     순수 로직 (vitest)
    detect.ts              링크 감지, 제목, 코드 판별
    files.ts               파일명 정리, 차단 확장자, 크기 표시, PNG 변환
    expiry.ts              만료 계산·표시·연장
    device.ts              기기 이름
    itemsState.ts          정렬·병합·검색·종류 필터
    cache.ts               마지막 목록 기기 캐시
    items.ts               items 테이블·Storage 데이터 계층
    preview.ts             링크 제목 가져오기 (Edge Function 호출)
    theme.ts               화면 테마 저장·적용
    tokens.ts              토큰 생성(해시)·목록·폐기
    errors.ts              Supabase 에러 한국어 변환
    toast.ts, keys.ts, supabase.ts
supabase/
  migrations/0001_init.sql     테이블, RLS, Realtime
  migrations/0002_storage.sql  버킷, Storage 정책
  functions/_shared/html.ts    페이지 제목 추출·주소 검사 (두 함수 공용, vitest 로 검증)
  functions/share/index.ts     아이폰 단축어용 Edge Function (요약·링크 제목 포함)
  functions/share/rules.ts     src/lib 규칙의 Deno 복제 (같이 고칠 것)
  functions/preview/index.ts   링크 제목 가져오기 (JWT 검증 켜고 배포)
```

## 7. 개발과 검사

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH"   # 이 PC 는 Node 포터블 설치
cd "/d/EC LAB/ender"
npm install
npm run dev          # http://localhost:5173 (같은 공유기: http://192.168.0.81:5173)
npm run check        # 타입체크 + 테스트 + 빌드
npm run icons        # public/icon.svg → PNG 아이콘
npx --yes impeccable@latest detect src index.html   # 디자인 검사
```

`.env` 는 git 에 없다. 다른 기기에서는 `.env.example` 을 복사해 Supabase URL 과 publishable key 를 넣는다(값은 `docs/PROGRESS.md` §3).

## 8. 배포 절차 (요약)

1. Supabase: 마이그레이션 2개 실행, Auth 에서 이메일 가입 허용·Confirm email OFF, URL Configuration 에 배포 주소 등록. (마이그레이션·Auth 는 완료, URL 등록은 Vercel 주소가 생기면)
2. Edge Function: `SUPABASE_ACCESS_TOKEN=<개인 토큰> npx supabase functions deploy share --no-verify-jwt --project-ref yimqpqnxebkypsjwfbbj` (2일차 수정분 재배포 필요)
3. Vercel: GitHub 로그인 → `ENDER` Import → 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Deploy. `main` 브랜치를 배포한다.
4. 기기: PC/맥은 브라우저 "설치", 아이폰은 Safari → 홈 화면에 추가. 아이폰 단축어는 README "iOS 단축어" 절.

## 9. 남은 일과 알려진 이슈

**남은 일 (사용자 손이 필요)**
1. Edge Function 재배포 (개인 액세스 토큰 필요).
2. Vercel 배포 → Supabase URL 설정 → 맥미니·아이폰 접속 확인.
3. 아이폰 단축어 제작.
4. 수동 검증: 이미지 Ctrl+V 썸네일, 파일 드래그·다운로드, 링크 열기, 공유, 고정, 검색·필터, 만료 표시·정리, 기기 이름, PWA 설치, 다크/라이트 전환, 긴 텍스트 펼치기, 설정 창 위 토스트.
5. 2주 실사용.

**알려진 사소한 이슈 (v2)**
- 만료 정리가 클라이언트 시계 기준이고 앱을 열어야 실행됨 (pg_cron 으로 옮기면 해결).
- 목록 조회 실패 시 "상자가 비어 있어요" 가 보임 (오류 전용 빈 상태 없음).
- 새 배포가 감지되면 페이지가 자동 새로고침되어 입력 중 초안이 사라질 수 있음.
- 고정/해제로 행이 그룹을 옮기면 도착 연출이 다시 재생됨 (220ms).
- iPhone Safari 에서 입력칸 포커스 시 확대는 16px 로 막았지만 실기기 확인 전.

**로드맵** (원칙: 배포하고 2~3일 써 본 뒤에 고른다. 기능을 더 넣어도 기기 간 동기화가 실제로 돌기 전에는 의미가 없다. 버전마다 2~4일 분량, 끝나면 태그)

| 버전 | 범위 | 비고 |
|---|---|---|
| v0.1.x 배포 | Edge Function 두 개(`share`, `preview`) 배포 → Vercel 배포 → Supabase URL 설정 → 아이폰 단축어 → 실기기 검증 | **지금 여기.** 사용자 계정·토큰 필요 |
| v0.2 매일 부딪히는 것 | 삭제 되돌리기 · 이미지 클립보드 복사 · 만료 연장 메뉴 · 텍스트 인라인 편집 · 빈/오류/오프라인 상태 분리 + 마지막 목록 캐시 | **완료** (2일차 후반, 스키마 변경 없이) |
| v0.2.x 아이폰 | Edge Function 응답 `summary` · 입력창 "붙여넣기" 버튼 · 뒷면 탭 자동화·폰에서 꺼내기 레시피(README) | **코드 완료.** 단축어 iCloud 링크 배포와 실기기 확인은 사용자 |
| v0.3 PC 힘 기능 | 숨긴 탭 새 항목 개수 · 키보드 탐색 · 코드 모노 표시 · 링크 제목(`preview` 함수, 제목 열 재사용)·파비콘 | **완료.** 파일을 브라우저 밖으로 드래그(`DownloadURL`)는 Chrome 전용이라 뺌 |
| v0.4 견고함 | 입력 초안 보존 · Realtime 재구독 · 파일 용량 표시 · 세션 만료 안내 · 만료 정리를 탭 복귀 때도 | **완료.** 서버측 만료 정리(pg_cron + 삭제 큐)는 인프라 설정이 필요해 보류 |
| 그 다음 | 다른 스크립트·크론이 curl 로 상자에 넣기(토큰만 있으면 지금도 가능) · 맥 메뉴바 앱(클립보드 → 상자 글로벌 단축키) · 브라우저 확장(우클릭 → 상자에 넣기) · tsvector 검색 · Android 가 생기면 share_target(매니페스트 10줄) · 서버측 만료 정리 | 관심 생기면 |

Claude Code 에 시킬 때는 이 문서와 `docs/PROGRESS.md` 를 먼저 읽게 한 뒤 "v0.2 범위: … 기능마다 계획 3줄 → 구현 → `npm run check` → 깨질 수 있는 상황 3개 점검, 기능 하나 끝날 때마다 멈춰서 보고" 처럼 범위와 순서만 준다. 작업 규칙은 `CLAUDE.md` 에 있다.

## 10. 주요 결정 (기획서와 달라진 점)

| 결정 | 이유 |
|---|---|
| `chests` 테이블 없이 `items` 단일 테이블 | 개인 사용, 상자는 하나 |
| 로그인은 이메일+비밀번호 기본, 매직링크 보조 | Supabase 기본 SMTP 발송 제한 |
| 만료 정리는 클라이언트 lazy cleanup | 서버 코드 최소화. 매일 여는 앱 |
| 검색·필터는 클라이언트 (최근 500개) | 개인 사용량에서 충분. tsvector 는 v2 |
| 출처는 기기 이름(localStorage) | 별도 기기 등록 없이 |
| Android share_target 제외 | Android 기기 없음 |
| PWA 는 vite-plugin-pwa | 수동 manifest·sw 는 학습 목적이었음 |
| Edge Function `rules.ts` 는 `src/lib` 의 복제 | Deno 번들 제약. 규칙 바꾸면 양쪽 수정 |
| Node 는 포터블 zip | 이 PC 에서 MSI 설치가 UAC 로 막힘 |
| 디자인은 "흑요석 + 엔더 청록" | 이름의 비유를 화면에 그대로. 강조색 하나로 절제 |

자세한 근거: `docs/ADR/001-supabase-and-no-server.md`, `docs/PROGRESS.md` §4, 구현 스펙 §3.

## 11. 문서 지도

| 알고 싶은 것 | 문서 |
|---|---|
| 지금 어디까지 됐고 다음에 뭘 하나 | `docs/PROGRESS.md` |
| 처음 셋업·배포·아이폰 단축어 | `README.md` |
| 화면을 고칠 때 색·글꼴·규칙 | `DESIGN.md`, `DESIGN-GUIDE.md` |
| 제품이 누구를 위한 무엇인지 | `PRODUCT.md` |
| 데이터 모델·RLS·보안 상세 | `docs/superpowers/specs/2026-09-25-ender-chest-v1-design.md` |
| 원래 기획 | `docs/PLAN.md` |
| Claude Code 로 이어서 작업할 때 규칙 | `CLAUDE.md` |
