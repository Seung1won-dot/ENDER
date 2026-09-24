# 📦 Ender Chest

### 기기 간 개인 콘텐츠 전송·동기화 시스템 — 프로젝트 기획서 v2

> 마인크래프트 엔더 상자처럼, **어디서 열어도 같은 내용물이 보이는 나만의 상자.** 폰에서 넣으면 PC에서 바로 꺼내고, PC에서 넣으면 폰에서 바로 꺼낸다.

| 항목 | 내용 |
| :---- | :---- |
| 작성자 | Seung1\_dot (ECLAB) |
| 작성일 | 2026-09-25 |
| 상태 | 설계 완료 → 구현 착수 예정 |
| 문서 목적 | ① 개발 가이드 ② 추후 발표·보고용 기획서 |
| 한 줄 요약 | PWA \+ BaaS(Supabase) 기반의 크로스 플랫폼 개인 클립보드/인박스. 메신저 "나에게 보내기"의 대체재. |

---

## 목차

1. 문제 정의  
2. 기존 솔루션 분석 및 차별점  
3. 목표와 성공 기준  
4. 사용자 시나리오  
5. 요구사항 명세 (기능 / 비기능)  
6. 기능 정의 — v1 MVP 와 v2 확장 아이디어  
7. 시스템 아키텍처  
8. 데이터 모델 (ERD)  
9. 핵심 흐름 시퀀스 다이어그램  
10. API 명세  
11. 기술 스택과 선택 근거  
12. 보안 설계  
13. 테스트 및 평가 계획  
14. 개발 로드맵 및 일정  
15. 배포 및 운영 (비용 0원)  
16. 위험 요소와 대응  
17. 학습 성과 (이 프로젝트로 배우는 것)  
18. 발표 구성안 및 예상 질문  
19. 참고 자료  
20. 부록 — 첫 커밋 전 체크리스트

---

## 1\. 문제 정의

### 1-1. 관찰

주변의 PC를 많이 쓰는 사람들은 거의 예외 없이 **메신저의 "나에게 보내기"** (카카오톡 나와의 채팅, 텔레그램 Saved Messages, 슬랙 DM to self)를 개인 클립보드처럼 사용한다. 폰에서 본 링크를 PC에서 열고 싶을 때, PC에서 만든 파일을 폰으로 옮기고 싶을 때, 잠깐 기억해둘 텍스트가 있을 때다.

### 1-2. 왜 불편한가

이 방식은 **채팅 앱의 부산물**이지 그 용도로 설계된 도구가 아니다.

- **검색·정리 불가**: 시간순 대화 로그에 묻힌다. 일주일 전 보낸 링크를 찾으려면 스크롤.  
- **파일 취급이 약함**: 만료(카톡 일반 파일 약 30일), 용량 제한, 다운로드 후 위치 찾기.  
- **PC 클라이언트 의존**: 메신저 데스크톱 앱을 켜야 하고, 회사·학교 PC엔 못 깔 수도 있다.  
- **프라이버시**: 내 메모·파일이 제3자 메신저 서버에 쌓인다.  
- **알림 소음**: 나에게 보내도 알림이 울리거나, 다른 대화와 섞인다.

### 1-3. 기존 OS 기능은 왜 안 되나

Apple 유니버설 클립보드, Windows Phone Link, Samsung Flow는 잘 만들어져 있지만 **같은 회사 생태계 안에서만** 동작한다. 아이폰 \+ Windows 노트북, 갤럭시 \+ 맥북 같은 흔한 조합에서는 쓸 수 없다.

### 1-4. 문제 문장

> **"이거, 다른 기기에서 열고 싶다"** 라는 한 가지 동작을, 어떤 OS 조합에서든, 2번의 탭 안에, 내 통제 하에 있는 저장소로 해내는 도구가 없다.

---

## 2\. 기존 솔루션 분석 및 차별점

| 솔루션 | 크로스 OS | 파일 | 검색·정리 | 실시간 | 데이터 소유 | 비용 | 한계 |
| :---- | :---: | :---: | :---: | :---: | :---: | :---: | :---- |
| 카카오톡 나에게 보내기 | ✅ | △(만료) | ❌ | ✅ | ❌ | 무료 | 채팅 로그, 검색 약함, 메신저 의존 |
| Apple 유니버설 클립보드 / AirDrop | ❌ | ✅ | ❌ | ✅ | ✅ | 무료 | Apple 기기끼리만 |
| Windows Phone Link | △ | △ | ❌ | ✅ | △ | 무료 | Windows \+ 일부 Android |
| KDE Connect / LocalSend / Snapdrop | ✅ | ✅ | ❌ | ✅ | ✅ | 무료 | **같은 Wi-Fi** 에서만, 저장 안 됨 |
| Pushbullet / Join | ✅ | △ | △ | ✅ | ❌ | 유료 플랜 | 유료 전환, 서비스 축소 이력 |
| Google Keep / Notion | ✅ | △ | ✅ | △ | ❌ | 무료 | 공유 시트 진입 느림, 노트앱이라 무거움 |
| **Ender Chest (본 프로젝트)** | ✅ | ✅ | ✅ | ✅ | ✅ | 0원 | iOS 공유 시트는 단축어로 우회 |

### 차별점 요약

1. **OS 조합 무관** — 웹 표준(PWA, Web Share Target)과 서버리스 백엔드만 사용.  
2. **"넣기"에 최적화된 진입** — 공유 시트 / Ctrl+V / 드래그 / 단축어 / (v2) 우클릭·글로벌 단축키. 앱을 열어서 찾아 들어가는 과정이 없다.  
3. **저장소이면서 클립보드** — 실시간이지만 사라지지 않고, 검색·고정·만료가 된다.  
4. **내 데이터** — 내 Supabase 프로젝트(또는 셀프 호스팅)에만 저장. 원하면 종단간 암호화.  
5. **운영 비용 0원**, 서버 관리 0\.

