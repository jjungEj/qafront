import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getResults,
  getResult,
  updateResult,
  deleteResult,
  getFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  downloadResultJsonl,
} from '../utils/api';
import FilterBar from '../components/FilterBar';
import DetailPanel from '../components/DetailPanel';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './Results.css';

const DEFAULT_RESULT_FORM = {
  status: '',
  startedAt: '',
  finishedAt: '',
  fileSize: '',
  uri: '',
};

const DEFAULT_FEEDBACK_FORM = {
  documentName: '',
  logType: '',
  feedback: '',
  status: '',
  updatedResultStatus: '',
  updatedMetadata: '',
};

const Results = () => {
  const [results, setResults] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState(null);
  const [resultDetail, setResultDetail] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState(null);
  const [sheetView, setSheetView] = useState('preview');
  const [isSheetSaving, setIsSheetSaving] = useState(false);
  const originalSheetsRef = useRef([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filters, setFilters] = useState({
    pipelineId: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultForm, setResultForm] = useState(DEFAULT_RESULT_FORM);
  const [resultFormErrors, setResultFormErrors] = useState({});
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_FEEDBACK_FORM);
  const [feedbackFormErrors, setFeedbackFormErrors] = useState({});
  const [editingFeedback, setEditingFeedback] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchResultList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        pipelineId: filters.pipelineId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        startedAfter: filters.startDate || undefined,
        finishedBefore: filters.endDate || undefined,
      };
      const res = await getResults(params);
      setResults(res.data);
      if (res.data.length && !selectedResultId) {
        setSelectedResultId(res.data[0].id);
      }
    } catch (error) {
      showNotification('결과 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.endDate, filters.pipelineId, filters.search, filters.startDate, filters.status, selectedResultId, showNotification]);

  const fetchResultDetail = useCallback(async (resultId) => {
    try {
      setDetailLoading(true);
      const res = await getResult(resultId);
      setResultDetail(res.data);
      setResultForm({
        status: res.data.status || '',
        startedAt: res.data.startedAt ? toLocalDatetimeInput(res.data.startedAt) : '',
        finishedAt: res.data.finishedAt ? toLocalDatetimeInput(res.data.finishedAt) : '',
        fileSize: res.data.fileSize ?? '',
        uri: res.data.uri || '',
      });
      const incomingSheets = Array.isArray(res.data.sheets) ? res.data.sheets : [];
      const hydratedSheets = incomingSheets.map((sheet, index) => ({
        localId: sheet.id ?? sheet.sheetId ?? `${res.data.id ?? 'result'}-sheet-${index}`,
        sheetName: sheet.sheetName || `시트 ${index + 1}`,
        sheetOrder: typeof sheet.sheetOrder === 'number' ? sheet.sheetOrder : index,
        htmlContent: sheet.htmlContent || '',
        imageBase64: sheet.imageBase64 || '',
      }));
      const normalizedSheets = hydratedSheets
        .sort((a, b) => a.sheetOrder - b.sheetOrder)
        .map((sheet, index) => ({
          ...sheet,
          sheetOrder: index,
        }));
      setSheets(normalizedSheets);
      const defaultSheetId = normalizedSheets[0]?.localId ?? null;
      setSelectedSheetId((prev) => {
        if (!prev) {
          return defaultSheetId;
        }
        return normalizedSheets.some((sheet) => sheet.localId === prev) ? prev : defaultSheetId;
      });
      setSheetView('preview');
      originalSheetsRef.current = normalizedSheets.map(
        ({ localId, sheetName, sheetOrder, htmlContent, imageBase64 }) => ({
          localId,
          sheetName,
          sheetOrder,
          htmlContent,
          imageBase64,
        })
      );
    } catch (error) {
      showNotification('결과 상세를 불러오지 못했습니다.', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showNotification]);

  const fetchFeedbackList = useCallback(async (resultId) => {
    try {
      const res = await getFeedbacks(resultId);
      setFeedbacks(res.data || []);
    } catch (error) {
      showNotification('피드백 목록을 불러오지 못했습니다.', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchResultList();
  }, [fetchResultList]);

  useEffect(() => {
    if (selectedResultId) {
      fetchResultDetail(selectedResultId);
      fetchFeedbackList(selectedResultId);
    } else {
      setResultDetail(null);
      setSheets([]);
      setSelectedSheetId(null);
      setSheetView('preview');
      originalSheetsRef.current = [];
      setFeedbacks([]);
    }
  }, [fetchFeedbackList, fetchResultDetail, selectedResultId]);

  const isSheetDirty = useCallback((sheet) => {
    if (!sheet) return false;
    const original = originalSheetsRef.current.find((item) => item.localId === sheet.localId);
    if (!original) {
      return Boolean(
        (sheet.sheetName && sheet.sheetName.trim().length > 0) ||
          sheet.htmlContent ||
          sheet.imageBase64
      );
    }
    return (
      original.sheetName !== sheet.sheetName ||
      original.sheetOrder !== sheet.sheetOrder ||
      (original.htmlContent || '') !== (sheet.htmlContent || '') ||
      (original.imageBase64 || '') !== (sheet.imageBase64 || '')
    );
  }, []);

  const sortedSheets = useMemo(() => {
    if (!sheets.length) {
      return [];
    }
    return [...sheets].sort((a, b) => a.sheetOrder - b.sheetOrder);
  }, [sheets]);

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.localId === selectedSheetId) || null,
    [sheets, selectedSheetId]
  );

  const selectedSheetIndex = useMemo(
    () => sortedSheets.findIndex((sheet) => sheet.localId === selectedSheetId),
    [sortedSheets, selectedSheetId]
  );

  const canMoveUp = selectedSheetIndex > 0;
  const canMoveDown =
    selectedSheetIndex !== -1 && selectedSheetIndex < sortedSheets.length - 1;

  const hasDirtySheets = useMemo(
    () => sheets.some((sheet) => isSheetDirty(sheet)),
    [sheets, isSheetDirty]
  );

  const currentSheetDirty = useMemo(
    () => (selectedSheet ? isSheetDirty(selectedSheet) : false),
    [selectedSheet, isSheetDirty]
  );

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasDirtySheets) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    if (hasDirtySheets) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return undefined;
  }, [hasDirtySheets]);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasDirtySheets) {
      return true;
    }
    return window.confirm('저장되지 않은 시트 변경 사항이 있습니다. 계속하시겠습니까?');
  }, [hasDirtySheets]);

  const confirmCurrentSheetChange = useCallback(() => {
    if (!currentSheetDirty) {
      return true;
    }
    return window.confirm('현재 시트에 저장되지 않은 변경 사항이 있습니다. 이동하시겠습니까?');
  }, [currentSheetDirty]);

  const attemptSelectResult = useCallback(
    (resultId) => {
      if (!confirmDiscardChanges()) {
        return false;
      }
      setSelectedResultId(resultId);
      return true;
    },
    [confirmDiscardChanges]
  );

  const handleRowClick = (result) => {
    attemptSelectResult(result.id);
  };

  const handleSelectSheet = useCallback(
    (sheetId) => {
      if (!sheetId || sheetId === selectedSheetId) {
        return;
      }
      if (!confirmCurrentSheetChange()) {
        return;
      }
      setSelectedSheetId(sheetId);
      setSheetView('preview');
    },
    [confirmCurrentSheetChange, selectedSheetId]
  );

  const handleSheetNameChange = (sheetId, value) => {
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet.localId === sheetId ? { ...sheet, sheetName: value } : sheet
      )
    );
  };

  const handleSheetHtmlChange = (sheetId, value) => {
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet.localId === sheetId ? { ...sheet, htmlContent: value } : sheet
      )
    );
  };

  const handleSheetImageUpload = (sheetId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setSheets((prev) =>
        prev.map((sheet) =>
          sheet.localId === sheetId ? { ...sheet, imageBase64: base64 } : sheet
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSheetImageRemove = (sheetId) => {
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet.localId === sheetId ? { ...sheet, imageBase64: '' } : sheet
      )
    );
  };

  const reorderSheet = useCallback((sheetId, targetIndex) => {
    setSheets((prev) => {
      if (!prev.length) return prev;
      const sorted = [...prev].sort((a, b) => a.sheetOrder - b.sheetOrder);
      const currentIndex = sorted.findIndex((sheet) => sheet.localId === sheetId);
      if (currentIndex === -1) return prev;
      const clampedIndex = Math.max(0, Math.min(targetIndex, sorted.length - 1));
      if (clampedIndex === currentIndex) return prev;
      const [moved] = sorted.splice(currentIndex, 1);
      sorted.splice(clampedIndex, 0, moved);
      return sorted.map((sheet, index) => ({ ...sheet, sheetOrder: index }));
    });
  }, []);

  const handleSheetMove = useCallback(
    (sheetId, direction) => {
      if (!sheetId) return;
      const currentIndex = sortedSheets.findIndex((sheet) => sheet.localId === sheetId);
      if (currentIndex === -1) return;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      reorderSheet(sheetId, targetIndex);
    },
    [reorderSheet, sortedSheets]
  );

  const handleSheetOrderInputChange = useCallback(
    (sheetId, value) => {
      if (!sheetId) return;
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 1) return;
      reorderSheet(sheetId, parsed - 1);
    },
    [reorderSheet]
  );

  const handleSaveSheets = useCallback(async () => {
    if (!selectedResultId) return;
    try {
      setIsSheetSaving(true);
      const payload = {
        sheets: sortedSheets.map(({ sheetName, sheetOrder, htmlContent, imageBase64 }) => ({
          sheetName,
          sheetOrder,
          htmlContent,
          imageBase64: imageBase64 || null,
        })),
      };
      await updateResult(selectedResultId, payload);
      originalSheetsRef.current = sortedSheets.map(
        ({ localId, sheetName, sheetOrder, htmlContent, imageBase64 }) => ({
          localId,
          sheetName,
          sheetOrder,
          htmlContent,
          imageBase64,
        })
      );
      showNotification('시트가 저장되었습니다.', 'success');
      await fetchResultDetail(selectedResultId);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '시트 저장에 실패했습니다.';
      showNotification(message, 'error', 5000);
    } finally {
      setIsSheetSaving(false);
    }
  }, [fetchResultDetail, selectedResultId, showNotification, sortedSheets]);

  const getImagePreviewSrc = useCallback((imageBase64) => {
    if (!imageBase64) return null;
    return imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;
  }, []);

  const handleDownloadAttachment = () => {
    if (!resultDetail) {
      showNotification('다운로드할 첨부 파일이 없습니다.', 'warning');
      return;
    }
    const downloadUrl = resultDetail.originalDocument?.downloadUrl || resultDetail.uri;
    if (!downloadUrl) {
      showNotification('다운로드할 첨부 파일이 없습니다.', 'warning');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = '';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  const handleDownloadResultJsonl = async () => {
    if (!selectedResultId) return;
    try {
      const res = await downloadResultJsonl(selectedResultId);
      const blob = new Blob([res.data], { type: 'application/jsonl' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `result-${selectedResultId}.jsonl`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showNotification('JSONL 파일을 다운로드했습니다.', 'success');
    } catch (error) {
      showNotification('JSONL 다운로드에 실패했습니다.', 'error');
    }
  };

  const handleOpenResultModal = (result) => {
    const detail = result || resultDetail;
    if (!detail) return;
    setResultForm({
      status: detail.status || '',
      startedAt: detail.startedAt ? toLocalDatetimeInput(detail.startedAt) : '',
      finishedAt: detail.finishedAt ? toLocalDatetimeInput(detail.finishedAt) : '',
      fileSize: detail.fileSize ?? '',
      uri: detail.uri || '',
    });
    setResultFormErrors({});
    setIsResultModalOpen(true);
  };

  const handleCloseResultModal = () => {
    setIsResultModalOpen(false);
    setResultForm(DEFAULT_RESULT_FORM);
    setResultFormErrors({});
  };

  const validateResultForm = () => {
    const errors = {};
    if (resultForm.fileSize && Number.isNaN(Number(resultForm.fileSize))) {
      errors.fileSize = '파일 크기는 숫자여야 합니다.';
    }
    setResultFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResultId) return;
    if (!validateResultForm()) return;
    const payload = {
      status: resultForm.status || null,
      startedAt: resultForm.startedAt ? new Date(resultForm.startedAt).toISOString() : null,
      finishedAt: resultForm.finishedAt ? new Date(resultForm.finishedAt).toISOString() : null,
      fileSize: resultForm.fileSize ? Number(resultForm.fileSize) : null,
      uri: resultForm.uri || null,
    };
    try {
      await updateResult(selectedResultId, payload);
      showNotification('결과 정보가 수정되었습니다.', 'success');
      handleCloseResultModal();
      fetchResultDetail(selectedResultId);
      fetchResultList();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '결과 수정에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (selectedResultId === resultId && hasDirtySheets) {
      const proceed = window.confirm(
        '현재 결과의 시트에 저장되지 않은 변경 사항이 있습니다. 삭제하면 변경 내용이 모두 사라집니다. 계속하시겠습니까?'
      );
      if (!proceed) {
        return;
      }
    }
    if (!window.confirm('정말로 이 결과를 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deleteResult(resultId);
      showNotification('결과가 삭제되었습니다.', 'success');
      if (selectedResultId === resultId) {
        setSelectedResultId(null);
      }
      fetchResultList();
    } catch (error) {
      const message = error.response?.data?.message || '결과 삭제에 실패했습니다.';
      showNotification(message, 'error');
    }
  };

  const handleOpenFeedbackModal = (feedback) => {
    if (feedback) {
      setEditingFeedback(feedback);
      setFeedbackForm({
        documentName: feedback.documentName || '',
        logType: feedback.logType || '',
        feedback: feedback.feedback || '',
        status: feedback.status || '',
        updatedResultStatus: feedback.updatedResultStatus || '',
        updatedMetadata: feedback.updatedMetadata ? JSON.stringify(feedback.updatedMetadata, null, 2) : '',
      });
    } else {
      setEditingFeedback(null);
      setFeedbackForm(DEFAULT_FEEDBACK_FORM);
    }
    setFeedbackFormErrors({});
    setIsFeedbackModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setEditingFeedback(null);
    setFeedbackForm(DEFAULT_FEEDBACK_FORM);
    setFeedbackFormErrors({});
  };

  const validateFeedbackForm = () => {
    const errors = {};
    if (!feedbackForm.documentName.trim()) {
      errors.documentName = '문서명은 필수입니다.';
    }
    if (!feedbackForm.feedback.trim()) {
      errors.feedback = '피드백 내용은 필수입니다.';
    }
    if (feedbackForm.updatedMetadata) {
      try {
        JSON.parse(feedbackForm.updatedMetadata);
      } catch (error) {
        errors.updatedMetadata = '유효한 JSON 형식이어야 합니다.';
      }
    }
    setFeedbackFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResultId) return;
    if (!validateFeedbackForm()) return;

    const payload = {
      resultId: selectedResultId,
      documentName: feedbackForm.documentName.trim(),
      logType: feedbackForm.logType || null,
      feedback: feedbackForm.feedback.trim(),
      status: feedbackForm.status || null,
      updatedResultStatus: feedbackForm.updatedResultStatus || null,
      updatedMetadata: feedbackForm.updatedMetadata
        ? JSON.parse(feedbackForm.updatedMetadata)
        : null,
    };

    try {
      if (editingFeedback) {
        await updateFeedback(editingFeedback.id, payload);
        showNotification('피드백이 수정되었습니다.', 'success');
      } else {
        await createFeedback(payload);
        showNotification('피드백이 등록되었습니다.', 'success');
      }
      handleCloseFeedbackModal();
      fetchFeedbackList(selectedResultId);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '피드백 저장에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('이 피드백을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deleteFeedback(feedbackId);
      showNotification('피드백이 삭제되었습니다.', 'success');
      fetchFeedbackList(selectedResultId);
    } catch (error) {
      const message = error.response?.data?.message || '피드백 삭제에 실패했습니다.';
      showNotification(message, 'error');
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch (error) {
      return value;
    }
  };

  const toLocalDatetimeInput = (value) => {
    try {
      return new Date(value).toISOString().slice(0, 16);
    } catch (error) {
      return '';
    }
  };

  const resultMetadataSections = useMemo(() => {
    if (!resultDetail) return [];
    return [
      {
        title: '결과 정보',
        items: [
          { label: '상태', value: <StatusBadge status={resultDetail.status} /> },
          { label: '파일 크기', value: resultDetail.fileSize ? `${resultDetail.fileSize.toLocaleString()} bytes` : '-' },
          { label: 'URI', value: resultDetail.uri || '-' },
        ],
      },
      {
        title: '타임라인',
        items: [
          { label: '시작', value: formatDate(resultDetail.startedAt) },
          { label: '완료', value: formatDate(resultDetail.finishedAt) },
        ],
      },
    ];
  }, [resultDetail]);

  const renderDocumentPreview = () => {
    if (selectedSheet) {
      const thumbnailSrc = getImagePreviewSrc(selectedSheet.imageBase64);
      if (thumbnailSrc) {
        return (
          <img
            src={thumbnailSrc}
            alt={`${selectedSheet.sheetName || '시트'} 썸네일`}
            className="sheet-thumbnail-image"
          />
        );
      }
      if (selectedSheet.htmlContent) {
        return (
          <div className="preview-fallback">
            <p>썸네일 이미지가 없습니다. 아래 전체보기 탭에서 HTML을 확인하세요.</p>
          </div>
        );
      }
    }

    if (!resultDetail?.originalDocument) {
      return <div className="empty-state">원본 문서 정보가 없습니다.</div>;
    }

    const previewHtml = resultDetail.originalDocument.previewHtml;
    const downloadUrl = resultDetail.originalDocument.downloadUrl || resultDetail.uri;

    if (previewHtml) {
      return (
        <iframe
          title="원본 문서 미리보기"
          className="document-preview-frame"
          srcDoc={previewHtml}
          sandbox="allow-same-origin allow-scripts"
        />
      );
    }

    return (
      <div className="preview-fallback">
        <p>이 파일 형식은 미리보기를 지원하지 않습니다.</p>
        {downloadUrl && (
          <button className="btn-primary" onClick={handleDownloadAttachment}>
            다운로드
          </button>
        )}
      </div>
    );
  };

  const renderSelectedSheetContent = () => {
    if (!selectedSheet) {
      return <div className="empty-state">시트를 선택하면 내용이 표시됩니다.</div>;
    }

    if (sheetView === 'source') {
      return (
        <textarea
          className="sheet-code-editor"
          value={selectedSheet.htmlContent || ''}
          onChange={(event) => handleSheetHtmlChange(selectedSheet.localId, event.target.value)}
          spellCheck={false}
        />
      );
    }

    if (!selectedSheet.htmlContent) {
      return <div className="empty-state">HTML 내용이 없습니다.</div>;
    }

    return (
      <div className="sheet-html-preview">
        <div
          className="sheet-html-content"
          dangerouslySetInnerHTML={{ __html: selectedSheet.htmlContent }}
        />
      </div>
    );
  };

  return (
    <div className="page-container">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <h1 className="page-title">결과 상세</h1>
      <div className="page-content results-layout">
        <div className="results-main">
            <FilterBar
              rightActions={
                <button className="btn-primary" onClick={() => attemptSelectResult(null)}>
                  선택 해제
                </button>
              }
            >
            <input
              className="form-input"
              type="search"
              placeholder="문서명 / URI 검색"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">전체 상태</option>
              <option value="pending">대기중</option>
              <option value="processing">처리중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
            <input
              className="form-input"
              type="number"
              min={0}
              placeholder="파이프라인 ID"
              value={filters.pipelineId}
              onChange={(e) => setFilters((prev) => ({ ...prev, pipelineId: e.target.value }))}
            />
          </FilterBar>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>파이프라인</th>
                  <th>상태</th>
                  <th>시작</th>
                  <th>완료</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-message">
                      로딩 중...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-message">
                      결과 데이터가 없습니다.
                    </td>
                  </tr>
                  ) : (
                    results.map((result) => {
                      const isActive = selectedResultId === result.id;
                      return (
                        <tr
                          key={result.id}
                          className={isActive ? 'is-selected-row' : ''}
                          onClick={() => handleRowClick(result)}
                        >
                          <td>{result.id}</td>
                          <td>{result.pipelineId}</td>
                          <td>
                            <StatusBadge status={result.status} size="small" />
                          </td>
                          <td>{formatDate(result.startedAt)}</td>
                          <td>{formatDate(result.finishedAt)}</td>
                          <td>
                            <button
                              className="btn-edit"
                              onClick={(event) => {
                                event.stopPropagation();
                                const selected = attemptSelectResult(result.id);
                                if (selected) {
                                  handleOpenResultModal(result);
                                }
                              }}
                            >
                              수정
                            </button>
                            <button
                              className="btn-delete"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteResult(result.id);
                              }}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="results-detail">
          {detailLoading ? (
            <div className="empty-state">상세 정보를 불러오는 중입니다...</div>
          ) : !resultDetail ? (
            <div className="empty-state">결과를 선택하면 상세 정보가 표시됩니다.</div>
          ) : (
            <>
                <div className="result-top-section">
                  <div className="preview-container">{renderDocumentPreview()}</div>
                  <DetailPanel
                    title={resultDetail.originalDocument?.fileName || `결과 #${resultDetail.id}`}
                    status={resultDetail.status}
                    sections={resultMetadataSections}
                    actions={
                      <>
                        <button className="btn-edit" onClick={() => handleOpenResultModal(resultDetail)}>
                          결과 수정
                        </button>
                        <button className="btn-secondary" onClick={handleDownloadAttachment}>
                          첨부 다운로드
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={handleDownloadResultJsonl}
                          title="각 라인의 html 값은 base64 인코딩된 상태입니다."
                        >
                          JSONL 다운로드
                        </button>
                      </>
                    }
                  />
                </div>

                <div className="sheet-editor">
                  <div className="sheet-editor-header">
                    <div className="sheet-selector">
                      <span className="sheet-selector-label">시트 선택</span>
                      <div className="sheet-selector-tabs">
                        {sortedSheets.map((sheet, index) => {
                          const isActive = sheet.localId === selectedSheetId;
                          const dirty = isSheetDirty(sheet);
                          const label = `${sheet.sheetName || `시트 ${index + 1}`}${dirty ? ' *' : ''}`;
                          return (
                            <button
                              type="button"
                              key={sheet.localId}
                              className={`sheet-tab ${isActive ? 'active' : ''}`}
                              onClick={() => handleSelectSheet(sheet.localId)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <select
                        className="sheet-selector-dropdown"
                        value={selectedSheetId || ''}
                        onChange={(event) => handleSelectSheet(event.target.value)}
                      >
                        {sortedSheets.length === 0 ? (
                          <option value="">시트 없음</option>
                        ) : (
                          sortedSheets.map((sheet, index) => {
                            const dirty = isSheetDirty(sheet);
                            const label = `${sheet.sheetName || `시트 ${index + 1}`}${dirty ? ' *' : ''}`;
                            return (
                              <option key={sheet.localId} value={sheet.localId}>
                                {label}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                    <div className="sheet-view-toggle">
                      <button
                        type="button"
                        className={`sheet-view-button ${sheetView === 'preview' ? 'active' : ''}`}
                        onClick={() => setSheetView('preview')}
                      >
                        전체보기 (HTML table)
                      </button>
                      <button
                        type="button"
                        className={`sheet-view-button ${sheetView === 'source' ? 'active' : ''}`}
                        onClick={() => setSheetView('source')}
                      >
                        소스보기
                      </button>
                    </div>
                    <div className="sheet-editor-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleSheetMove(selectedSheetId, 'up')}
                        disabled={!selectedSheetId || !canMoveUp}
                      >
                        위로
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleSheetMove(selectedSheetId, 'down')}
                        disabled={!selectedSheetId || !canMoveDown}
                      >
                        아래로
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSaveSheets}
                        disabled={!hasDirtySheets || isSheetSaving}
                      >
                        {isSheetSaving ? '저장 중...' : '시트 저장'}
                      </button>
                    </div>
                  </div>
                  {sortedSheets.length === 0 ? (
                    <div className="empty-state">시트 데이터가 없습니다.</div>
                  ) : (
                    <>
                      <div className="sheet-metadata">
                        {selectedSheet ? (
                          <>
                            <div className="sheet-form-row">
                              <div className="form-group">
                                <label className="form-label">시트 이름</label>
                                <input
                                  className="form-input"
                                  value={selectedSheet.sheetName || ''}
                                  onChange={(event) =>
                                    handleSheetNameChange(selectedSheet.localId, event.target.value)
                                  }
                                  placeholder="시트 이름"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">표시 순서</label>
                                <input
                                  className="form-input"
                                  type="number"
                                  min={1}
                                  max={sortedSheets.length}
                                  value={selectedSheet.sheetOrder + 1}
                                  onChange={(event) =>
                                    handleSheetOrderInputChange(selectedSheet.localId, event.target.value)
                                  }
                                />
                                <p className="form-hint">작은 숫자일수록 앞에 표시됩니다.</p>
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">썸네일 이미지</label>
                              <div className="sheet-thumbnail-actions">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] || null;
                                    handleSheetImageUpload(selectedSheet.localId, file);
                                    event.target.value = '';
                                  }}
                                />
                                {selectedSheet.imageBase64 && (
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleSheetImageRemove(selectedSheet.localId)}
                                  >
                                    제거
                                  </button>
                                )}
                              </div>
                              <p className="form-hint">업로드 시 base64 문자열이 저장됩니다.</p>
                            </div>
                            <p className="form-hint">
                              HTML은 저장 시 원문 그대로 전달되며 백엔드에서 base64로 인코딩됩니다.
                            </p>
                          </>
                        ) : (
                          <div className="empty-state">시트를 선택하면 설정을 변경할 수 있습니다.</div>
                        )}
                      </div>
                      <div className="sheet-content">{renderSelectedSheetContent()}</div>
                    </>
                  )}
                </div>

              <div className="feedback-section">
                <div className="feedback-header">
                  <h2>피드백</h2>
                  <button className="btn-primary" onClick={() => handleOpenFeedbackModal(null)}>
                    피드백 추가
                  </button>
                </div>
                {feedbacks.length === 0 ? (
                  <div className="empty-state">등록된 피드백이 없습니다.</div>
                ) : (
                  <table className="data-table feedback-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>문서명</th>
                        <th>로그 유형</th>
                        <th>피드백</th>
                        <th>상태</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((feedback) => (
                        <tr key={feedback.id}>
                          <td>{feedback.id}</td>
                          <td>{feedback.documentName}</td>
                          <td>{feedback.logType || '-'}</td>
                          <td className="feedback-text">{feedback.feedback}</td>
                          <td>
                            <StatusBadge status={feedback.status || resultDetail.status} size="small" />
                          </td>
                          <td>
                            <button className="btn-edit" onClick={() => handleOpenFeedbackModal(feedback)}>
                              수정
                            </button>
                            <button className="btn-delete" onClick={() => handleDeleteFeedback(feedback.id)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={isResultModalOpen}
        onClose={handleCloseResultModal}
        title="결과 수정"
        size="medium"
      >
        <form onSubmit={handleResultSubmit}>
          <div className="form-group">
            <label className="form-label">상태</label>
            <input
              className="form-input"
              value={resultForm.status}
              onChange={(e) => setResultForm((prev) => ({ ...prev, status: e.target.value }))}
              placeholder="예: completed"
            />
          </div>
          <div className="form-group form-row">
            <div>
              <label className="form-label">시작 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={resultForm.startedAt}
                onChange={(e) => setResultForm((prev) => ({ ...prev, startedAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">완료 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={resultForm.finishedAt}
                onChange={(e) => setResultForm((prev) => ({ ...prev, finishedAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">파일 크기 (byte)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={resultForm.fileSize}
              onChange={(e) => setResultForm((prev) => ({ ...prev, fileSize: e.target.value }))}
            />
            {resultFormErrors.fileSize && <div className="form-error">{resultFormErrors.fileSize}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">URI</label>
            <input
              className="form-input"
              value={resultForm.uri}
              onChange={(e) => setResultForm((prev) => ({ ...prev, uri: e.target.value }))}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseResultModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              저장
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        title={editingFeedback ? '피드백 수정' : '새 피드백'}
        size="medium"
      >
        <form onSubmit={handleFeedbackSubmit}>
          <div className="form-group">
            <label className="form-label">
              문서명 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={feedbackForm.documentName}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, documentName: e.target.value }))}
            />
            {feedbackFormErrors.documentName && <div className="form-error">{feedbackFormErrors.documentName}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">로그 유형</label>
            <input
              className="form-input"
              value={feedbackForm.logType}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, logType: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              피드백 <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={5}
              value={feedbackForm.feedback}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, feedback: e.target.value }))}
            />
            {feedbackFormErrors.feedback && <div className="form-error">{feedbackFormErrors.feedback}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">상태</label>
            <input
              className="form-input"
              value={feedbackForm.status}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, status: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">업데이트 결과 상태</label>
            <input
              className="form-input"
              value={feedbackForm.updatedResultStatus}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, updatedResultStatus: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">업데이트 메타데이터 (JSON)</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={feedbackForm.updatedMetadata}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, updatedMetadata: e.target.value }))}
              placeholder='{"key": "value"}'
            />
            {feedbackFormErrors.updatedMetadata && (
              <div className="form-error">{feedbackFormErrors.updatedMetadata}</div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseFeedbackModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingFeedback ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Results;
