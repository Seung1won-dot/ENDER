# Ender Chest — 진행 상황과 인수인계

기준일: 2026-09-25 (2일차 종료. 2일차 내용은 §6)
브랜치: `feat/v1` (구현), `main` (문서만, 아직 병합 전)
저장소: https://github.com/Seung1won-dot/ENDER

계획서: `docs/superpowers/plans/2026-09-25-ender-chest-v1.md` · 스펙: `docs/superpowers/specs/2026-09-25-ender-chest-v1-design.md` · 기획서 원문: `docs/PLAN.md`

## 1. 오늘 완료한 것

### 코드 (Task 1~16, 모두 `feat/v1` 에 커밋, 각 Task 리뷰 통과)

| Task | 내용 | 상태 |
| :-- | :-- | :-- |
| 1 | Vite + React 18 + TS strict 스캐폴드, `npm run check` | 완료 |
| 2~5 | 순수 모듈 `detect` `files` `expiry` `device` (+ vitest) | 완료 |
| 6 | 마이그레이션 SQL(items, share_tokens, RLS, realtime, Storage 버킷), supabase 클라이언트, `messageOf` | 완료 (SQL 재실행 안전하게 수정, 인증 에러 한국어화) |
| 7 | 이메일+비밀번호 로그인/가입, 매직링크 보조, 세션 훅, 토스트 | 완료 |
| 8 | items 데이터 계층, 목록 상태 순수 함수 | 완료 |
| 9 | Realtime `useItems`, ItemCard/ItemList, 상태 점 | 완료 |
| 10 | Composer, Ctrl+V(텍스트·이미지), 드래그&드롭 오버레이, 만료 선택 | 완료 |
| 11 | 복사·열기·다운로드·공유·고정·삭제, 썸네일, 검색(`/`), 설정(기기 이름·기본 만료·로그아웃), 만료 정리 | 완료 (작업 중 표시 재진입 버그 수정) |
| 12 | PWA manifest·아이콘·서비스워커 | 완료 |
| 13 | README 셋업 가이드, vercel.json | 코드 완료, **배포는 미완** |
| 14 | 개인 토큰 생성·목록·폐기 UI (`ec_…`, SHA-256 해시 저장) | 완료 |
| 15 | Edge Function `share` (Deno) + `rules.ts` | 완료, **배포·계약 테스트 완료** |
| 16 | README 아이폰 단축어 레시피, ADR-001, README 가입 허용 안내, vercel.json icon.svg 예외 | 커밋 완료 (`9ac2b70`), **Task 리뷰는 내일** |

테스트: `npm run check` (tsc + vitest 74개 + vite build) 통과.

### 인프라 (Supabase 프로젝트 `yimqpqnxebkypsjwfbbj`)

- 마이그레이션 0001·0002 적용 완료 (Management API로 실행). 테이블 2개, RLS 정책 8개, Storage 정책 4개, 비공개 버킷 `chest`, realtime publication, replica identity full 확인.
- Auth: Email provider ON, Confirm email OFF, Allow new users to sign up ON. Site URL/Redirect: `http://localhost:5173`.
- Edge Function `share` 배포됨: `https://yimqpqnxebkypsjwfbbj.supabase.co/functions/v1/share`. 401/400/200 경로 모두 검증.
- GitHub 원격 `origin` 연결, `main`·`feat/v1` push.

### 사용자 수동 검증 (로컬 `http://localhost:5173`)

- 가입 → 상자 화면 진입 ✅
- 텍스트 넣기 ✅
- 탭 두 개 실시간 반영 ✅ (Phase 1 완료 조건)

## 2. 아직 안 한 것 (순서대로)

1. **Edge Function `share` 재배포.** 2일차에 `index.ts`·`rules.ts` 가 바뀌었는데 배포는 아직 (개인 액세스 토큰 필요, §3 명령).
2. **Vercel 배포 (사용자 계정 필요)**: vercel.com → GitHub 로그인 → `ENDER` Import → 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (아래 값) → Deploy → 주소 받기.
3. Supabase → Authentication → URL Configuration 에 Vercel 주소(Site URL, Redirect `https://xxx.vercel.app/**`) 추가.
4. 맥미니·아이폰에서 접속 확인. 아이폰은 Safari → 홈 화면에 추가.
5. **아이폰 단축어** 제작 (README "iOS 단축어" 절). 토큰은 앱 설정(상단 오른쪽 아이콘) → 새 토큰.
6. 남은 수동 검증: 이미지 Ctrl+V 썸네일, 파일 드래그·다운로드, 링크 열기, 복사, 공유(아이폰), 고정, 검색 `/`, 만료 표시·정리, 설정 기기 이름, PWA 설치. 새 화면도 같이: 다크/라이트 자동 전환, 종류 필터 칩, 긴 텍스트 펼치기, 설정 창 위에 토스트, 다른 기기에서 넣은 항목이 내려오며 나타나는지.
7. 2주 실사용 시작.

