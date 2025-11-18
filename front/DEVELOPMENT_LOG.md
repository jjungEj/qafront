# QA 파일 관리 시스템 개발 로그

## 📅 작업 일자
2024년 (오늘)

---

## 📋 작업 개요

QA 파일 관리 시스템의 프론트엔드를 구현하고 개선했습니다. 엑셀 파일 업로드, HTML 변환, 테이블 편집, JSONL/HTML 다운로드 기능을 포함합니다.

---

## 🔧 주요 수정 사항

### 1. QA 파일 관리 API 구현

#### 1.1 API 함수 추가 (`src/utils/api.js`)

**추가된 함수들:**
```javascript
// 파일 업로드 및 저장
export const uploadQaFile = (file, config = {}) => {
  // FormData를 사용하여 multipart/form-data로 전송
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/qa/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// 파일 목록 조회
export const getQaFiles = () => api.get('/qa/files');

// 파일 상세 조회
export const getQaFileDetail = (id) => api.get(`/qa/files/${id}`);

// 피드백 저장
export const saveQaFileFeedback = (id, feedback) => 
  api.put(`/qa/files/${id}/feedback`, { feedback });

// JSONL 변환
export const convertQaFileToJsonl = (data) => 
  api.post('/qa/convert/jsonl', data, { responseType: 'blob' });
```

**주석 처리 필요 부분:**
- 각 함수의 파라미터 설명
- 반환값 타입 및 형식
- 에러 처리 방법

---

### 2. QA 페이지 재작성 (`src/pages/QA.js`)

#### 2.1 주요 변경사항

**이전:**
- 모달로 파일 상세 표시
- 복잡한 상태 관리

**변경 후:**
- 라우팅을 통한 페이지 전환 (`/qa/files/:id`)
- 간단한 파일 목록 표시
- "전체 보기" 버튼으로 상세 페이지 이동

**주요 코드:**
```javascript
const handleOpenDetail = (fileId) => {
  // 같은 화면에서 상세 페이지로 이동
  navigate(`/qa/files/${fileId}`);
};
```

**주석 처리 필요 부분:**
- 라우팅 구조 설명
- 파일 목록 조회 로직
- 에러 처리 방법

---

### 3. QA 상세 페이지 구현 (`src/pages/QADetail.js`)

#### 3.1 파일 정보 표시

**변경사항:**
- 각 정보를 한 줄씩 표시 → 한 줄에 모든 정보 표시

**코드:**
```javascript
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
  <div>파일명: {file.fileName}</div>
  <div>크기: {formatFileSize(file.fileSize)}</div>
  <div>타입: {file.fileType?.toUpperCase()}</div>
  <div>업로드: {formatDateTime(file.uploadedAt)}</div>
  {file.updatedAt && <div>수정: {formatDateTime(file.updatedAt)}</div>}
</div>
```

**주석 처리 필요 부분:**
- 파일 정보 포맷팅 로직
- 조건부 렌더링 설명

---

#### 3.2 HTML 테이블 편집 기능

**구현된 기능:**
1. 편집 모드 토글
2. 셀 선택 (드래그)
3. 셀 병합
4. Undo/Redo

**셀 선택 로직:**
```javascript
// 셀 선택 시작
const handleCellMouseDown = useCallback((e, sheetIndex, rowIndex, colIndex) => {
  if (!isEditing) return;
  e.preventDefault();
  setIsSelecting(true);
  setSelectedCells([{ sheetIndex, rowIndex, colIndex }]);
  
  // 선택된 셀로 자동 스크롤
  const cell = e.target;
  if (cell && cell.scrollIntoView) {
    cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}, [isEditing]);
```

**주석 처리 필요 부분:**
- 셀 선택 알고리즘
- 자동 스크롤 로직
- 이벤트 리스너 등록/해제

---

#### 3.3 셀 병합 기능

**구현 방식:**
- `rowspan`/`colspan` 사용
- 원본 데이터는 `data-merged-cells` 속성에 JSON으로 저장
- 병합된 셀은 DOM에서 제거

