# 📦 Ender Chest

어디서 열어도 같은 내용물이 보이는 나만의 상자. 폰에서 넣으면 PC 에서 바로 꺼내고, PC 에서 넣으면 폰에서 바로 꺼낸다.
메신저 "나에게 보내기" 의 대체재. PWA + Supabase, 운영 비용 0원.

- 텍스트 · 링크 · 파일(≤50MB) 저장, 모든 기기 실시간 반영
- PC: 입력창, **Ctrl+V**(텍스트·이미지), **드래그&드롭**, 파일 선택
- 아이폰: 공유 시트 → 단축어 → 상자 (아래 "iOS 단축어")
- 복사 · 다운로드 · 다른 앱으로 공유 · 고정 · 검색(`/`) · 종류 필터(텍스트·링크·이미지·파일) · 만료(1h/1d/7d/영구)
- 화면 기준은 `DESIGN.md`(색·글꼴·구성), 제품 기준은 `PRODUCT.md`. 화면을 고칠 때 먼저 읽는다.
- 데이터는 내 Supabase 프로젝트에만. RLS 로 본인 데이터만 접근.

기획서: `docs/PLAN.md` · 구현 스펙: `docs/superpowers/specs/`

## 셋업 (30분)

### 1. Supabase

1. https://supabase.com 에서 프로젝트 생성 (Region: Seoul 권장).
2. SQL Editor 에서 `supabase/migrations/0001_init.sql`, `0002_storage.sql` 을 순서대로 실행.
3. Authentication → Sign In / Providers: 상단 **"Allow new users to sign up" ON** 확인. Email 항목의 **Enable Email provider ON**, 개인용이면 **Confirm email OFF** 권장. (토글 하나를 끄다가 옆 토글까지 꺼지는 실수가 잦다.)
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
- 설정(상단 오른쪽 아이콘)에서 기기 이름을 정하면 각 항목에 출처로 표시된다.

### 5. Edge Function 배포

함수는 두 개다. `share` 는 아이폰 단축어가 넣을 때, `preview` 는 링크의 페이지 제목을 가져올 때 쓴다. Supabase 대시보드 → Account → Access Tokens 에서 개인 토큰을 만든 뒤:

```bash
SUPABASE_ACCESS_TOKEN=<개인 토큰> npx supabase functions deploy share --no-verify-jwt --project-ref <프로젝트 ref>
SUPABASE_ACCESS_TOKEN=<개인 토큰> npx supabase functions deploy preview --project-ref <프로젝트 ref>
```

`share` 는 자체 토큰(`X-Share-Token`)으로 인증하므로 JWT 검증을 끄고, `preview` 는 로그인한 사용자만 부르므로 켠 채로 배포한다. 개인 토큰은 저장소·문서에 넣지 않는다. `supabase/functions/_shared/` 와 `share/rules.ts` 를 고치면 두 함수 모두 다시 배포한다.

## iOS 단축어 (아이폰에서 넣기)

iOS Safari 는 PWA 공유 대상을 지원하지 않아 단축어가 공유 시트 역할을 한다.

### 준비
1. 앱 설정(상단 오른쪽 아이콘) → "새 토큰" → `ec_...` 복사 (한 번만 표시된다).
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
4. **알림 표시**: 본문에 "URL의 콘텐츠 가져오기" 결과의 `summary` 값을 넣는다 (결과 변수 → "사전 값 가져오기" → 키 `summary`). 성공하면 "링크 1개 넣었어요" 처럼 뜬다.
5. 공유 시트에서 사용: Safari 공유 → Ender Chest.

### 단축어 B: 사진·파일 보내기
1. 새 단축어 "Ender Chest 파일". 공유 시트 받을 유형: 이미지, 파일, PDF, 미디어.
2. **URL의 콘텐츠 가져오기**
   - 방법 POST, 헤더 동일
   - 요청 본문: **양식(Form)**
     - 필드 `file`, 유형 **파일**, 값 `단축어 입력`
3. 사진 앱 → 공유 → Ender Chest 파일. 여러 장을 선택하면 각각 업로드된다.

### 확인
PC 화면에 출처 `iPhone` 항목이 1~2초 안에 뜬다. 안 되면: 토큰 오타(공백 포함 여부), 함수 주소의 프로젝트 ref, 단축어의 "공유 시트에서 받기" 유형을 확인.
응답 본문이 `{"ok":false,"error":"..."}` 면 그 메시지가 원인이다. 단축어 마지막에 "결과 보기" 동작을 넣으면 응답을 볼 수 있고, 알림에 `error` 키를 같은 방식으로 표시하면 실패 이유가 폰에 바로 뜬다.

### 뒷면 탭·자동화로 "클립보드 → 상자"
단축어 A 를 복제해 입력을 "클립보드" 로 바꾸면(동작: 클립보드 가져오기 → URL의 콘텐츠 가져오기의 `text` 에 연결) 공유 시트 없이도 넣을 수 있다. 설정 → 손쉬운 사용 → 터치 → 뒷면 탭에 이 단축어를 걸어 두면 폰 뒷면을 두 번 두드려 클립보드 내용이 상자로 간다.

### 폰에서 꺼내기
- 텍스트·링크: 항목의 복사 버튼. 링크는 새 탭에서 열기.
- 이미지: 복사 버튼은 iOS 에서도 동작한다(사진 앱에 붙여넣기 가능). 저장하려면 썸네일을 길게 눌러 "이미지 저장".
- 파일: 다운로드 버튼 → Safari 다운로드 → 파일 앱. 홈 화면 PWA 에서 다운로드가 막히면 Safari 로 열어서 받는다.
- 입력창 아래 "붙여넣기" 버튼은 폰에서 클립보드의 텍스트·이미지를 바로 넣는다 (처음 한 번 허용 확인이 뜬다).

### 만료 지정
JSON 본문에 `"expires_in": "1h" | "1d" | "7d" | "never"` 를 추가할 수 있다. 없으면 7일.

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
