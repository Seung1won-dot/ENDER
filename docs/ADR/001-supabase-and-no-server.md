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