**코드 흐름:**
```javascript
// 1. 선택된 셀들을 정렬
const sortedCells = [...selectedCells].sort((a, b) => {
  if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
  return a.colIndex - b.colIndex;
});

// 2. 원본 데이터 수집
const mergedCellData = [];
for (let i = 1; i < sortedCells.length; i++) {
  // 원본 내용 저장
  mergedCellData.push({ rowIndex, colIndex, originalContent });
}

// 3. 병합된 셀 제거 (역순으로)
const cellsToRemove = [];
for (let i = sortedCells.length - 1; i > 0; i--) {
  cellsToRemove.push(cellElement);
}
cellsToRemove.forEach(cellElement => cellElement.remove());

// 4. 첫 번째 셀에 rowspan/colspan 설정
firstCellElement.setAttribute('rowspan', rowSpan);
firstCellElement.setAttribute('colspan', colSpan);
firstCellElement.setAttribute('data-merged-cells', JSON.stringify(mergedCellData));
```

**주석 처리 필요 부분:**
- 셀 병합 알고리즘
- 원본 데이터 보존 방법
- 역순 제거가 필요한 이유

---

#### 3.4 Undo/Redo 기능

**구현 방식:**
- 히스토리 배열에 상태 저장
- 현재 히스토리 인덱스 관리
- Deep copy로 상태 보존

**코드:**
```javascript
// 히스토리에 상태 저장
const saveToHistory = (newSheets) => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(newSheets))); // deep copy
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
};

// Undo
const handleUndo = useCallback(() => {
  if (historyIndex > 0) {
    const prevIndex = historyIndex - 1;
    setHistoryIndex(prevIndex);
    setEditedSheets(JSON.parse(JSON.stringify(history[prevIndex])));
  }
}, [historyIndex, history]);
```

**주석 처리 필요 부분:**
- 히스토리 관리 알고리즘
- Deep copy가 필요한 이유
- Redo 시 히스토리 분기 처리

---

#### 3.5 이미지 변환 및 JSONL 다운로드

**구현 방식:**
- html2canvas로 HTML 테이블을 이미지로 변환
- base64 인코딩하여 JSONL에 포함
- 각 시트별로 순차 변환

**코드:**
```javascript
const convertTableToImage = async (htmlContent, sheetName, sheetIndex) => {
  // 임시 DOM 요소 생성 (화면 밖에 배치)
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);
  
  // DOM 렌더링 대기
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const tableElement = tempDiv.querySelector('table');
  const canvas = await html2canvas(tableElement, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imageBase64 = canvas.toDataURL('image/png');
  document.body.removeChild(tempDiv);
  return imageBase64.split(',')[1]; // base64 부분만 추출
};
```

**주석 처리 필요 부분:**
- 임시 DOM 요소 생성 이유
- 렌더링 대기 시간 설정 이유
- base64 인코딩 과정

---

#### 3.6 HTML 다운로드 기능

**구현 방식:**
- 모든 시트를 하나의 HTML 파일로 통합
- 각 시트는 섹션으로 구분
- 기본 스타일 포함

**코드:**
```javascript
const sheetsHtml = editedSheets.map((sheet, index) => {
  return `
    <div class="sheet-section">
        <h2>${sheet.sheetName || `Sheet${index + 1}`}</h2>
        ${sheet.htmlContent}
    </div>`;
}).join('');
```

**주석 처리 필요 부분:**
- HTML 구조 설명
- 스타일 포함 이유
- 인쇄 지원 설명

---

### 4. 스타일 개선 (`src/pages/QADetail.css`)

#### 4.1 버튼 색상 변경

**변경사항:**
- Primary 버튼: `#3b82f6` → `#34495e` (sidebar와 유사한 어두운 색)
- Secondary 버튼: 흰색 배경 → `#34495e` 배경

**코드:**
```css
.btn-primary {
  background: #34495e; /* sidebar 색상과 유사 */
  color: white;
}

.btn-secondary {
  background: #34495e;
  color: #ecf0f1;
  border: 1px solid #2c3e50;
}
```

**주석 처리 필요 부분:**
- 색상 선택 이유
- 접근성 고려사항

---

### 5. 네트워크 접근 설정

#### 5.1 package.json 수정

**추가된 스크립트:**
```json
"start:network": "set HOST=0.0.0.0 && react-scripts start"
```