---

## 3\. 목표와 성공 기준

### 3-1. 프로젝트 목표

- **제품 목표**: 내가 매일 실제로 쓰는 도구. 2주 사용 후 카톡 나에게 보내기를 열지 않게 되면 성공.  
- **학습 목표**: PWA, 실시간 동기화, 인증·권한(RLS), 파일 스토리지, 서버리스 함수, CI/CD 배포를 하나의 완결된 서비스로 경험.  
- **발표 목표**: 문제 → 설계 → 구현 → 측정 → 회고의 흐름으로 설명 가능한 결과물.

### 3-2. 정량적 성공 기준 (KPI)

| \# | 지표 | 목표 | 측정 방법 |
| :---- | :---- | :---- | :---- |
| K1 | 폰 공유 → 저장 완료까지 탭 수 | ≤ 2 탭 | 실사용 카운트 |
| K2 | 넣기 → 다른 기기 화면 반영 지연 | 중앙값 \< 1초, p95 \< 3초 | 클라이언트 타임스탬프 로그 (`created_at` vs 수신 시각) |
| K3 | 10MB 이미지 업로드 완료 시간 (LTE) | \< 5초 | 실측 10회 평균 |
| K4 | 기능 완성도 | v1 체크리스트 100% | 3-3 참조 |
| K5 | 월 운영 비용 | 0원 | Supabase·Vercel 청구 내역 |
| K6 | 실사용 | 2주간 매일 1건 이상 | items 테이블 집계 |
| K7 | 보안 | RLS 우회 테스트 0건 성공 | 13장 테스트 계획 |

### 3-3. v1 완료 정의 (Definition of Done)

텍스트·링크·파일 저장 / 실시간 갱신 / Android 공유 시트 / iOS 단축어 / PC 붙여넣기·드래그 / 복사·다운로드·공유·삭제·고정 / 검색 / 배포된 HTTPS 주소 / README 로 제3자가 30분 안에 셋업 가능.

---

## 4\. 사용자 시나리오

**S1. 폰 → PC (가장 빈번)** 지하철에서 유튜브 영상 링크를 봤다. 공유 → Ender Chest 탭. 연구실 도착해 PC 브라우저 탭에 이미 링크 카드가 떠 있다. 클릭해서 연다.

**S2. PC → 폰** PC에서 만든 PDF를 폰에 넣어야 한다. 파일을 브라우저 창에 드래그. 폰 PWA 열어 다운로드 → 또는 "다른 앱으로 공유" 로 카톡에 바로 첨부.

**S3. 스크린샷 텍스트 추출 (v2)** 폰에서 캡처한 공지 이미지를 넣는다. PC에서 OCR 텍스트를 복사해 캘린더에 붙인다.

**S4. 임시 전달** 와이파이 비밀번호를 텍스트로 넣는다. 만료 1시간. 다른 기기에서 복사하고 잊는다. 1시간 뒤 자동 삭제.

**S5. 팀 파일 교환 (v2)** 팀플 상자를 만들고 초대 링크를 보낸다. 팀원들이 로그인 후 파일을 던져 넣는다. 카톡 단톡방에 파일이 만료되는 문제가 사라진다.

**S6. 로그인 없는 기기에서 꺼내기 (v2)** 학교 공용 PC. 내 폰에서 아이템의 QR 을 띄우고 공용 PC 웹캠… 대신 반대로, 폰 화면의 1회용 링크를 공용 PC 브라우저에 입력해 파일을 받는다. 1회 열람 후 링크 소멸.

---

## 5\. 요구사항 명세

### 5-1. 기능 요구사항 (FR)

| ID | 요구사항 | 우선순위 |
| :---- | :---- | :---: |
| FR-01 | 이메일 매직링크로 로그인/로그아웃 | P0 |
| FR-02 | 텍스트 아이템 추가·조회·삭제 | P0 |
| FR-03 | URL 자동 판별 후 링크 아이템으로 저장 | P0 |
| FR-04 | 파일 업로드(≤50MB)·다운로드·삭제 | P0 |
| FR-05 | 모든 기기에서 목록 실시간 갱신 (INSERT/UPDATE/DELETE) | P0 |
| FR-06 | Android 공유 시트에서 텍스트·URL·파일 수신 | P0 |
| FR-07 | iOS 단축어에서 개인 토큰으로 전송 (Edge Function) | P0 |
| FR-08 | 개인 토큰 발급·목록·폐기 UI | P0 |
| FR-09 | PC 브라우저에서 Ctrl+V(텍스트·이미지), 드래그&드롭 | P0 |
| FR-10 | 아이템 복사 / 다른 앱으로 공유(Web Share API) | P0 |
| FR-11 | 아이템 고정(pin), 검색(제목·본문·파일명) | P1 |
| FR-12 | 이미지 썸네일 미리보기 | P1 |
| FR-13 | 출처(android/ios/pc) 표시 | P1 |
| FR-14 | 자동 만료 (1h/1d/7d/영구) 및 주기적 정리 | P1 |
| FR-15 | 링크 OG 미리보기 카드 | P2 |
| FR-16 | Web Push 알림 | P2 |
| FR-17 | 여러 상자 / 태그 | P2 |
| FR-18 | 공유 상자·1회용 공개 링크·익명 투입구 | P2 |
| FR-19 | 데스크톱 트레이 앱(Tauri) — 클립보드 자동 복사, 글로벌 단축키 | P2 |
| FR-20 | 브라우저 확장 — 우클릭 넣기 | P2 |
| FR-21 | OCR / AI 요약 / 스마트 액션 | P3 |
| FR-22 | 종단간 암호화 옵션 | P3 |
| FR-23 | 내보내기·가져오기(JSON+zip), 카톡 대화 내보내기 import | P3 |

