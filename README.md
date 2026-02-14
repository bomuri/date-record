# date-diary

날짜 중심으로 데이트 일기를 기록하는 순수 HTML/CSS/JavaScript 앱입니다.

## 기능
- **타임라인**: 날짜별 기록 카드, 검색(제목/태그/본문/장소명), 최신순 정렬
- **작성**: 날짜/제목/기분/태그/메모 + 여러 장소 코스 추가/수정/삭제/순서변경
- **주소 검색**: Nominatim(OpenStreetMap)으로 주소 검색 후 좌표 저장 (500ms 디바운스)
- **지도**: Leaflet 지도에 핀 표시 + 방문 순서 폴리라인
- **백업/복원**: JSON 내보내기, JSON 가져오기(교체)
- 데이터 저장: 브라우저 `localStorage` (`dateDiaryData` 키)

## 실행 방법 (아주 쉽게)

### 방법 1) VS Code Live Server
1. 이 폴더를 VS Code로 엽니다.
2. `index.html`에서 우클릭 → **Open with Live Server**.
3. 브라우저가 열리면 바로 사용하면 됩니다.

### 방법 2) 파이썬 로컬 서버
1. 터미널을 이 폴더에서 엽니다.
2. 아래 명령어 실행:

```bash
python3 -m http.server 8000
```

3. 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8000
```

## 파일 구성
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