**주석 처리 필요 부분:**
- HOST=0.0.0.0 설정 이유
- 네트워크 접근 방법

---

## 🐛 발생한 오류 및 해결 방안

### 오류 1: 셀 병합 시 빈 칸이 생김

**문제:**
- 셀 병합 후 원본 테이블 구조가 변경되어 빈 칸이 생김
- `rowspan`/`colspan` 사용 시 테이블 레이아웃이 깨짐

**원인:**
- 병합된 셀을 제거하지 않아 빈 칸이 남음
- 셀 제거 순서가 잘못됨

**해결 방안:**
1. 병합된 셀들을 역순으로 수집
2. `rowspan`/`colspan` 설정 전에 셀 제거
3. 원본 데이터는 `data-merged-cells` 속성에 JSON으로 저장

**코드:**
```javascript
// 역순으로 셀 제거 (인덱스 문제 방지)
const cellsToRemove = [];
for (let i = sortedCells.length - 1; i > 0; i--) {
  const cell = sortedCells[i];
  const row = table.rows[cell.rowIndex];
  if (row) {
    const cellElement = row.cells[cell.colIndex];
    if (cellElement && cellElement !== firstCellElement) {
      cellsToRemove.push(cellElement);
    }
  }
}

// 셀 제거
cellsToRemove.forEach(cellElement => {
  cellElement.remove();
});

// 그 다음 rowspan/colspan 설정
firstCellElement.setAttribute('rowspan', rowSpan);
firstCellElement.setAttribute('colspan', colSpan);
```

---

### 오류 2: 여러 시트 중 첫 번째 시트만 이미지 변환됨

**문제:**
- 2개 이상의 시트가 있을 때 첫 번째 시트만 base64 인코딩됨
- 다른 시트는 빈 문자열로 전송됨

**원인:**
- 활성화된 시트만 DOM에 렌더링됨
- `tableRefs.current[sheetName]`이 활성화되지 않은 시트에 대해 null 반환

**해결 방안:**
1. 각 시트의 HTML을 임시 DOM 요소로 생성
2. 화면 밖에 배치하여 사용자에게 보이지 않게 처리
3. html2canvas로 변환 후 임시 요소 제거
4. 순차적으로 변환하여 DOM 충돌 방지

**코드:**
```javascript
const convertTableToImage = async (htmlContent, sheetName, sheetIndex) => {
  // 임시 DOM 요소 생성 (화면 밖에 배치)
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0px';
  tempDiv.style.width = '100%';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);
  
  // DOM 렌더링 대기
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const tableElement = tempDiv.querySelector('table');
  const canvas = await html2canvas(tableElement, {
    backgroundColor: '#ffffff',
    scale: 2,
    width: tableElement.scrollWidth,
    height: tableElement.scrollHeight,
  });

  const imageBase64 = canvas.toDataURL('image/png');
  document.body.removeChild(tempDiv);
  return imageBase64.split(',')[1];
};
```

---

### 오류 3: 큰 테이블에서 셀 선택 시 스크롤 문제

**문제:**
- 테이블이 화면보다 클 때 셀 선택/드래그 시 스크롤이 되지 않음
- 선택하려는 셀이 화면 밖에 있어 접근 불가

**해결 방안:**
1. 셀 선택 시 자동 스크롤 기능 추가
2. Shift + 마우스 휠로 가로 스크롤 지원
3. 테이블 컨테이너에 `overflow: auto` 설정

**코드:**
```javascript
// 셀 선택 시 자동 스크롤
const handleCellMouseDown = useCallback((e, sheetIndex, rowIndex, colIndex) => {
  // ...
  const cell = e.target;
  if (cell && cell.scrollIntoView) {
    cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}, [isEditing]);

// 가로 스크롤 지원
<div onWheel={(e) => {
  if (e.shiftKey && e.deltaY !== 0) {
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  }
}}>
```

---

## 📊 시스템 흐름도

### 1. 파일 업로드 흐름

