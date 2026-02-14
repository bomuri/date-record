# date-diary (Supabase 커플 공유 버전)

날짜 중심 데이트 일기를 기록하는 순수 HTML/CSS/JavaScript 앱입니다.
이 버전은 **Supabase DB**를 사용해서, **공유 계정 1개**로 두 사람이 같은 데이터를 함께 씁니다.

## 기능
- **로그인/로그아웃**: 이메일/비밀번호 인증
- **타임라인**: 날짜별 기록 카드, 검색(제목/태그/본문/장소명), 최신순 정렬
- **작성**: 날짜/제목/기분/태그/메모 + 여러 장소 코스 추가/수정/삭제/순서변경
- **주소 검색**: Nominatim(OpenStreetMap) 500ms 디바운스 검색
- **지도**: Leaflet + OSM 타일, 핀 + 방문 순서 폴리라인
- **백업/복원**: JSON 내보내기 / JSON 가져오기(교체)
- **마이그레이션**: 기존 localStorage(`dateDiaryData`) 데이터를 DB로 1회 업로드

---

## 1) Supabase 설정

### URL Configuration 등록
Supabase Dashboard → **Authentication → URL Configuration** 에 아래 값을 등록하세요.

- Site URL: `https://ggomu-bomu-date-diary.netlify.app`
- Redirect URLs: `https://ggomu-bomu-date-diary.netlify.app`

### 테이블/RLS 정책
`public.day_entries` 테이블 + RLS 정책(select/insert/update/delete, `owner_id = auth.uid()`)이 필요합니다.

현재 질문 기준으로는 이미 준비 완료 상태입니다.

### 공유 계정 운영 권장
1. 앱에서 **회원가입(최초 1회)** 로 공유 계정을 생성
2. 필요한 이메일 인증 완료
3. Supabase Dashboard에서 **Authentication > Providers (Email)** 이동
4. **Allow signups** 를 꺼서 추가 회원가입을 막기

---

## 2) Supabase 연결 정보 (app.js)

`app.js` 상단에 아래처럼 publishable(anon) 키만 사용합니다.

```js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://hqebsllluanthqdpgnoq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWJzbGxsdWFudGhxZHBnbm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzY1ODQsImV4cCI6MjA4NjYxMjU4NH0.PhESuPJ7UPEGjTbu-THsqjhIa1105GLs-o8xJZJQ_eY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

> ⚠️ 브라우저 코드에는 Secret key를 넣으면 안 됩니다.

---

## 3) 실행 방법 (빌드 도구 없음)

### 방법 1) VS Code Live Server
1. 이 폴더를 VS Code로 엽니다.
2. `index.html` 우클릭 → **Open with Live Server**.

### 방법 2) 파이썬 로컬 서버
```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속.

---

## 파일 구성
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