### 5-2. 비기능 요구사항 (NFR)

| ID | 항목 | 기준 |
| :---- | :---- | :---- |
| NFR-01 | 성능 | 동기화 지연 p95 \< 3초, 첫 화면 로드(LCP) \< 2초 (4G) |
| NFR-02 | 가용성 | Supabase/Vercel SLA 의존. 오프라인 시 목록 캐시 열람 가능 |
| NFR-03 | 보안 | 모든 테이블 RLS, 비공개 버킷, 토큰 해시 저장, service\_role 키 프론트 노출 금지 |
| NFR-04 | 프라이버시 | 사용자 데이터는 본인 Supabase 프로젝트에만. 분석 트래커 없음 |
| NFR-05 | 호환성 | Android Chrome 최신 2버전, iOS Safari 16+, 데스크톱 Chrome/Edge/Firefox/Safari |
| NFR-06 | 접근성 | 키보드만으로 모든 조작 가능, 대비 WCAG AA |
| NFR-07 | 비용 | 무료 티어 내 운영 |
| NFR-08 | 유지보수성 | TypeScript strict, 컴포넌트 단위 분리, README 로 셋업 30분 |
| NFR-09 | 이식성 | Supabase URL/키만 바꾸면 셀프 호스팅 인스턴스로 전환 가능 |

---

## 6\. 기능 정의

### 6-1. v1 MVP

FR-01 \~ FR-13. 이미 프로토타입(v1 코드)으로 동작 검증 완료. 새로 만들 때는 이 범위를 **Phase 1\~3** 에서 다시 구현한다.

### 6-2. v2 확장 아이디어 ⭐

**(A) 흐름을 더 빠르게**

- **트레이 상주 데스크톱 앱 (Tauri)** — 폰에서 텍스트가 오면 PC 클립보드에 자동 복사 \+ 조용한 토스트. `Ctrl+Shift+C` 로 현재 클립보드를 즉시 상자에. 앱을 열지 않아도 되는 것이 핵심.  
- **Web Push** — PC 브라우저가 닫혀 있어도 "📦 새 아이템" 알림. 알림 클릭 \= 복사.  
- **브라우저 확장 (MV3)** — 우클릭 → 상자에 넣기(선택 텍스트/이미지/페이지 URL). 툴바 팝업에 최근 5개.  
- **QR / 1회용 링크로 꺼내기** — 로그인 안 된 기기에서도 파일 하나만 받기.  
- **키보드 단축키** — `/` 검색, `j/k` 이동, `c` 복사, `d` 삭제, `p` 고정.

**(B) 정리와 기억**

- **자동 만료(임시 슬롯)** — 기본 7일. 진짜 클립보드처럼 넣고 잊어도 알아서 사라져 용량 걱정이 없다. `pg_cron` 으로 매시간 정리.  
- **여러 상자 \+ 태그** — 업무/개인/레퍼런스. 도메인 기반 자동 태그(youtube, github…), 스크린샷 자동 감지.  
- **링크 OG 카드** — Edge Function 이 제목·썸네일·설명 수집. 유튜브는 썸네일, 깃허브는 리포 설명.  
- **전체 텍스트 검색** — Postgres `tsvector` \+ `pg_trgm` 으로 한국어 부분 일치. OCR 결과도 인덱싱.  
- **타임라인 / 갤러리 뷰** — 오늘·어제·이번 주 그룹, 이미지만 그리드.

**(C) 함께 쓰기**

- **공유 상자** — 초대 링크, 역할(viewer / contributor / admin). 팀플 파일 교환.  
- **1회용 공개 링크** — 24시간 또는 N회 열람 후 소멸.  
- **익명 투입구(Drop)** — 로그인 없이 넣기만 가능한 링크. "여기에 과제 파일 던져 주세요."

**(D) 똑똑하게**

- **OCR** — 스크린샷 속 글자 추출·검색·복사 (Tesseract.js 클라이언트 or Edge Function).  
- **AI 요약** — 긴 텍스트·링크 한 줄 요약, "이번 주 넣은 것 정리".  
- **스마트 액션** — 전화번호·주소·계좌·일시 패턴 인식 → 전화/지도/캘린더 버튼.  
- **중복 감지** — 콘텐츠 해시로 "이미 있어요, 위로 올릴까요?"

**(E) 내 데이터는 내 것**

- **종단간 암호화(E2EE)** — WebCrypto, 비밀번호 파생 키(PBKDF2/Argon2). 서버는 내용 열람 불가. 대가로 서버 검색·미리보기 포기.  
- **내보내기 / 가져오기** — JSON \+ 파일 zip. 카카오톡 "대화 내보내기" 텍스트 파일 import 로 과거 나에게 보내기 이관.  
- **셀프 호스팅** — Supabase Docker 스택을 라즈베리파이/홈서버에. 환경변수만 교체.

### 6-3. 스코프 밖

채팅·댓글·소셜, 동시 문서 편집, 대용량 스트리밍(파일 50MB 상한), 다국어 UI(한국어 우선).

---

## 7\. 시스템 아키텍처

┌───────────────────────────── 넣기 (Ingress) ─────────────────────────────┐

│ 📱 Android  공유 시트 → PWA share\_target(POST) → Service Worker → IndexedDB │

│ 🍎 iOS      단축어 → POST /functions/v1/share  (X-Share-Token)             │