```
사용자
  ↓
파일 선택 (LocalFileUploader)
  ↓
FormData 생성
  ↓
POST /api/qa/upload
  ↓
백엔드: 엑셀 파싱 → HTML 변환 → DB 저장
  ↓
응답: 파일 정보 + 시트 정보
  ↓
파일 목록 새로고침
  ↓
화면에 새 파일 표시
```

**주석 처리 필요 부분:**
- 각 단계별 에러 처리
- 파일 검증 로직
- 업로드 진행률 표시 (향후 개선)

---

### 2. 파일 상세 조회 흐름

```
사용자 클릭 "전체 보기"
  ↓
navigate('/qa/files/:id')
  ↓
QADetail 컴포넌트 마운트
  ↓
useEffect → fetchFileDetail()
  ↓
GET /api/qa/files/:id
  ↓
응답: 파일 정보 + 시트별 HTML
  ↓
상태 업데이트 (file, editedSheets, history)
  ↓
화면 렌더링
```

**주석 처리 필요 부분:**
- 라우팅 구조
- 상태 초기화 로직
- 에러 처리 및 리다이렉트

---

### 3. 셀 병합 흐름

```
편집 모드 활성화
  ↓
셀 선택 (드래그)
  ↓
selectedCells 상태 업데이트
  ↓
"선택한 셀 병합" 버튼 클릭
  ↓
handleMergeCells() 실행
  ↓
1. 선택된 셀 정렬
2. 원본 데이터 수집
3. 병합된 셀 제거 (역순)
4. rowspan/colspan 설정
5. 히스토리에 저장
  ↓
화면 업데이트
```

**주석 처리 필요 부분:**
- 셀 선택 알고리즘
- 병합 로직 상세 설명
- 히스토리 저장 시점

---

### 4. JSONL 변환 흐름

```
"JSONL 변환" 버튼 클릭
  ↓
handleConvertToJsonl() 실행
  ↓
각 시트별로 순차 처리:
  ├─ convertTableToImage() 호출
  ├─ 임시 DOM 요소 생성
  ├─ html2canvas로 이미지 변환
  ├─ base64 인코딩
  └─ 임시 요소 제거
  ↓
모든 시트 변환 완료
  ↓
POST /api/qa/convert/jsonl
  ↓
백엔드: JSONL 파일 생성
  ↓
Blob 다운로드
```

**주석 처리 필요 부분:**
- 순차 처리가 필요한 이유
- 임시 DOM 요소 생성 이유
- base64 인코딩 과정

---

## 💡 코드 주석 처리 가이드

### 1. API 함수 주석 (`src/utils/api.js`)

```javascript
/**
 * QA 파일 업로드 및 저장
 * @param {File} file - 업로드할 엑셀 파일 (xlsx, xls, csv)
 * @param {Object} config - 추가 설정 옵션
 * @returns {Promise<AxiosResponse>} 업로드된 파일 정보
 * @throws {Error} 파일이 없거나 지원하지 않는 형식인 경우
 * 
 * @example
 * const file = document.querySelector('input[type="file"]').files[0];
 * const response = await uploadQaFile(file);
 * console.log(response.data); // { id, fileName, sheets, ... }
 */
export const uploadQaFile = (file, config = {}) => {
  // ...
};

/**
 * 파일 목록 조회
 * @returns {Promise<AxiosResponse>} 파일 목록 배열 (업로드 시간 내림차순)
 * 
 * @example
 * const response = await getQaFiles();
 * const files = response.data; // [{ id, fileName, fileSize, ... }, ...]
 */
export const getQaFiles = () => api.get('/qa/files');
```

---

### 2. 컴포넌트 주석 (`src/pages/QADetail.js`)

```javascript
/**
 * QA 파일 상세 페이지 컴포넌트
 * 
 * 주요 기능:
 * - 파일 정보 표시
 * - HTML 테이블 편집 (셀 선택, 병합)
 * - Undo/Redo 기능
 * - 피드백 저장
 * - JSONL/HTML 다운로드
 * 
 * 상태 관리:
 * - file: 현재 파일 정보
 * - editedSheets: 편집된 시트 데이터
 * - history: Undo/Redo를 위한 히스토리
 * - selectedCells: 선택된 셀 목록
 */
const QADetail = () => {
  // ...
};

/**
 * 셀 병합 처리
 * 
 * 알고리즘:
 * 1. 선택된 셀들을 행/열 순서로 정렬
 * 2. 첫 번째 셀의 내용에 나머지 셀 내용 합치기
 * 3. 원본 데이터를 data 속성에 저장 (복원 가능)
 * 4. 병합된 셀들을 역순으로 제거 (인덱스 문제 방지)
 * 5. 첫 번째 셀에 rowspan/colspan 설정
 * 6. 히스토리에 저장
 * 
 * @throws {Error} 선택된 셀이 2개 미만인 경우
 */
const handleMergeCells = () => {
  // ...
};
```

