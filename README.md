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
