import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { 
  getQaFileDetail,
  saveQaFileFeedback,
  convertQaFileToJsonl,
  saveQaFileSheets
} from '../utils/api';
import { formatDateTime, formatFileSize } from '../utils/format';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './QADetail.css';

/**
 * QA 파일 상세 페이지 컴포넌트
 * 
 * 주요 기능:
 * 1. 파일 정보 표시 (파일명, 크기, 타입, 업로드/수정 일시)
 * 2. 피드백 입력 및 저장
 * 3. HTML 테이블 편집
 *    - 셀 선택 (드래그)
 *    - 셀 병합
 *    - Undo/Redo
 * 4. 파일 다운로드
 *    - JSONL 변환 (이미지 포함)
 *    - HTML 다운로드
 * 
 * 상태 관리:
 * - file: 현재 파일 정보 (서버에서 가져온 원본 데이터)
 * - editedSheets: 편집된 시트 데이터 (로컬 상태)
 * - history: Undo/Redo를 위한 히스토리 배열
 * - historyIndex: 현재 히스토리 인덱스
 * - selectedCells: 선택된 셀 목록 [{ sheetIndex, rowIndex, colIndex }, ...]
 * - isEditing: 편집 모드 여부
 * 
 * 라우팅:
 * - 경로: /qa/files/:id
 * - 파라미터: id (파일 ID)
 */
const QADetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isSavingSheets, setIsSavingSheets] = useState(false);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSheets, setEditedSheets] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [history, setHistory] = useState([]); // undo/redo를 위한 히스토리
  const [historyIndex, setHistoryIndex] = useState(-1); // 현재 히스토리 인덱스
  const tableRefs = useRef({});

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchFileDetail = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getQaFileDetail(id);
      const fileData = response.data;
      setFile(fileData);
      setFeedback(fileData.feedback || '');
      const initialSheets = fileData.sheets || [];
      setEditedSheets(initialSheets);
      // 초기 상태를 히스토리에 저장
      setHistory([initialSheets]);
      setHistoryIndex(0);
      setActiveSheetIndex(0);
    } catch (error) {
      showNotification('파일 상세 정보를 불러오는데 실패했습니다.', 'error');
      navigate('/qa');
    } finally {
      setLoading(false);
    }
  }, [id, showNotification, navigate]);

  useEffect(() => {
    fetchFileDetail();
  }, [fetchFileDetail]);

  const handleSaveFeedback = async () => {
    if (!file) return;

    setIsSavingFeedback(true);
    try {
      const response = await saveQaFileFeedback(file.id, feedback);
      setFile(response.data);
      showNotification('피드백이 저장되었습니다.', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || '피드백 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSavingFeedback(false);
    }
  };

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

  // 셀 선택 중
  const handleCellMouseEnter = useCallback((e, sheetIndex, rowIndex, colIndex) => {
    if (!isSelecting || !isEditing) return;
    
    // 드래그 중인 셀로 자동 스크롤
    const cell = e.target;
    if (cell && cell.scrollIntoView) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    setSelectedCells(prev => {
      if (prev.length === 0) return prev;
      const startCell = prev[0];
      const newSelectedCells = [];
      const startRow = Math.min(startCell.rowIndex, rowIndex);
      const endRow = Math.max(startCell.rowIndex, rowIndex);
      const startCol = Math.min(startCell.colIndex, colIndex);
      const endCol = Math.max(startCell.colIndex, colIndex);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelectedCells.push({ sheetIndex, rowIndex: r, colIndex: c });
        }
      }

      return newSelectedCells;
    });
  }, [isSelecting, isEditing]);

  // 셀 선택 종료
  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // 편집 모드일 때 테이블에 이벤트 리스너 추가
  useEffect(() => {
    const currentSheet = editedSheets[activeSheetIndex];
    if (!isEditing || !currentSheet) return;

    const sheetContainer = document.querySelector(`[data-sheet-name="${currentSheet.sheetName}"]`);
    if (!sheetContainer) return;

    const table = sheetContainer.querySelector('table');
    if (!table) return;

    const cells = table.querySelectorAll('td, th');
    
    const mouseDownHandlers = [];
    const mouseEnterHandlers = [];
    const mouseUpHandler = () => handleCellMouseUp();

    cells.forEach((cell) => {
      const row = cell.parentElement;
      const rowIndex = Array.from(row.parentElement.children).indexOf(row);
      const colIndex = Array.from(row.children).indexOf(cell);
      
      const mouseDownHandler = (e) => {
        handleCellMouseDown(e, activeSheetIndex, rowIndex, colIndex);
      };
      
      const mouseEnterHandler = (e) => {
        handleCellMouseEnter(e, activeSheetIndex, rowIndex, colIndex);
      };

      cell.addEventListener('mousedown', mouseDownHandler);
      cell.addEventListener('mouseenter', mouseEnterHandler);
      mouseDownHandlers.push({ cell, handler: mouseDownHandler });
      mouseEnterHandlers.push({ cell, handler: mouseEnterHandler });
    });

    document.addEventListener('mouseup', mouseUpHandler);

    return () => {
      mouseDownHandlers.forEach(({ cell, handler }) => {
        cell.removeEventListener('mousedown', handler);
      });
      mouseEnterHandlers.forEach(({ cell, handler }) => {
        cell.removeEventListener('mouseenter', handler);
      });
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [isEditing, editedSheets, activeSheetIndex, handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp]);

  /**
   * 히스토리에 상태 저장
   * 
   * 알고리즘:
   * 1. 현재 히스토리 인덱스 이후의 항목 제거 (분기 처리)
   * 2. 새 상태를 deep copy하여 히스토리에 추가
   * 3. 히스토리 인덱스 업데이트
   * 
   * @param {Array} newSheets - 저장할 새 시트 데이터
   * 
   * 주의사항:
   * - Deep copy가 필요한 이유: 참조가 아닌 값 복사로 상태 독립성 보장
   * - 분기 처리: Redo 후 새로운 작업을 하면 이전 Redo 경로는 제거됨
   */
  const saveToHistory = (newSheets) => {
    // 현재 위치 이후의 히스토리 제거 (새로운 분기 생성)
    const newHistory = history.slice(0, historyIndex + 1);
    // Deep copy로 새 상태 추가 (참조가 아닌 값 복사)
    newHistory.push(JSON.parse(JSON.stringify(newSheets)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo (뒤로가기)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setEditedSheets(JSON.parse(JSON.stringify(history[prevIndex]))); // deep copy
      setSelectedCells([]);
      showNotification('이전 상태로 되돌렸습니다.', 'success');
    } else {
      showNotification('더 이상 되돌릴 수 없습니다.', 'warning');
    }
  }, [historyIndex, history, showNotification]);

  // Redo (앞으로가기)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setEditedSheets(JSON.parse(JSON.stringify(history[nextIndex]))); // deep copy
      setSelectedCells([]);
      showNotification('다음 상태로 이동했습니다.', 'success');
    } else {
      showNotification('더 이상 앞으로 갈 수 없습니다.', 'warning');
    }
  }, [historyIndex, history, showNotification]);

  /**
   * 선택된 셀 병합 처리
   * 
   * 알고리즘:
   * 1. 선택된 셀들을 행/열 순서로 정렬
   * 2. 첫 번째 셀의 내용에 나머지 셀 내용 합치기
   * 3. 원본 데이터를 data 속성에 저장 (복원 가능)
   * 4. 병합된 셀들을 역순으로 제거 (인덱스 문제 방지)
   * 5. 첫 번째 셀에 rowspan/colspan 설정
   * 6. 히스토리에 저장
   * 
   * 주의사항:
   * - 역순 제거가 필요한 이유: DOM에서 셀을 제거하면 인덱스가 변경됨
   * - 원본 데이터 보존: 나중에 병합 해제 시 복원 가능
   */
  const handleMergeCells = () => {
    if (selectedCells.length < 2) {
      showNotification('병합할 셀을 2개 이상 선택해주세요.', 'warning');
      return;
    }

    const sheetIndex = selectedCells[0].sheetIndex;
    const sheet = editedSheets[sheetIndex];
    if (!sheet) return;

    // HTML 파싱
    const parser = new DOMParser();
    const doc = parser.parseFromString(sheet.htmlContent, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) return;

    // 1. 선택된 셀들을 정렬 (행, 열 순서대로)
    // 정렬이 필요한 이유: 병합 영역을 정확히 계산하기 위해
    const sortedCells = [...selectedCells].sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.colIndex - b.colIndex;
    });

    const firstCell = sortedCells[0];
    const firstRow = table.rows[firstCell.rowIndex];
    const firstCellElement = firstRow.cells[firstCell.colIndex];

    // 2. 첫 번째 셀의 내용을 합치기
    let mergedContent = firstCellElement.innerHTML.trim();
    const mergedCellData = []; // 병합된 셀들의 원본 데이터 저장 (복원용)
    
    // 병합할 셀들의 원본 데이터 수집
    for (let i = 1; i < sortedCells.length; i++) {
      const cell = sortedCells[i];
      const row = table.rows[cell.rowIndex];
      const cellElement = row.cells[cell.colIndex];
      if (cellElement && cellElement !== firstCellElement) {
        const cellContent = cellElement.innerHTML.trim();
        if (cellContent) {
          mergedContent += (mergedContent ? ' ' : '') + cellContent;
        }
        // 원본 내용 저장 (나중에 복원 가능하도록)
        const originalContent = cellElement.innerHTML;
        mergedCellData.push({
          rowIndex: cell.rowIndex,
          colIndex: cell.colIndex,
          originalContent: originalContent
        });
      }
    }

    // 3. rowspan/colspan 계산
    const rowSpan = Math.max(...sortedCells.map(c => c.rowIndex)) - Math.min(...sortedCells.map(c => c.rowIndex)) + 1;
    const colSpan = Math.max(...sortedCells.map(c => c.colIndex)) - Math.min(...sortedCells.map(c => c.colIndex)) + 1;
    
    // 4. 병합된 셀들을 역순으로 제거
    // 역순이 필요한 이유: DOM에서 셀을 제거하면 인덱스가 변경되어 앞에서부터 제거하면 오류 발생
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
    
    // 셀 제거 실행
    cellsToRemove.forEach(cellElement => {
      cellElement.remove();
    });
    
    // 5. 첫 번째 셀에 rowspan/colspan 설정 및 병합 정보 저장
    firstCellElement.setAttribute('rowspan', rowSpan);
    firstCellElement.setAttribute('colspan', colSpan);
    firstCellElement.setAttribute('data-merge-main', 'true');
    firstCellElement.setAttribute('data-merge-rows', rowSpan);
    firstCellElement.setAttribute('data-merge-cols', colSpan);
    // 원본 데이터를 JSON으로 저장 (나중에 복원 가능)
    firstCellElement.setAttribute('data-merged-cells', JSON.stringify(mergedCellData.map(c => ({ row: c.rowIndex, col: c.colIndex, content: c.originalContent }))));
    firstCellElement.innerHTML = mergedContent;

    // 업데이트된 HTML 저장 (테이블만)
    const updatedSheets = [...editedSheets];
    updatedSheets[sheetIndex] = {
      ...sheet,
      htmlContent: table.outerHTML
    };
    
    // 히스토리에 저장
    saveToHistory(updatedSheets);
    setEditedSheets(updatedSheets);
    setSelectedCells([]);
    showNotification('셀이 병합되었습니다.', 'success');
  };

  // 편집 모드 토글
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setSelectedCells([]);
  };

  // 초기화 (원래 상태로 되돌리기)
  const handleReset = () => {
    if (!file || !window.confirm('편집 내용을 모두 취소하고 원래 상태로 되돌리시겠습니까?')) {
      return;
    }
    
    const originalSheets = file.sheets || [];
    setEditedSheets(JSON.parse(JSON.stringify(originalSheets))); // deep copy
    setHistory([JSON.parse(JSON.stringify(originalSheets))]);
    setHistoryIndex(0);
    setSelectedCells([]);
    showNotification('초기 상태로 되돌렸습니다.', 'success');
  };

  /**
   * 편집된 시트 저장
   * 수정된 HTML 내용을 서버에 저장하여 다음에 접속 시에도 유지되도록 함
   */
  const handleSaveSheets = async () => {
    if (!file || !editedSheets.length) return;

    setIsSavingSheets(true);
    try {
      // 각 시트의 id와 htmlContent를 서버에 전송
      const sheetsToSave = editedSheets.map(sheet => ({
        id: sheet.id,
        htmlContent: sheet.htmlContent
      }));

      const response = await saveQaFileSheets(file.id, sheetsToSave);
      setFile(response.data); // 업데이트된 파일 정보로 갱신
      showNotification('편집 내용이 저장되었습니다.', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || '편집 내용 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSavingSheets(false);
    }
  };

  // 키보드 단축키 (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditing) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, handleUndo, handleRedo]);

  /**
   * HTML 테이블을 이미지(base64)로 변환
   * 
   * 알고리즘:
   * 1. 임시 DOM 요소 생성 (화면 밖에 배치하여 사용자에게 보이지 않게)
   * 2. HTML 내용 삽입
   * 3. DOM 렌더링 대기 (100ms) - 브라우저가 완전히 렌더링할 시간 제공
   * 4. html2canvas로 테이블 캡처
   * 5. base64 인코딩 (data:image/png;base64,... 형식에서 base64 부분만 추출)
   * 6. 임시 요소 제거
   * 
   * @param {string} htmlContent - 변환할 HTML 내용
   * @param {string} sheetName - 시트 이름 (에러 로깅용)
   * @param {number} sheetIndex - 시트 인덱스
   * @returns {Promise<string|null>} base64 인코딩된 이미지 문자열 또는 null
   * 
   * 주의사항:
   * - 임시 요소가 필요한 이유: 활성화되지 않은 시트는 DOM에 없기 때문
   * - 렌더링 대기가 필요한 이유: html2canvas가 완전히 렌더링된 요소를 캡처해야 함
   * - scale=2: 고해상도 이미지를 위해 2배 스케일 사용
   */
  const convertTableToImage = async (htmlContent, sheetName, sheetIndex) => {
    // 임시 DOM 요소 생성 (화면 밖에 배치)
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // 화면 밖으로 이동
    tempDiv.style.top = '0px';
    tempDiv.style.width = '100%';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    // DOM 렌더링 대기 (100ms)
    // 브라우저가 HTML을 완전히 렌더링할 시간을 제공
    // 너무 짧으면 html2canvas가 빈 화면을 캡처할 수 있음
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tableElement = tempDiv.querySelector('table');
    
    if (!tableElement) {
      document.body.removeChild(tempDiv);
      console.error(`테이블 요소를 찾을 수 없습니다: ${sheetName}`);
      return null;
    }

    try {
      // html2canvas로 테이블을 이미지로 변환
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#ffffff', // 배경색 설정
        scale: 2, // 고해상도를 위해 2배 스케일
        logging: false, // 디버그 로그 비활성화
        useCORS: true, // 외부 리소스 로드 허용
        width: tableElement.scrollWidth, // 테이블 전체 너비
        height: tableElement.scrollHeight, // 테이블 전체 높이
      });

      // Canvas를 base64 문자열로 변환
      // toDataURL()은 "data:image/png;base64,..." 형식 반환
      const imageBase64 = canvas.toDataURL('image/png');
      document.body.removeChild(tempDiv); // 임시 요소 제거
      return imageBase64.split(',')[1]; // base64 부분만 추출 (앞의 "data:image/png;base64," 제거)
    } catch (error) {
      document.body.removeChild(tempDiv); // 에러 발생 시에도 임시 요소 제거
      console.error(`이미지 변환 실패 (${sheetName}):`, error);
      return null;
    }
  };

  // HTML 파일 다운로드
  const handleDownloadHtml = () => {
    if (!file || !editedSheets.length) return;

    try {
      // 모든 시트를 하나의 HTML 파일로 생성
      const sheetsHtml = editedSheets.map((sheet, index) => {
        return `
    <div class="sheet-section">
        <h2>${sheet.sheetName || `Sheet${index + 1}`}</h2>
        ${sheet.htmlContent}
    </div>`;
      }).join('');

      const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.fileName.replace(/\.[^/.]+$/, '')}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            border-bottom: 2px solid #34495e;
            padding-bottom: 10px;
        }
        .sheet-section {
            margin-bottom: 40px;
            page-break-after: always;
        }
        .sheet-section:last-child {
            margin-bottom: 0;
            page-break-after: auto;
        }
        .sheet-section h2 {
            color: #34495e;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #ecf0f1;
            border-left: 4px solid #34495e;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        @media print {
            .sheet-section {
                page-break-after: always;
            }
            .sheet-section:last-child {
                page-break-after: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${file.fileName.replace(/\.[^/.]+$/, '')}</h1>
        ${sheetsHtml}
    </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.fileName.replace(/\.[^/.]+$/, '')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification('HTML 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('HTML 다운로드 실패:', error);
      showNotification('HTML 파일 다운로드에 실패했습니다.', 'error');
    }
  };

  /**
   * JSONL 변환 (이미지 포함)
   * 
   * 흐름:
   * 1. 각 시트별로 순차적으로 이미지 변환
   * 2. 변환된 이미지를 base64로 인코딩
   * 3. 서버에 전송하여 JSONL 파일 생성
   * 4. 생성된 파일 다운로드
   * 
   * 주의사항:
   * - 순차 처리: 동시에 여러 시트를 변환하면 DOM 충돌 가능
   * - 진행 상황 표시: 사용자에게 진행 상황 알림
   * - 에러 처리: 하나의 시트 변환 실패 시에도 나머지 계속 진행
   */
  const handleConvertToJsonl = async () => {
    if (!file) return;

    try {
      showNotification('이미지 변환 중...', 'info');
      
      // 각 시트별로 순차적으로 이미지 변환
      // Promise.all() 대신 for 루프 사용 이유: DOM 충돌 방지
      const convertedSheets = [];
      for (let i = 0; i < editedSheets.length; i++) {
        const sheet = editedSheets[i];
        showNotification(`${i + 1}/${editedSheets.length} 시트 변환 중...`, 'info');
        const imageBase64 = await convertTableToImage(sheet.htmlContent, sheet.sheetName, i);
        
        convertedSheets.push({
          sheetName: sheet.sheetName,
          htmlContent: sheet.htmlContent,
          imageBase64: imageBase64 || '' // 변환 실패 시 빈 문자열
        });
      }

      const response = await convertQaFileToJsonl({
        fileName: file.fileName,
        sheets: convertedSheets
      });

      // Blob을 다운로드
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.fileName.replace(/\.[^/.]+$/, '')}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification('JSONL 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'JSONL 변환에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  // 셀이 선택되었는지 확인
  const isCellSelected = useCallback((sheetIndex, rowIndex, colIndex) => {
    return selectedCells.some(
      cell => cell.sheetIndex === sheetIndex && 
              cell.rowIndex === rowIndex && 
              cell.colIndex === colIndex
    );
  }, [selectedCells]);

  // 선택된 셀에 스타일 적용
  useEffect(() => {
    const currentSheet = editedSheets[activeSheetIndex];
    if (!isEditing || !currentSheet) return;

    const sheetContainer = document.querySelector(`[data-sheet-name="${currentSheet.sheetName}"]`);
    if (!sheetContainer) return;

    const table = sheetContainer.querySelector('table');
    if (!table) return;

    const cells = table.querySelectorAll('td, th');
    
    cells.forEach((cell) => {
      const row = cell.parentElement;
      const rowIndex = Array.from(row.parentElement.children).indexOf(row);
      const colIndex = Array.from(row.children).indexOf(cell);
      
      if (isCellSelected(activeSheetIndex, rowIndex, colIndex)) {
        cell.classList.add('selected');
      } else {
        cell.classList.remove('selected');
      }
    });
  }, [selectedCells, isEditing, editedSheets, activeSheetIndex, isCellSelected]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>파일을 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container qa-detail-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title">파일 상세 - {file.fileName}</h1>
        <button className="btn-secondary" onClick={() => navigate('/qa')}>
          목록으로
        </button>
      </div>

      <div className="page-content">
        {/* 파일 정보 - 한 줄로 배치 */}
        <div className="form-group">
          <label className="form-label">파일 정보</label>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '24px', 
            alignItems: 'center',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>파일명:</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{file.fileName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>크기:</span>
              <span>{formatFileSize(file.fileSize)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>타입:</span>
              <span>{file.fileType?.toUpperCase() || '-'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>업로드:</span>
              <span>{formatDateTime(file.uploadedAt)}</span>
            </div>
            {file.updatedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#6b7280', fontWeight: 500 }}>수정:</span>
                <span>{formatDateTime(file.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 피드백 입력 */}
        <div className="form-group">
          <label className="form-label">확인 사항 (피드백)</label>
          <textarea
            className="form-textarea"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="확인 사항을 입력하세요"
            rows="3"
            style={{ marginBottom: '8px' }}
          />
          <button 
            className="btn-primary" 
            onClick={handleSaveFeedback}
            disabled={isSavingFeedback}
          >
            {isSavingFeedback ? '저장 중...' : '피드백 저장'}
          </button>
        </div>

        {/* 시트별 HTML 테이블 표시 */}
        {editedSheets.length > 0 && (
          <div className="form-group">
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label">시트 데이터</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={handleConvertToJsonl}
                  >
                    JSONL 변환 (이미지 포함)
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleDownloadHtml}
                  >
                    HTML 다운로드
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button 
                  className="btn-primary"
                  onClick={handleSaveSheets}
                  disabled={isSavingSheets}
                  title="편집 내용을 서버에 저장"
                >
                  {isSavingSheets ? '저장 중...' : '저장'}
                </button>
                <button 
                  className={isEditing ? 'btn-primary' : 'btn-secondary'}
                  onClick={toggleEditMode}
                >
                  {isEditing ? '편집 완료' : '테이블 편집'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={handleReset}
                  title="원래 상태로 초기화"
                >
                  초기화
                </button>
                {isEditing && (
                  <>
                    <button 
                      className="btn-secondary"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      title="뒤로가기 (Ctrl+Z)"
                    >
                      ↶ 뒤로가기
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      title="앞으로가기 (Ctrl+Y)"
                    >
                      ↷ 앞으로가기
                    </button>
                    {selectedCells.length >= 2 && (
                      <button 
                        className="btn-primary"
                        onClick={handleMergeCells}
                      >
                        선택한 셀 병합
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* 시트 탭 */}
            {editedSheets.length > 1 && (
              <div style={{ marginBottom: '12px', borderBottom: '1px solid #dee2e6' }}>
                {editedSheets.map((sheet, index) => (
                  <button
                    key={sheet.id || index}
                    onClick={() => setActiveSheetIndex(index)}
                    style={{
                      padding: '8px 16px',
                      marginRight: '4px',
                      border: 'none',
                      borderBottom: activeSheetIndex === index ? '2px solid #007bff' : '2px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: activeSheetIndex === index ? '#007bff' : '#6c757d',
                      fontWeight: activeSheetIndex === index ? 'bold' : 'normal'
                    }}
                  >
                    {sheet.sheetName || `시트 ${index + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* 현재 활성화된 시트의 HTML 표시 */}
            {editedSheets.map((sheet, index) => {
              if (index !== activeSheetIndex) return null;
              
              return (
                <div 
                  key={sheet.id || index}
                  className="sheet-container"
                  style={{ 
                    marginTop: '12px',
                    border: '1px solid #dee2e6', 
                    padding: '12px', 
                    borderRadius: '4px',
                    overflow: 'auto'
                  }}
                >
                  <h4 style={{ marginTop: 0, marginBottom: '12px' }}>
                    {sheet.sheetName || `시트 ${index + 1}`}
                  </h4>
                  {sheet.htmlContent && (
                    <div 
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        position: 'relative',
                        overflow: 'auto',
                        maxHeight: '70vh',
                        width: '100%'
                      }}
                      onWheel={(e) => {
                        // 가로 스크롤 지원 (Shift + 마우스 휠)
                        if (e.shiftKey && e.deltaY !== 0) {
                          e.preventDefault();
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      <div 
                        ref={(el) => {
                          if (el) {
                            tableRefs.current[sheet.sheetName] = el.querySelector('table') || el;
                          }
                        }}
                        data-sheet-name={sheet.sheetName}
                        className={`sheet-html-content ${isEditing ? 'editing-mode' : ''}`}
                        dangerouslySetInnerHTML={{ __html: sheet.htmlContent }}
                        style={{ 
                          padding: '8px',
                          minWidth: 'fit-content',
                          display: 'inline-block'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QADetail;

