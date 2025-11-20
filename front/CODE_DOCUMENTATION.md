# QA WebApp 프론트엔드 코드 설명서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [프로젝트 구조](#프로젝트-구조)
3. [주요 파일 설명](#주요-파일-설명)
4. [기능별 상세 설명](#기능별-상세-설명)
5. [API 구조](#api-구조)
6. [컴포넌트 구조](#컴포넌트-구조)

---

## 프로젝트 개요

QA WebApp은 엑셀/CSV 파일과 HTML 파일을 업로드하고, HTML 테이블을 편집한 후 JSONL 형식으로 변환하여 다운로드할 수 있는 웹 애플리케이션입니다.

### 주요 기능
- ✅ 다중 파일 동시 업로드
- ✅ 파일 목록 조회 (페이징 처리)
- ✅ 파일 검색 기능
- ✅ 중복 파일 체크 및 알림
- ✅ HTML 테이블 편집 (셀 선택, 병합, Undo/Redo)
- ✅ JSONL 변환 및 다운로드
- ✅ HTML 파일 다운로드

### 기술 스택
- **React 18.2.0**: UI 라이브러리
- **React Router 6.20.0**: 라우팅
- **Axios 1.6.2**: HTTP 클라이언트
- **html2canvas 1.4.1**: HTML을 이미지로 변환

---

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── Layout.js        # 레이아웃 (사이드바 + 메인 콘텐츠)
│   ├── Sidebar.js       # 사이드바 네비게이션
│   ├── LocalFileUploader.js  # 파일 업로드 컴포넌트
│   ├── Modal.js         # 모달 다이얼로그
│   └── Notification.js   # 알림 컴포넌트
├── pages/               # 페이지 컴포넌트
│   ├── QA.js            # QA 파일 관리 페이지
│   ├── QADetail.js      # QA 파일 상세 페이지
│   └── EmptyPage.js     # 빈 페이지 (플레이스홀더)
├── utils/               # 유틸리티 함수
│   ├── api.js           # API 호출 함수
│   └── format.js        # 포맷팅 함수
├── App.js               # 메인 애플리케이션 컴포넌트
└── index.js             # 진입점
```

---

## 주요 파일 설명

### 1. `App.js`
**역할**: React Router를 사용한 라우팅 설정 및 전체 애플리케이션 구조

**주요 기능**:
- 라우트 정의 (`/qa`, `/qa/files/:id` 등)
- Layout 컴포넌트로 전체 페이지 구조 구성

**라우트 목록**:
- `/` → 시스템 상태 (EmptyPage)
- `/system-status` → 시스템 상태 (EmptyPage)
- `/local-files` → 로컬 파일 (EmptyPage)
- `/pipelines` → 파이프라인 (EmptyPage)
- `/results` → 결과 (EmptyPage)
- `/qa` → QA 파일 관리 (QA 컴포넌트)
- `/qa/files/:id` → QA 파일 상세 (QADetail 컴포넌트)

---

### 2. `components/Layout.js`
**역할**: 사이드바와 메인 콘텐츠 영역을 포함하는 레이아웃 컴포넌트

**구조**:
- 사이드바 (왼쪽): 네비게이션 메뉴
- 메인 콘텐츠 (오른쪽): 페이지별 콘텐츠

---

### 3. `components/Sidebar.js`
**역할**: 사이드바 네비게이션 메뉴

**메뉴 항목**:
- 시스템 상태
- 로컬 파일
- 파이프라인
- 결과
- QA

**기능**:
- 현재 경로에 따른 활성 메뉴 하이라이트
- React Router의 `Link` 컴포넌트 사용

---

### 4. `components/LocalFileUploader.js`
**역할**: 파일 업로드를 위한 컴포넌트

**주요 기능**:
- 단일/다중 파일 선택 지원 (`multiple` prop)
- 파일 형식 자동 감지 (엑셀/CSV, HTML)
- 업로드 중 상태 관리
- 에러 메시지 표시

**Props**:
- `onExcelUpload`: 엑셀 파일 업로드 핸들러
- `onHtmlUpload`: HTML 파일 업로드 핸들러
- `onMultipleUpload`: 다중 파일 업로드 핸들러
- `multiple`: 다중 파일 선택 여부 (기본값: false)
- `disabled`: 비활성화 여부

---

### 5. `components/Modal.js`
**역할**: 모달 다이얼로그 컴포넌트

**주요 기능**:
- 배경 클릭 시 닫기
- 크기 옵션 지원 (medium 등)
- 제목 및 내용 표시

**Props**:
- `isOpen`: 모달 열림/닫힘 상태
- `onClose`: 닫기 핸들러
- `title`: 모달 제목
- `children`: 모달 내용
- `size`: 모달 크기 (기본값: 'medium')

---

### 6. `components/Notification.js`
**역할**: 알림 메시지 표시 컴포넌트

**주요 기능**:
- 성공/에러/경고/정보 알림 표시
- 자동 사라짐 (설정 가능한 duration)
- 여러 알림 동시 표시 지원

---

### 7. `pages/QA.js`
**역할**: QA 파일 관리 페이지

**주요 기능**:
1. **파일 업로드**
   - 다중 파일 동시 업로드
   - 중복 파일 체크 및 알림

2. **파일 검색**
   - 파일명으로 검색
   - 검색 결과 페이징

3. **파일 목록 조회**
   - 페이징 처리 (10개씩)
   - 파일 정보 표시 (파일명, 크기, 타입, 피드백, 업로드 일시)

4. **파일 관리**
   - 파일 상세 보기
   - 파일 삭제

**상태 관리**:
- `files`: 현재 페이지의 파일 목록
- `pageData`: 페이징 정보 (totalElements, totalPages, hasNext, hasPrevious 등)
- `currentPage`: 현재 페이지 번호
- `searchKeyword`: 검색어
- `notifications`: 알림 목록

**주요 함수**:
- `fetchFiles(page, keyword)`: 파일 목록 조회 (검색/페이징)
- `handleMultipleUpload(files)`: 다중 파일 업로드
- `handleSearch(e)`: 검색 실행
- `handleDeleteFile(fileId, fileName)`: 파일 삭제

---

### 8. `pages/QADetail.js`
**역할**: QA 파일 상세 페이지

**주요 기능**:
1. **파일 정보 표시**
   - 파일명, 크기, 타입, 업로드 일시, 수정 일시

2. **피드백 관리**
   - 피드백 입력 및 저장

3. **HTML 테이블 편집**
   - 편집 모드 토글
   - 셀 선택 (드래그로 다중 선택)
   - 셀 병합
   - 셀 내용 편집 (더블클릭)
   - Undo/Redo (Ctrl+Z, Ctrl+Y)
   - 초기화 (원래 상태로 되돌리기)

4. **시트 관리**
   - 여러 시트가 있는 경우 탭으로 전환
   - 각 시트별로 독립적인 편집

5. **파일 다운로드**
   - JSONL 변환 (이미지 포함)
   - HTML 다운로드

**상태 관리**:
- `file`: 파일 상세 정보
- `editedSheets`: 편집된 시트 데이터
- `activeSheetIndex`: 현재 활성화된 시트 인덱스
- `isEditing`: 편집 모드 여부
- `selectedCells`: 선택된 셀 목록
- `history`: Undo/Redo를 위한 히스토리
- `historyIndex`: 현재 히스토리 인덱스

**주요 함수**:
- `fetchFileDetail()`: 파일 상세 정보 조회
- `handleSaveFeedback()`: 피드백 저장
- `handleSaveSheets()`: 편집된 시트 저장
- `handleMergeCells()`: 선택된 셀 병합
- `handleUndo()` / `handleRedo()`: Undo/Redo
- `handleConvertToJsonl()`: JSONL 변환 및 다운로드
- `handleDownloadHtml()`: HTML 다운로드

**편집 기능 상세**:
- 셀 선택: 마우스 드래그로 다중 셀 선택
- 셀 편집: 더블클릭으로 셀 내용 편집
- 셀 병합: 2개 이상의 셀 선택 후 병합 버튼 클릭
- 히스토리: 모든 편집 작업이 히스토리에 저장되어 Undo/Redo 가능

---

### 9. `utils/api.js`
**역할**: 백엔드 API 호출을 위한 유틸리티 함수

**주요 기능**:
- Axios 인스턴스 생성 및 설정
- 요청/응답 인터셉터를 통한 공통 에러 처리
- QA 파일 관리 관련 API 함수 제공

**API 함수 목록**:

#### 파일 업로드
- `uploadQaFile(file, config)`: 엑셀/CSV 파일 업로드
- `uploadQaHtmlFile(file, config)`: HTML 파일 업로드
- `uploadQaFilesMultiple(files, config)`: 다중 파일 업로드

#### 파일 조회
- `getQaFilesPaged(page, size)`: 페이징된 파일 목록 조회
- `searchQaFiles(keyword, page, size)`: 파일 검색 (페이징)
- `getQaFileDetail(id)`: 파일 상세 조회

#### 파일 관리
- `saveQaFileFeedback(id, feedback)`: 피드백 저장
- `saveQaFileSheets(id, sheets)`: 편집된 시트 저장
- `deleteQaFile(id)`: 파일 삭제
- `convertQaFileToJsonl(data)`: JSONL 변환

**에러 처리**:
- 404: 리소스를 찾을 수 없음
- 400: 검증 실패
- 409: 중복 파일
- 500+: 서버 오류

---

### 10. `utils/format.js`
**역할**: 데이터 포맷팅 유틸리티 함수

**주요 함수**:
- `formatDateTime(date)`: 날짜/시간 포맷팅
- `formatFileSize(bytes)`: 파일 크기 포맷팅

---

## 기능별 상세 설명

### 1. 다중 파일 업로드

**흐름**:
1. 사용자가 여러 파일 선택 (`multiple` 속성)
2. `LocalFileUploader` 컴포넌트에서 파일 검증
3. `uploadQaFilesMultiple` API 호출
4. 응답 처리:
   - `successFiles`: 성공적으로 업로드된 파일
   - `duplicateFiles`: 중복된 파일 (모달 표시)
   - `errorFiles`: 오류가 발생한 파일
5. 성공 시 파일 목록 새로고침

**중복 파일 처리**:
- 중복 파일이 있으면 모달로 알림 표시
- 각 중복 파일의 파일명을 리스트로 표시

---

### 2. 페이징 처리

**구현 방식**:
- 백엔드에서 페이징된 데이터 반환
- 프론트엔드에서 페이지 번호 관리
- 이전/다음 버튼으로 페이지 이동

**페이징 정보**:
- `content`: 현재 페이지의 파일 목록
- `totalElements`: 전체 파일 개수
- `totalPages`: 전체 페이지 수
- `hasNext`: 다음 페이지 존재 여부
- `hasPrevious`: 이전 페이지 존재 여부

---

### 3. 파일 검색

**구현 방식**:
- 검색어 입력 후 검색 버튼 클릭
- `searchQaFiles` API 호출
- 검색 결과도 페이징 처리
- 검색어 초기화 버튼으로 전체 목록 조회

**검색 범위**:
- 파일명에 포함된 문자열 검색

---

### 4. HTML 테이블 편집

**편집 모드**:
- "테이블 편집" 버튼으로 편집 모드 진입
- 편집 모드에서만 셀 선택/편집/병합 가능

**셀 선택**:
- 마우스 드래그로 다중 셀 선택
- 선택된 셀은 하이라이트 표시
- 2개 이상 선택 시 병합 버튼 활성화

**셀 편집**:
- 셀 더블클릭으로 편집 모드 진입
- `contenteditable` 속성으로 인라인 편집
- Enter 키로 편집 완료

**셀 병합**:
- 선택된 셀들을 하나로 병합
- 첫 번째 셀의 내용에 나머지 셀 내용 합치기
- `rowspan`, `colspan` 속성으로 병합 표시

**Undo/Redo**:
- 모든 편집 작업이 히스토리에 저장
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- 히스토리 인덱스로 상태 관리

---

### 5. JSONL 변환

**흐름**:
1. 각 시트의 HTML 테이블을 이미지로 변환 (`html2canvas`)
2. 이미지를 base64로 인코딩
3. 서버에 전송하여 JSONL 파일 생성
4. 생성된 파일 다운로드

**JSONL 형식**:
```json
{"image":"base64_encoded_image", "html":"<table>...</table>"}
```

**주의사항**:
- 시트별로 순차적으로 이미지 변환 (DOM 충돌 방지)
- 진행 상황 알림 표시

---

## API 구조

### Base URL
- 개발: `http://localhost:8080/api`
- 환경 변수: `REACT_APP_API_BASE_URL`

### 주요 엔드포인트

#### 파일 업로드
- `POST /api/qa/upload`: 단일 파일 업로드 (엑셀/CSV)
- `POST /api/qa/upload/html`: HTML 파일 업로드
- `POST /api/qa/upload/multiple`: 다중 파일 업로드

#### 파일 조회
- `GET /api/qa/files/paged?page=0&size=10`: 페이징된 파일 목록
- `GET /api/qa/files/search?keyword=검색어&page=0&size=10`: 파일 검색
- `GET /api/qa/files/{id}`: 파일 상세 조회

#### 파일 관리
- `PUT /api/qa/files/{id}/feedback`: 피드백 저장
- `PUT /api/qa/files/{id}/sheets`: 시트 저장
- `DELETE /api/qa/files/{id}`: 파일 삭제
- `POST /api/qa/convert/jsonl`: JSONL 변환

---

## 컴포넌트 구조

### 계층 구조
```
App
└── Layout
    ├── Sidebar
    └── Main Content
        ├── QA (파일 목록)
        └── QADetail (파일 상세)
            ├── LocalFileUploader
            ├── Modal (중복 파일 알림)
            └── NotificationContainer
```

### 데이터 흐름
1. **파일 업로드**: `LocalFileUploader` → `QA.js` → `api.js` → 백엔드
2. **파일 조회**: `QA.js` → `api.js` → 백엔드 → `QA.js` (상태 업데이트)
3. **파일 편집**: `QADetail.js` (로컬 상태 관리) → 저장 시 `api.js` → 백엔드

---

## 개발 가이드

### 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 네트워크 접근 가능하도록 실행
npm run start:network

# 빌드
npm run build
```

### 환경 변수
- `REACT_APP_API_BASE_URL`: API Base URL (기본값: `http://localhost:8080/api`)

### 코드 스타일
- ESLint 설정: `react-app` 확장 사용
- 파일명: PascalCase (컴포넌트), camelCase (유틸리티)
- 주석: JSDoc 스타일 사용

---

## 향후 개선 사항

1. **AI DB 연동**
   - AI DB에 파일 저장 기능 추가
   - AI DB에서 파일 조회 기능 추가

2. **추가 기능**
   - 파일 정렬 기능
   - 필터 기능
   - 일괄 삭제 기능

3. **성능 최적화**
   - 이미지 변환 최적화
   - 대용량 파일 처리 개선

---

## 작성일
- 최초 작성: 2025.11.20
- 최종 수정: 2025.11.20