│ 💻 PC 웹    Ctrl+V · 드래그&드롭 · 파일 선택                                 │

│ 🧩 확장     우클릭 → 넣기                                        (v2)      │

│ 🖥 Tauri    글로벌 단축키 → 클립보드 → 넣기                        (v2)      │

└──────────────────────────────────┬───────────────────────────────────────┘

                                   ▼

                 ┌─────────────────────────────────────────┐

                 │               Supabase                  │

                 │  Auth      매직링크, JWT                 │

                 │  Postgres  chests / items / tokens …    │ ← RLS: 본인 데이터만

                 │  Storage   chest/\<uid\>/…  (private)     │ ← 서명 URL 로만 다운로드

                 │  Realtime  postgres\_changes → WebSocket │

                 │  Edge Fn   share · og-preview · push    │

                 │  pg\_cron   만료 아이템 정리              │

                 └──────────────────┬──────────────────────┘

                                    ▼

┌───────────────────────────── 꺼내기 (Egress) ────────────────────────────┐

│ 💻 PC 웹 실시간 목록 · 🖥 Tauri 클립보드 자동복사 · 🔔 Web Push             │

│ 📱 폰 PWA 복사/다른 앱으로 공유 · 🔗 1회용 링크 · QR                          │

└──────────────────────────────────────────────────────────────────────────┘

### 설계 원칙

1. **코드베이스 하나** — PWA 한 개가 PC 대시보드이자 Android 공유 앱.  
2. **서버 코드 최소화** — 권한은 RLS, 파일은 Storage, 실시간은 Realtime. 직접 짜는 서버 코드는 Edge Function 몇 개.  
3. **입구는 늘어나도 중심은 그대로** — 확장·Tauri·단축어 모두 같은 DB/함수를 쓴다.  
4. **오프라인 우선은 아니지만 오프라인 관용** — 서비스워커가 앱 셸과 마지막 목록을 캐시.

---

## 8\. 데이터 모델 (ERD)