---

### 3. 유틸리티 함수 주석 (`src/utils/format.js`)

```javascript
/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * 
 * @param {number} bytes - 바이트 단위 크기
 * @returns {string} 포맷팅된 파일 크기 (예: "12.3 KB", "1.5 MB")
 * 
 * @example
 * formatFileSize(12345); // "12.1 KB"
 * formatFileSize(1048576); // "1.0 MB"
 */
export function formatFileSize(bytes) {
  // ...
}
```

---

## 🔍 주요 알고리즘 설명

### 1. 셀 선택 알고리즘

**목적:** 마우스 드래그로 여러 셀 선택

**알고리즘:**
1. 마우스 다운: 시작 셀 저장
2. 마우스 이동: 현재 셀과 시작 셀 사이의 모든 셀 선택
3. 마우스 업: 선택 완료

**구현:**
```javascript
// 시작 셀 저장
handleCellMouseDown → setSelectedCells([{ rowIndex, colIndex }])

// 드래그 중: 사각형 영역의 모든 셀 선택
handleCellMouseEnter → 
  startRow ~ endRow, startCol ~ endCol 범위의 모든 셀을 selectedCells에 추가

// 선택 완료
handleCellMouseUp → setIsSelecting(false)
```

**주석 처리 필요:**
- 사각형 영역 계산 로직
- 중복 셀 방지 방법

---

### 2. 히스토리 관리 알고리즘

**목적:** Undo/Redo 기능 구현

**알고리즘:**
1. 상태 변경 시 현재 히스토리 인덱스 이후의 항목 제거
2. 새 상태를 히스토리에 추가
3. 히스토리 인덱스 업데이트

**구현:**
```javascript
// 히스토리 저장
saveToHistory(newSheets) {
  // 현재 위치 이후의 히스토리 제거 (분기 처리)
  const newHistory = history.slice(0, historyIndex + 1);
  // 새 상태 추가
  newHistory.push(deepCopy(newSheets));
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
}

// Undo: 이전 상태로 이동
handleUndo() {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    setEditedSheets(history[historyIndex - 1]);
  }
}

// Redo: 다음 상태로 이동
handleRedo() {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1);
    setEditedSheets(history[historyIndex + 1]);
  }
}
```

**주석 처리 필요:**
- 히스토리 분기 처리 이유
- Deep copy가 필요한 이유
- 메모리 관리 방법

---

### 3. 이미지 변환 알고리즘

**목적:** HTML 테이블을 base64 이미지로 변환

**알고리즘:**
1. 임시 DOM 요소 생성
2. HTML 내용 삽입
3. DOM 렌더링 대기
4. html2canvas로 캡처
5. base64 인코딩
6. 임시 요소 제거

**구현:**
```javascript
// 1. 임시 요소 생성 (화면 밖에 배치)
const tempDiv = document.createElement('div');
tempDiv.style.position = 'absolute';
tempDiv.style.left = '-9999px';
tempDiv.innerHTML = htmlContent;
document.body.appendChild(tempDiv);

// 2. 렌더링 대기 (100ms)
await new Promise(resolve => setTimeout(resolve, 100));

// 3. 이미지 변환
const canvas = await html2canvas(tableElement, { scale: 2 });

// 4. base64 추출
const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

// 5. 정리
document.body.removeChild(tempDiv);
```

**주석 처리 필요:**
- 임시 요소가 필요한 이유
- 렌더링 대기 시간 설정 이유
- scale=2 설정 이유

---

## 📝 코드 개선 제안

### 1. 에러 처리 강화

