# Ender Chest — 작업 규칙

## 프로젝트
- 먼저 읽을 것: `docs/PROGRESS.md`(현재 상태·남은 일·기획서와 달라진 결정), `docs/superpowers/specs/2026-09-25-ender-chest-v1-design.md`(구현 스펙: 데이터 모델·RLS·보안 원칙), `docs/PLAN.md`(원 기획서). 스펙과 기획서가 다르면 스펙이 우선한다.
- 스택: React 18 + TypeScript(strict) + Vite, Supabase(Auth·Postgres RLS·Storage·Realtime·Edge Function), vite-plugin-pwa, vitest. 상태 관리·UI 라이브러리 없음. 새 라이브러리는 이유를 설명하고 추가한다.
- 개인 실사용 도구다. 기능 판단 기준은 `PRODUCT.md`(누가 어떤 장면에서 쓰는지). 발표·협업용 기능은 넣지 않는다.

## 화면(UI)·스타일
- 화면이나 스타일(HTML, CSS, 컴포넌트) 파일을 만들거나 고치기 전에 `DESIGN.md`(색·글꼴·구성 토큰과 규칙)를 읽고 그대로 쓴다. 아이콘은 `src/components/Icon.tsx` 의 SVG 만.
- 아래 DESIGN-GUIDE.md 의 "AI에게 주는 작업 규칙"을 따르고, 끝나면 `npx --yes impeccable@latest detect src index.html` 을 돌려 지적이 없을 때까지 고친다.

@DESIGN-GUIDE.md

## 품질 기준
- 모든 코드는 `npm run check`(tsc + vitest + vite build)를 통과해야 한다. `any` 금지.
- 순수 로직은 `src/lib` 에 두고 vitest 로 테스트한다(테스트 먼저). 컴포넌트·훅은 브라우저에서 직접 확인.
- 함수·컴포넌트는 한 가지 일만. 파일이 200줄을 넘으면 분리를 제안한다.
- 에러는 삼키지 않는다. 사용자에게 보이는 실패는 한국어로 원인과 해결을 알려준다(`messageOf` 사용, 말투는 "~해요").
- 보안: RLS 정책 없는 테이블 금지. `service_role` 키는 Edge Function 런타임 env 에서만. 파일은 비공개 버킷 + 서명 URL. 링크는 `isSafeHttpUrl` 을 통과한 것만 연다.
- 접근성: 아이콘 버튼에 `aria-label`, 키보드로 모든 조작 가능, 색 대비 AA(본문 4.5:1, UI 요소 3:1), `prefers-reduced-motion` 존중.
- Edge Function 의 `rules.ts` 는 `src/lib` 규칙의 의도된 복제다. 규칙을 바꾸면 양쪽을 같이 고치고 재배포한다.

## 작업 방식
- 기능 하나를 만들기 전에 (1) 어떤 파일을 어떻게 바꿀지 (2) 엣지 케이스 (3) 테스트 방법을 3줄로 먼저 적고, 사용자가 OK 하면 시작한다.
- 끝나면 반드시: `npm run check` 실행 → 바뀐 파일 목록 → 사용자가 직접 확인해야 할 것 → 남은 리스크 를 보고한다.
- 기능 하나가 끝날 때마다 시니어 개발자 관점(버그 가능성, 중복, 이름이 의도를 드러내는지, 에러 처리 누락, RLS·키 노출, 모바일에서 깨질 곳)으로 스스로 검토하고, 심각도 상위 3개는 바로 고친다.
- 확신 없는 API 나 동작은 추측하지 말고 공식 문서를 확인하거나 사용자에게 묻는다.
- 커밋 메시지: `feat|fix|refactor|docs(범위): 한 줄 한국어 설명`, 본문에 무엇을 왜 바꿨는지.
- 진행 상황과 결정은 `docs/PROGRESS.md` 에 이어 적는다.

## 하지 말 것
- 요청하지 않은 기능 추가, 기존 동작 임의 변경, `.env`·토큰(`sbp_…`, `ec_…`) 커밋, `console.log` 남기기(`console.warn` 은 사용자에게 보여 줄 수 없는 경고에만).
- 이모지 아이콘, 시스템 글꼴, 보라·파랑 그라데이션, 카드 안 카드, 바운스 효과(DESIGN-GUIDE 5항목).