erDiagram

    users ||--o{ chests : owns

    users ||--o{ items : creates

    users ||--o{ share\_tokens : has

    chests ||--o{ items : contains

    chests ||--o{ chest\_members : shared\_with

    users ||--o{ chest\_members : member\_of

    items ||--o{ public\_links : exposes

    chests {

        uuid id PK

        uuid owner\_id FK

        text name

        text icon

        bool is\_default

        timestamptz created\_at

    }

    items {

        uuid id PK

        uuid chest\_id FK

        uuid user\_id FK

        text kind "text | link | file"

        text title

        text content "본문 또는 URL"

        text file\_path

        text file\_name

        bigint file\_size

        text mime\_type

        jsonb preview "OG / OCR / 요약 (v2)"

        text\[\] tags

        text source "android|ios|pc|extension|shortcut"

        bool pinned

        timestamptz expires\_at "null \= 영구"

        text content\_hash "중복 감지 (v2)"

        tsvector search\_vec "전체 텍스트 검색 (v2)"

        timestamptz created\_at

    }

    share\_tokens {

        uuid id PK

        uuid user\_id FK

        text token\_hash UK "sha256(token)"

        text label

        timestamptz created\_at

        timestamptz last\_used\_at

    }

    chest\_members {

        uuid chest\_id FK

        uuid user\_id FK

        text role "viewer|contributor|admin"

    }

    public\_links {

        uuid id PK

        uuid item\_id FK

        text token\_hash UK

        timestamptz expires\_at

        int max\_views

        int view\_count

    }

**RLS 정책 요약**

| 테이블 | select | insert | update/delete |
| :---- | :---- | :---- | :---- |
| items | 본인 or 소속 상자 멤버 | 본인 or contributor 이상 | 본인 or admin |
| chests | owner or 멤버 | owner | owner |
| share\_tokens | 본인 | 본인 | 본인 |
| storage.objects (chest) | 경로 첫 폴더 \= `auth.uid()` | 동일 | 동일 |

인덱스: `items(user_id, created_at desc)`, `items(expires_at) where expires_at is not null`, `items using gin(search_vec)`.

---

## 9\. 핵심 흐름 시퀀스 다이어그램

### 9-1. Android 공유 시트 → PC 실시간 반영

sequenceDiagram

    participant U as 사용자(폰)

    participant OS as Android 공유 시트

    participant SW as Service Worker

    participant APP as PWA 앱

    participant SB as Supabase

    participant PC as PC 브라우저

    U-\>\>OS: 공유 → Ender Chest

    OS-\>\>SW: POST /share-target (multipart)

    SW-\>\>SW: formData → IndexedDB 저장

    SW--\>\>OS: 303 Redirect /?shared=1

    OS-\>\>APP: 앱 열림

    APP-\>\>SW: IndexedDB 에서 pending 꺼내기

    APP-\>\>SB: Storage.upload(file) / items.insert

    SB--\>\>APP: 200

    SB--\>\>PC: Realtime INSERT 이벤트 (WebSocket)

    PC-\>\>PC: 목록 최상단에 카드 추가

    PC-\>\>SB: createSignedUrl(file\_path)

    SB--\>\>PC: 1시간 서명 URL → 썸네일 표시

### 9-2. iOS 단축어 → Edge Function

sequenceDiagram

    participant U as 사용자(아이폰)

    participant SC as 단축어

    participant EF as Edge Fn /share

    participant DB as Postgres

    participant ST as Storage

    U-\>\>SC: 공유 → Ender Chest 단축어

    SC-\>\>EF: POST (X-Share-Token, form: text/files)

    EF-\>\>EF: sha256(token)

    EF-\>\>DB: share\_tokens where token\_hash \= ?

    DB--\>\>EF: user\_id (없으면 401\)

    EF-\>\>ST: upload chest/\<user\_id\>/\<uuid\>-name

    EF-\>\>DB: items.insert(user\_id, …)  \[service\_role\]

    EF-\>\>DB: share\_tokens.last\_used\_at \= now()

    EF--\>\>SC: 200 {ok, inserted:\[…\]}

    SC--\>\>U: 알림 "상자에 넣었어요"

### 9-3. 로그인 (매직링크)

sequenceDiagram

    participant U as 사용자

    participant APP as PWA

    participant AUTH as Supabase Auth

    U-\>\>APP: 이메일 입력

    APP-\>\>AUTH: signInWithOtp(email, redirectTo)

    AUTH--\>\>U: 로그인 링크 메일

    U-\>\>AUTH: 링크 클릭

    AUTH--\>\>APP: redirect \+ 세션 토큰(JWT)

    APP-\>\>APP: 세션 저장, Realtime 채널 구독

---

## 10\. API 명세

프론트는 Supabase 클라이언트 SDK 로 DB/Storage 에 직접 접근한다(권한은 RLS). 별도 HTTP API 는 Edge Function 만.

### 10-1. `POST /functions/v1/share` — 외부 입구 (iOS 단축어, 스크립트, 확장)

| 항목 | 내용 |
| :---- | :---- |
| 인증 | 헤더 `X-Share-Token: ec_…` (JWT 검증 끔) |
| 선택 헤더 | \`X-Source: ios |
| 본문 A | `application/json` `{ "text": "...", "title": "...", "url": "...", "expires_in": "7d" }` |
| 본문 B | `multipart/form-data` 필드 `text`, `title`, `url`, `files[]` (또는 `file`) |
| 200 | `{ "ok": true, "inserted": ["<item_id>", …] }` |
| 400 | 넣을 내용 없음 / 파일 크기 초과 / 허용되지 않는 MIME |
| 401 | 토큰 누락 또는 무효 |
| 429 | 토큰당 분당 60회 초과 |
| 500 | 업로드·삽입 실패 (메시지 포함) |

### 10-2. `POST /functions/v1/og-preview` (v2)

입력 `{ item_id }` → 해당 링크의 OG 메타를 수집해 `items.preview` 에 저장. DB 트리거(`after insert where kind='link'`)에서 `pg_net` 으로 자동 호출.

### 10-3. `GET /functions/v1/public/:token` (v2)

1회용 공개 링크. `public_links` 검증 → `view_count++` → 서명 URL 로 302\. 만료·횟수 초과 시 410\.

### 10-4. DB 함수 / 크론

- `cleanup_expired_items()` — `expires_at < now()` 인 행과 Storage 오브젝트 삭제. `pg_cron` 매시간.  
- `ensure_default_chest()` — 신규 가입 트리거로 기본 상자 생성.

---

## 11\. 기술 스택과 선택 근거

| 영역 | 선택 | 근거 | 검토한 대안 |
| :---- | :---- | :---- | :---- |
| 프론트 | React 18 \+ TypeScript \+ Vite | 생태계·자료 풍부, 빠른 HMR, strict 타입으로 실수 방지 | Svelte(더 가벼움, 자료 적음), Solid |
| 상태 | React 훅 \+ Supabase Realtime 콜백 | 규모가 작아 외부 상태 라이브러리 불필요 | Zustand, TanStack Query |
| 스타일 | CSS 변수 \+ 다크 테마 | 의존성 0, 테마 전환 쉬움 | Tailwind(커지면 도입) |
| PWA | 수동 manifest \+ sw.js | Share Target 동작 원리를 직접 학습 | vite-plugin-pwa(안정화 후 전환) |
| 백엔드 | **Supabase** | Auth·Postgres·Storage·Realtime·Edge Fn 통합, 무료 티어, 오픈소스라 셀프 호스팅 가능 | Firebase(NoSQL, 락인), PocketBase(단일 바이너리, Realtime 약함), 직접 FastAPI(운영 부담) |
| 서버리스 | Deno Edge Function (TS) | Supabase 기본, 콜드스타트 짧음 | Vercel Functions, Cloudflare Workers |
| 데스크톱 (v2) | Tauri 2 | Electron 대비 번들 \~10MB, 메모리 1/5, 트레이·글로벌 단축키·클립보드 플러그인 | Electron |
| 확장 (v2) | WebExtension MV3 | Chrome/Edge/Firefox 공통 | — |
| OCR (v2) | Tesseract.js (클라이언트) | 무료, 서버 비용 0, 한국어 모델 지원 | Google Vision(유료) |
| 배포 | GitHub → Vercel / `supabase functions deploy` | Git push \= 배포, 무료, HTTPS 자동 | Netlify, Cloudflare Pages |

---

## 12\. 보안 설계

### 12-1. 위협 모델과 대응

| 위협 | 대응 |
| :---- | :---- |
| 다른 사용자의 아이템 열람 | 모든 테이블 RLS `auth.uid() = user_id`. Storage 는 경로 첫 폴더 \= uid 정책 |
| 파일 URL 유출 | 버킷 비공개, 1시간 만료 서명 URL 만 발급 |
| 단축어 토큰 유출 | DB 에 SHA-256 해시만 저장, 발급 시 1회 표시, UI 에서 즉시 폐기, `last_used_at` 으로 이상 사용 감지 |
| service\_role 키 노출 | Edge Function 런타임 환경변수에만 존재. 프론트·저장소에 절대 포함 안 함 |
| 악성 파일 업로드 | 크기 상한 50MB, MIME 화이트리스트, 실행 파일 차단(클라이언트+서버 양쪽) |
| Edge Function 남용 | 토큰당 분당 60회 rate limit, 실패 5회 연속 시 토큰 일시 잠금 |
| XSS (텍스트 아이템에 스크립트) | React 기본 이스케이프, 링크는 `rel="noreferrer"`, `http(s)` 스킴만 허용 |
| 공개 링크 무한 열람 | 만료 시각 \+ 최대 조회수, 서버에서 카운트 |
| 세션 탈취 | Supabase JWT 단기 만료 \+ refresh, HTTPS 강제 |

### 12-2. E2EE 옵션 (v3)

클라이언트에서 비밀문구 → PBKDF2(310k) → AES-GCM 키. `content`, 파일 본문 암호화 후 업로드. 서버는 메타(크기·시간·종류)만 안다. 검색·미리보기·OG 카드는 비활성화됨을 UI 에 명시.

---

## 13\. 테스트 및 평가 계획

### 13-1. 기능 테스트 매트릭스

| 시나리오 | Android Chrome | iOS Safari(PWA) | iOS 단축어 | Windows Chrome | macOS Safari |
| :---- | :---: | :---: | :---: | :---: | :---: |
| 텍스트 넣기 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 링크 넣기 → 카드 표시 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 이미지 넣기 → 썸네일 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 50MB 파일 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 공유 시트 진입 | ☐ | n/a | ☐ | n/a | n/a |
| Ctrl/⌘+V 이미지 | n/a | n/a | n/a | ☐ | ☐ |
| 실시간 반영(다른 기기) | ☐ | ☐ | ☐ | ☐ | ☐ |
| 복사 / 공유 / 다운로드 | ☐ | ☐ | — | ☐ | ☐ |
| 오프라인 시 목록 열람 | ☐ | ☐ | — | ☐ | ☐ |

### 13-2. 보안 테스트

- 계정 A 로 로그인 후 SDK 로 계정 B 의 `item_id` 조회·삭제 시도 → 0건이어야 함.  
- 계정 A 의 서명 URL 만료 후 접근 → 400/403.  
- 잘못된 토큰·빈 토큰·폐기된 토큰으로 `/share` 호출 → 401\.  
- 60회/분 초과 → 429\.  
- `<script>` 포함 텍스트 저장 → 렌더 시 실행되지 않음.

### 13-3. 성능 측정

- **동기화 지연**: 삽입 시 `client_sent_at` 을 메타에 기록, 수신 기기에서 `Date.now() - client_sent_at` 로그. 100건 수집 후 중앙값/p95.  
- **업로드 시간**: 1MB / 10MB / 50MB 파일, Wi-Fi / LTE 각 10회.  
- **첫 로드**: Lighthouse PWA 점수 및 LCP (목표 90+ / 2초).  
- **번들 크기**: gzip 후 150KB 이하 목표.

### 13-4. 사용성 평가

- 본인 2주 실사용 일지 (하루 몇 건, 어떤 종류, 불편 메모).  
- 지인 3\~5명 대상 **SUS(System Usability Scale)** 설문 \+ "카톡 나에게 보내기 대비 편한가?" 5점 척도.  
- 태스크 기반: "이 링크를 PC 에서 열어보세요" 소요 시간 vs 카톡 나에게 보내기.

### 13-5. 자동화

- `vitest` 단위 테스트: URL 판별, 파일명 정규화, 만료 계산, 정렬.  
- Playwright E2E: 로그인 → 텍스트 넣기 → 두 번째 브라우저 컨텍스트에서 실시간 수신 확인.  
- GitHub Actions: push 시 `tsc` \+ `vitest` \+ `vite build`.

---

## 14\. 개발 로드맵 및 일정

gantt

    title Ender Chest v2 개발 일정 (약 6주, 주 10시간 기준)

    dateFormat  YYYY-MM-DD

    section Phase 0 준비

    Supabase 프로젝트·스키마·Auth      :p0, 2026-09-29, 2d

    Vite 스캐폴드·로그인 화면          :p0b, after p0, 1d

    section Phase 1 PC 상자

    items CRUD \+ Realtime             :p1, after p0b, 3d

    파일 업로드·서명 URL·미리보기       :p1b, after p1, 2d

    Ctrl+V·드래그&드롭                 :p1c, after p1b, 1d

    section Phase 2 폰 연결

    share\_target \+ SW \+ IndexedDB     :p2, after p1c, 3d

    GitHub·Vercel 배포                :p2b, after p2, 1d

    Edge Fn share \+ 토큰 UI \+ 단축어   :p2c, after p2b, 3d

    section Phase 3 다듬기

    검색·고정·출처·만료·pg\_cron        :p3, after p2c, 3d

    OG 미리보기·테스트·README          :p3b, after p3, 3d

    2주 실사용 및 측정                 :p3c, after p3b, 14d

    section Phase 4 v2 확장 (택)

    Web Push                          :p4, after p3b, 3d

    Tauri 트레이 앱                    :p4b, after p4, 5d

    브라우저 확장                      :p4c, after p4b, 3d

### 단계별 체크포인트

| Phase | 완료 신호 |
| :---- | :---- |
| 0 | 로그인 메일이 오고, 링크 클릭 시 빈 상자 화면이 보인다 |
| 1 | 브라우저 탭 두 개에서 한쪽에 넣으면 다른 쪽이 즉시 바뀐다 |
| 2 | **폰에서 사진 공유 → PC 화면에 1초 안에 뜬다** 🎉 |
| 3 | 일주일 실사용 후 "카톡 나에게 보내기"를 안 열게 됐다 |
| 4 | v2 기능 하나마다 GitHub 릴리즈 태그 (`v0.2`, `v0.3` …) |

### v2 우선순위 추천

① Web Push → ② Tauri 트레이(클립보드 자동복사) → ③ 브라우저 확장 → ④ 여러 상자·태그 → ⑤ 공유 상자·공개 링크 → ⑥ OCR/AI → ⑦ E2EE

---

## 15\. 배포 및 운영 (비용 0원)

### 15-1. 배포 파이프라인

git push (main) ──▶ GitHub ──▶ Vercel 자동 빌드 (tsc \+ vite build) ──▶ https://enderchest.vercel.app

                         └──▶ GitHub Actions: 타입체크 · 단위테스트 · E2E

supabase functions deploy share ──▶ Supabase Edge Runtime

supabase db push ──▶ 마이그레이션 (supabase/migrations/\*.sql)

### 15-2. 순서

1. GitHub 저장소 생성, push (`.env` 는 `.gitignore`).  
2. Vercel → Import → 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Deploy.  
3. Supabase Auth → URL Configuration 에 Vercel 주소(Site URL, Redirect) 등록.  
4. `supabase link` → `supabase functions deploy share --no-verify-jwt`.  
5. 폰에서 주소 열고 홈 화면에 추가. iOS 는 단축어 제작.  
6. (선택) 도메인 구매 후 Vercel 에 연결. 기존 `.vercel.app` 주소도 유지됨.

### 15-3. 무료 한도와 모니터링

| 서비스 | 무료 한도 (2026-09 기준, 변동 가능) | 초과 시 |
| :---- | :---- | :---- |
| Supabase Free | 프로젝트 2개, DB 500MB, Storage 1GB, 전송 5GB/월, 7일 미접속 시 일시정지 | 대시보드 경고 메일 → Pro \$25/월 |
| Vercel Hobby | 전송 100GB/월, 비상업 용도 | 배포 일시 중단 경고 |
| GitHub | 공개·비공개 저장소 무료, Actions 2,000분/월 | — |

자동 만료(기본 7일) 를 켜두면 개인 사용에서 1GB 를 넘길 가능성은 거의 없다. Supabase 대시보드 Usage 탭을 월 1회 확인.

---

## 16\. 위험 요소와 대응

| 위험 | 가능성 | 영향 | 대응 |
| :---- | :---: | :---: | :---- |
| iOS 가 PWA Share Target 을 지원하지 않음 | 확정 | 중 | 단축어 \+ Edge Function 우회 (설계에 반영). iOS 지원 시 즉시 전환 가능 |
| Android 브라우저별 share\_target 파일 수신 차이 | 중 | 중 | Chrome 우선, Samsung Internet 테스트. 실패 시 텍스트만 폴백 |
| Supabase 무료 프로젝트 7일 미접속 정지 | 저 | 저 | 매일 쓰는 앱. 추가로 GitHub Actions 크론으로 주 1회 헬스체크 핑 |
| Realtime 연결 끊김(모바일 백그라운드) | 중 | 중 | `visibilitychange` 시 재구독 \+ 전체 재조회, 낙관적 UI |
| 서명 URL 1시간 만료로 오래 열어둔 탭에서 썸네일 깨짐 | 중 | 저 | 이미지 onError 시 URL 재발급 |
| 무료 티어 정책 변경 | 저 | 중 | Supabase 오픈소스 → 셀프 호스팅 이관 경로 확보(NFR-09) |
| 범위 확장으로 v1 미완성 | 중 | 고 | v1 DoD 를 먼저 100% 채운 뒤 v2 착수. 기능 추가는 릴리즈 단위로 |
| 학기 중 시간 부족 | 중 | 중 | Phase 별 2\~3일 단위, 각 Phase 가 독립적으로 데모 가능하게 설계 |

---

## 17\. 학습 성과 (이 프로젝트로 배우는 것)

| 영역 | 구체적으로 |
| :---- | :---- |
| 웹 표준 / PWA | manifest, Service Worker 생명주기, **Web Share Target API**, IndexedDB, Web Share API, Clipboard API, Drag\&Drop |
| 실시간 시스템 | Postgres 변경 스트림을 WebSocket 으로 받아 UI 상태에 반영. 중복·순서·재연결 처리, 낙관적 업데이트 |
| 인증·권한 | 매직링크(OTP), JWT 세션, **Row Level Security** 로 서버 코드 없이 데이터 격리, 개인 API 토큰 설계(해시 저장) |
| 파일 처리 | 오브젝트 스토리지, 서명 URL, MIME/크기 검증, 경로 기반 권한 |
| 서버리스 | Deno Edge Function, CORS, rate limiting, pg\_cron / pg\_net |
| 데이터베이스 | 스키마 설계, 인덱스, tsvector 검색, 트리거 |
| 배포·운영 | Git 기반 CI/CD, 환경변수 분리, HTTPS 의 필요성 체감, 무료 티어 운영 |
| 소프트웨어 공학 | 요구사항 명세, 위협 모델링, 테스트 매트릭스, KPI 기반 평가, 사용성 평가(SUS) |
| (v2) | Tauri 네이티브 데스크톱, WebExtension MV3, Web Push(VAPID), OCR, WebCrypto E2EE |

---

## 18\. 발표 구성안 및 예상 질문

### 18-1. 발표 흐름 (10\~12분)

| 순서 | 내용 | 시간 |
| :---- | :---- | :---- |
| 1 | **훅**: "여러분 카톡 나에게 보내기 쓰시죠?" — 손 들게 하기 | 1분 |
| 2 | 문제: 왜 불편한가, 기존 솔루션 비교표 | 2분 |
| 3 | 해결: 엔더 상자 비유 → 아키텍처 한 장 | 2분 |
| 4 | **라이브 데모**: 폰에서 사진 공유 → 스크린의 PC 화면에 1초 만에 등장 | 2분 |
| 5 | 기술 포인트 3개: Share Target \+ SW / RLS 로 서버 없는 권한 / Realtime | 2분 |
| 6 | 측정 결과: 동기화 지연 p95, SUS 점수, 2주 사용 통계 | 1분 |
| 7 | 회고와 다음 단계 (v2 로드맵) | 1분 |
| 8 | Q\&A | — |

데모 백업: 네트워크 문제 대비 **녹화 영상** 준비. 폰 화면 미러링(scrcpy / QuickTime) 으로 두 화면을 동시에.

### 18-2. 예상 질문과 답변 준비

| 질문 | 답변 요지 |
| :---- | :---- |
| 카톡 나에게 보내기랑 뭐가 다르죠? | 채팅 로그 vs 검색·만료·고정되는 저장소. OS 무관. 내 서버. 2장 비교표 |
| 서버가 없다면서 어떻게 권한 관리를? | Postgres RLS. 모든 쿼리에 `auth.uid()` 조건이 DB 레벨에서 강제됨. 시연: 다른 계정 데이터 조회 → 0건 |
| iOS 는 왜 단축어인가? | Safari 가 Web Share Target 미지원. 단축어 → Edge Function 이 사실상 네이티브 Share Extension 역할. iOS 가 지원하면 코드 변경 없이 전환 |
| 보안은? 토큰 유출되면? | 해시 저장, 즉시 폐기, rate limit, last\_used 감시. 파일은 비공개 \+ 1시간 URL |
| 확장성은? 사용자가 만 명이면? | Supabase Pro 로 수직 확장, Realtime 은 채널당 필터. 개인 도구가 목표라 멀티테넌시는 RLS 로 이미 확보 |
| 왜 Firebase 아니고 Supabase? | 관계형 \+ RLS \+ 오픈소스(셀프 호스팅) \+ Realtime 이 Postgres 네이티브 |
| 오프라인은? | 앱 셸·마지막 목록 캐시로 열람 가능. 넣기는 온라인 필요(v2: 큐잉) |
| 실제로 쓰나요? | 2주 사용 일지 수치 제시 (K6) |
| 가장 어려웠던 점? | Service Worker 에서 multipart POST 를 받아 IndexedDB 에 File 을 저장하고 앱으로 넘기는 흐름 디버깅 / Realtime 재연결 |

---

## 19\. 참고 자료

- MDN — Web app manifest `share_target`: [https://developer.mozilla.org/docs/Web/Manifest/share\_target](https://developer.mozilla.org/docs/Web/Manifest/share_target)  
- web.dev — Receiving shared data with the Web Share Target API: [https://web.dev/articles/web-share-target](https://web.dev/articles/web-share-target)  
- MDN — Web Share API: [https://developer.mozilla.org/docs/Web/API/Navigator/share](https://developer.mozilla.org/docs/Web/API/Navigator/share)  
- Supabase Docs — Realtime Postgres Changes: [https://supabase.com/docs/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes)  
- Supabase Docs — Row Level Security: [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)  
- Supabase Docs — Storage Access Control: [https://supabase.com/docs/guides/storage/security/access-control](https://supabase.com/docs/guides/storage/security/access-control)  
- Supabase Docs — Edge Functions: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)  
- Supabase Docs — pg\_cron: [https://supabase.com/docs/guides/database/extensions/pg\_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)  
- Tauri 2: [https://tauri.app](https://tauri.app)  
- Chrome for Developers — Extensions MV3: [https://developer.chrome.com/docs/extensions](https://developer.chrome.com/docs/extensions)  
- Tesseract.js: [https://tesseract.projectnaptha.com](https://tesseract.projectnaptha.com)  
- Brooke, J. (1996). *SUS: A quick and dirty usability scale.*  
- Apple 단축어 사용 설명서 — "URL의 콘텐츠 가져오기" 동작

---

## 20\. 부록 — 첫 커밋 전 체크리스트

**스스로 답해볼 질문**

1. 상자를 열었을 때 **첫 화면에 무엇이 보여야** 가장 빨리 꺼낼 수 있나? (최근 1개 크게? 목록?)  
2. 폰에서 "넣기"까지 **몇 번 탭**인가? 3번을 넘으면 카톡보다 불편하다.  
3. 자동 만료 기본값 — 7일인가 영구인가? 일주일 실제 사용 패턴을 보고 정하기.  
4. 공유 상자·E2EE 같은 큰 기능은 정말 내가 쓸 것인가, 만들어보고 싶은 것인가? (둘 다 좋지만 구분하자.)  
5. 발표에서 보여줄 **한 장면**은 무엇인가? 그 장면이 가장 잘 나오도록 UI 를 다듬자.

**저장소 초기 구성**

enderchest/

├── README.md                 \# 셋업 30분 가이드

├── docs/

│   ├── PLAN.md               \# 이 문서

│   ├── ADR/                  \# 아키텍처 결정 기록 (예: 001-supabase.md)

│   └── measurements/         \# 성능·사용성 측정 데이터

├── src/                      \# PWA

├── public/                   \# manifest, sw.js, icons

├── supabase/

│   ├── migrations/           \# 스키마 버전 관리

│   └── functions/share/

├── e2e/                      \# Playwright

└── .github/workflows/ci.yml

**커밋 전**

- [ ] `.env` 가 `.gitignore` 에 있다  
- [ ] `service_role` 키가 코드 어디에도 없다 (`grep -r service_role`)  
- [ ] README 만 보고 다른 사람이 실행할 수 있다  
- [ ] 첫 이슈 3개 등록: Phase 0 / Phase 1 / Phase 2