Task 16 리뷰, 최종 리뷰 수정, 종류 필터 칩, `main` 병합·태그 `v0.1.0`·push 는 2일차에 완료 (§6).
배포 이후 로드맵(v0.2 삭제 되돌리기·이미지 복사·만료 연장·편집·오류 상태 → v0.2.x 아이폰 → v0.3 PC 힘 기능 → v0.4 견고함)은 `docs/OVERVIEW.md` §9 에 있다. 배포하고 2~3일 써 본 뒤에 고른다.

## 3. 내일 시작할 때

같은 PC(`D:\EC LAB\ender`)에서:

```bash
export PATH="/c/Users/tempadmin/nodejs:$PATH"   # Node 는 포터블 설치 (C:\Users\tempadmin\nodejs)
cd "/d/EC LAB/ender"
git checkout feat/v1 && git pull
npm install        # 의존성 바뀐 경우만 필요
npm run check      # 타입체크 + 테스트 + 빌드
npm run dev        # http://localhost:5173
```

`.env` 는 git 에 없고 이 PC 로컬에만 있다. 다른 기기에서 받으면 `.env.example` 을 복사해 아래 값을 넣는다 (둘 다 공개용 값):

```
VITE_SUPABASE_URL=https://yimqpqnxebkypsjwfbbj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_OZaul36-7w2IYN3MuCPtdA_9bjwtEzr
```

Edge Function 재배포 (코드 바꿨을 때):

```bash
SUPABASE_ACCESS_TOKEN=<개인 액세스 토큰> npx supabase functions deploy share --no-verify-jwt --project-ref yimqpqnxebkypsjwfbbj
```

개인 액세스 토큰(`sbp_…`)은 저장소·문서에 절대 넣지 않는다. https://supabase.com/dashboard/account/tokens 에서 발급·폐기.

Claude Code 로 이어서 할 때: 이 문서와 `.superpowers/sdd/2026-09-25-ender-chest-v1/progress.md` (로컬 장부, git 미추적)를 먼저 읽고, 완료된 Task 를 다시 시키지 않는다. 실행 방식은 superpowers 의 subagent-driven-development.

## 4. 오늘 내린 결정 (기획서·계획서와 다른 점)

- Node.js 는 winget MSI 대신 **포터블 zip** (`C:\Users\tempadmin\nodejs`). MSI 는 UAC 승인이 필요해 자동화 불가. 이 PC 에 미완료 msiexec 프로세스가 남아 있어 재부팅 전까지 MSI 설치가 막힐 수 있음.
- 작업은 워크트리 없이 **`feat/v1` 브랜치**에서. 배포 시점에 `main` 으로 fast-forward.
- 로그인은 **이메일+비밀번호 기본**, 매직링크 보조 (Supabase 기본 SMTP 발송 제한 때문).
- `chests` 테이블 없음, 만료 정리는 **클라이언트 lazy cleanup**, 출처는 **기기 이름**, 검색은 **클라이언트 필터**, Android share_target 제외.
- 마이그레이션 SQL 은 `drop policy if exists` + publication 가드로 **재실행 안전**.
- Supabase 인증 에러는 `messageOf` 에서 **한국어로 매핑**.
- Edge Function 의 `rules.ts` 는 `src/lib` 규칙의 **의도된 복제** (Deno 번들 제약). 규칙 바꾸면 양쪽 수정.
- 서브에이전트 커밋의 Co-Authored-By 는 각 모델 이름 그대로 둠.

## 5. 알려진 사소한 미결 사항 (최종 리뷰에서 정리)

- `sanitizeFileName` 100자 절단이 확장자를 자를 수 있음.
- `getDeviceName` 저장값 trim 안 함. iPadOS 데스크톱 UA 는 Mac 으로 표시.
- `addFileItem` 보상 삭제의 에러 미확인. `useItems` 재조회 중복 요청은 병합 대신 건너뜀. `mergeItem` 은 순서 뒤바뀐 UPDATE 를 그대로 덮어씀.
- `ToastHost` 타이머는 언마운트 시 정리 안 함 (현재 언마운트되지 않음).
- `errors.ts` 코드 매핑 조회가 `in` 연산자 사용(프로토타입 키 방어 없음).
- `TokenSection` 복사 버튼이 클립보드 결과를 기다리지 않고 성공 토스트. 생성 직후 토큰 표시가 설정 창을 닫아도 세션 내 유지됨.
- Edge Function: 보상 삭제 에러 미확인. `last_used_at` 갱신 시점·`expires_in` 기본값은 위 2번의 수정 예정 항목.
- maskable 아이콘이 일반 아이콘과 동일 렌더(모서리 잘릴 수 있음).
- `npm audit` 경고 6건 (전이 의존성).
- 공개 저장소임. 비밀값은 없음. 원하면 Private 으로 전환.