**현재:**
```javascript
catch (error) {
  showNotification('에러 메시지', 'error');
}
```

**개선 제안:**
```javascript
catch (error) {
  const errorMessage = error.response?.data?.message || 
                      error.response?.data?.errors?.map(e => e.message).join(', ') ||
                      '기본 에러 메시지';
  showNotification(errorMessage, 'error');
  console.error('상세 에러:', error); // 개발 환경에서만
}
```

**주석 처리 필요:**
- 에러 처리 우선순위
- 로깅 전략

---

### 2. 로딩 상태 개선

**현재:** 간단한 "로딩 중..." 메시지

**개선 제안:**
- 진행률 표시 (파일 업로드)
- 단계별 로딩 메시지 (이미지 변환)
- 스켈레톤 UI

**주석 처리 필요:**
- 로딩 상태 관리 방법
- 사용자 경험 개선 포인트

---

### 3. 성능 최적화

**제안:**
- 큰 테이블의 경우 가상 스크롤
- 이미지 변환 시 Web Worker 사용
- 메모이제이션 적용

**주석 처리 필요:**
- 성능 병목 지점
- 최적화 전략

---

## 🚀 향후 개선 사항

### 1. 실시간 동기화 (WebSocket)

**필요 시 구현:**
- 여러 사용자가 동시에 같은 파일 편집
- 실시간 피드백 동기화
- 실시간 파일 업로드 알림

**백엔드 추가 필요:**
- WebSocket 서버 설정
- 실시간 이벤트 브로드캐스팅

---

### 2. 셀 병합 서버 저장

**현재:** 로컬에서만 작동

**개선:**
- 편집된 HTML을 서버에 저장하는 API 추가
- PUT /api/qa/files/{id}/sheets/{sheetId}/html

---

### 3. 협업 기능

**제안:**
- 사용자별 편집 영역 표시
- 편집 히스토리 추적
- 충돌 해결 메커니즘

---

## 📌 중요 참고사항

### 1. 셀 병합 제한사항

- 현재 셀 병합은 로컬에서만 작동
- 서버에 저장되지 않음
- 새로고침 시 초기화됨

### 2. 이미지 변환 제한사항

- 큰 테이블의 경우 변환 시간이 오래 걸릴 수 있음
- 메모리 사용량 증가 가능
- 브라우저 호환성 확인 필요

### 3. 네트워크 접근

- 같은 네트워크에서만 접근 가능
- 공개 접근을 원하면 포트 포워딩 또는 VPN 필요
- HTTPS 사용 권장 (프로덕션)

---

## 🔗 관련 파일 목록

### 수정된 파일
1. `src/utils/api.js` - API 함수 추가
2. `src/pages/QA.js` - 파일 목록 페이지
3. `src/pages/QADetail.js` - 파일 상세 페이지 (신규)
4. `src/pages/QADetail.css` - 상세 페이지 스타일 (신규)
5. `src/App.js` - 라우팅 추가
6. `package.json` - 네트워크 실행 스크립트 추가
7. `README.md` - 네트워크 접근 가이드 추가

### 삭제된 파일
1. `src/pages/SystemStatus.js`
2. `src/pages/LocalFiles.js`
3. `src/pages/Pipelines.js`
4. `src/pages/Results.js`
5. `src/pages/ResultDetail.js`
6. 관련 CSS 파일들
7. 사용되지 않는 컴포넌트들

---

## ✅ 테스트 체크리스트

- [x] 파일 업로드 (xlsx, xls, csv)
- [x] 파일 목록 조회
- [x] 파일 상세 조회
- [x] 피드백 저장
- [x] 셀 선택 및 병합
- [x] Undo/Redo
- [x] JSONL 변환 (이미지 포함)
- [x] HTML 다운로드
- [x] 네트워크 접근
- [ ] 여러 사용자 동시 접근 테스트
- [ ] 큰 파일 처리 테스트
- [ ] 브라우저 호환성 테스트

---

## 📚 참고 자료

- [html2canvas 문서](https://html2canvas.hertzen.com/)
- [React Router 문서](https://reactrouter.com/)
- [Axios 문서](https://axios-http.com/)

---

**작성일:** 2024년
**작성자:** 개발팀