## 6. 2일차 (2026-09-25 오후) 진행

### 최종 리뷰와 수정
- Task 16 리뷰 통과. 전체 브랜치 최종 리뷰(읽기 전용 서브에이전트) 결과 필수 2건 + 권장 5건을 반영:
  - Edge Function: `last_used_at` 갱신을 토큰 검증 직후로 이동, `expires_in` 누락 시 7일(앱과 동일, `never` 만 영구), `X-Source` 40자·제목 80자 상한.
  - `useItems.reload` 재조회 병합(진행 중이면 끝난 뒤 한 번 더 조회), `errors.ts` 는 `Object.hasOwn`, 링크 "열기" 도 `isSafeHttpUrl` 검사, 설정 창을 열 때마다 토큰 목록 갱신 + 닫으면 새 토큰 표시 제거, 토큰 복사는 클립보드 결과를 기다린 뒤 토스트.
- §5 의 나머지 항목은 v2 로 보류.

### 디자인 패스 ("흑요석 상자")
- 기준 파일 `PRODUCT.md`(제품 사실), `DESIGN.md`(색·글꼴·구성 토큰과 규칙)를 먼저 쓰고 화면을 고쳤다. 방향은 사용자가 "흑요석 + 엔더 청록"(다크 기본, 라이트 자동)을 선택.
- 글꼴 IBM Plex Sans KR + IBM Plex Mono (Google Fonts, 서비스워커가 캐시). 강조색은 엔더 청록 하나.
- 이모지 → SVG 아이콘 한 벌(`src/components/Icon.tsx`). 앱 아이콘도 같은 마크로 교체(`public/icon.svg` → `npm run icons`).
- 카드 → 가로선으로 나눈 행 목록(`ItemRowView.tsx`). 고정됨/최근 그룹, 긴 텍스트 8줄 클램프 + 펼치기, 다른 기기에서 도착한 행은 220ms 동안 내려오며 나타남.
- 종류 필터 칩(전체·텍스트·링크·이미지·파일, 개수 표시, 검색과 함께 적용). 순수 함수 `filterByKind`·`countByKind` + 테스트 4개.
- 만료 선택은 세그먼트(`ExpirySegment.tsx`), 토스트는 popover 로 띄워 설정 창 위에도 보임, 로딩 스켈레톤, 가르치는 빈 화면, 필터 결과 없음 상태.
- 검사: `npm run check` 통과(테스트 78개). `npx --yes impeccable@latest detect src index.html` 지적 0건. 헤드리스 크롬으로 정적 프리뷰 스크린샷(1280 다크/라이트, 390·360 모바일) 확인.
- DESIGN-GUIDE 5항목: 시스템 글꼴 없음 / 보라·파랑 그라데이션 없음 / 카드 안 카드 없음 / 색 배경 위 회색 본문 없음 / 바운스 없음.
- 참고: impeccable·design-taste 스킬은 상위 폴더 `D:\EC LAB\.claude` 에 설치돼 있어 이 프로젝트에서는 `/impeccable` 명령이 안 뜬다. 이 프로젝트에서 쓰려면 `ender` 폴더에서 DESIGN-GUIDE.md 의 설치 명령을 다시 실행.

### 병합
- `feat/v1` → `main` fast-forward, 태그 `v0.1.0`, push.

## 7. 2일차 후반: v0.2~v0.4 기능 한꺼번에

사용자 요청("넣으면 좋을 것 다 넣자")으로 로드맵의 v0.2~v0.4 를 `feat/v1` 에 구현. 스키마 변경 없음. 자세한 목록은 `docs/OVERVIEW.md` §3·§9.

- 커밋 `b523e44`(v0.2: 삭제 되돌리기, 이미지 복사, 만료 연장, 편집, 오프라인·오류 상태·캐시, 재구독, 용량) 와 그 다음 커밋(v0.2.x~v0.4: 단축어 요약, 붙여넣기 버튼, 링크 제목·파비콘, 키보드 탐색, 코드 모노, 탭 제목, 초안 보존, 테마, 세션 만료 안내).
- 새 Edge Function `preview`(링크 제목). `share` 도 링크 제목·응답 요약이 추가됨. **둘 다 배포 전** (README §5).
- 검사: `npm run check`(테스트 99개) 통과, `impeccable detect` 0건, 정적 프리뷰 스크린샷으로 새 상태 확인.
- 뺀 것: 브라우저 밖으로 파일 드래그(Chrome 전용), 서버측 만료 정리(pg_cron·pg_net 설정 필요).
- 실기기에서 확인할 것: 이미지 복사 붙여넣기(Chrome·Safari), 폰 붙여넣기 버튼 권한 흐름, 링크 제목이 배포 후 실제로 채워지는지, 절전 복귀 후 실시간 표시.
