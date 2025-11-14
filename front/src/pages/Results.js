import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getResults,
  getResult,
  updateResult,
  deleteResult,
  updateResultTable,
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
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [tableDirty, setTableDirty] = useState(false);
  const [sourcesView, setSourcesView] = useState('table');
  const [sourcesData, setSourcesData] = useState({ html: '', json: '' });
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
      const table = res.data.table || { columns: [], rows: [] };
      setTableData({
        columns: table.columns || [],
        rows: Array.isArray(table.rows) ? table.rows : [],
      });
      setSourcesData({
        html: res.data.sources?.html || '',
        json: res.data.sources?.json || '',
      });
      setTableDirty(false);
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
      setTableData({ columns: [], rows: [] });
      setSourcesData({ html: '', json: '' });
      setFeedbacks([]);
    }
  }, [fetchFeedbackList, fetchResultDetail, selectedResultId]);

  const handleRowClick = (result) => {
    setSelectedResultId(result.id);
  };

  const handleTableCellChange = (rowIndex, columnKey, value) => {
    setTableData((prev) => {
      const newRows = prev.rows.map((row, idx) =>
        idx === rowIndex ? { ...row, [columnKey]: value } : row
      );
      return { ...prev, rows: newRows };
    });
    setTableDirty(true);
  };

  const handleSaveTable = async () => {
    if (!selectedResultId) return;
    try {
      await updateResultTable(selectedResultId, tableData);
      showNotification('테이블 데이터가 저장되었습니다.', 'success');
      setTableDirty(false);
      fetchResultDetail(selectedResultId);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '테이블 저장에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  const handleExportJsonl = () => {
    if (!tableData.rows.length) {
      showNotification('내보낼 데이터가 없습니다.', 'warning');
      return;
    }
    try {
      const lines = tableData.rows.map((row) => JSON.stringify(row));
      const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `result-${selectedResultId}-table-${timestamp}.jsonl`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showNotification('JSONL 파일을 내보냈습니다.', 'success');
    } catch (error) {
      showNotification('JSONL 내보내기에 실패했습니다.', 'error');
    }
  };

  const handleDownloadAttachment = async () => {
    if (!selectedResultId) return;
    try {
      const res = await downloadResultJsonl(selectedResultId, { format: 'jsonl' });
      const blob = new Blob([res.data], { type: 'application/jsonl' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `result-${selectedResultId}.jsonl`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('파일 다운로드에 실패했습니다.', 'error');
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

  const renderTableGrid = () => {
    if (!tableData.columns.length) {
      return <div className="empty-state">표 데이터가 없습니다.</div>;
    }

    return (
      <div className="result-grid">
        <table className="data-table">
          <thead>
            <tr>
              {tableData.columns.map((col) => (
                <th key={col.key || col.field}>{col.headerName || col.title || col.key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableData.columns.map((col) => {
                  const columnKey = col.key || col.field;
                  return (
                    <td key={columnKey}>
                      <input
                        className="table-cell-input"
                        value={row[columnKey] ?? ''}
                        onChange={(e) => handleTableCellChange(rowIndex, columnKey, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

  const renderSourcesView = () => {
    if (sourcesView === 'html') {
      if (!sourcesData.html) return <div className="empty-state">HTML 소스가 없습니다.</div>;
      return (
        <pre className="code-view" dangerouslySetInnerHTML={{ __html: sourcesData.html }} />
      );
    }

    if (!sourcesData.json) {
      return <div className="empty-state">JSON 소스가 없습니다.</div>;
    }

    return (
      <pre className="code-view">
        {typeof sourcesData.json === 'string'
          ? sourcesData.json
          : JSON.stringify(sourcesData.json, null, 2)}
      </pre>
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
              <button className="btn-primary" onClick={() => setSelectedResultId(null)}>
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
                              setSelectedResultId(result.id);
                              handleOpenResultModal(result);
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
                    </>
                  }
                />
              </div>

              <div className="result-tabs">
                <div className="tabs-header">
                  <button
                    className={`tab-button ${sourcesView === 'table' ? 'active' : ''}`}
                    onClick={() => setSourcesView('table')}
                  >
                    Table
                  </button>
                  <button
                    className={`tab-button ${sourcesView === 'html' ? 'active' : ''}`}
                    onClick={() => setSourcesView('html')}
                  >
                    Source (HTML)
                  </button>
                  <button
                    className={`tab-button ${sourcesView === 'json' ? 'active' : ''}`}
                    onClick={() => setSourcesView('json')}
                  >
                    Source (JSON)
                  </button>
                  {sourcesView === 'table' && (
                    <div className="tab-actions">
                      <button className="btn-secondary" onClick={handleSaveTable} disabled={!tableDirty}>
                        변경사항 저장
                      </button>
                      <button className="btn-primary" onClick={handleExportJsonl}>
                        JSONL 내보내기
                      </button>
                    </div>
                  )}
                </div>
                <div className="tabs-body">
                  {sourcesView === 'table' ? renderTableGrid() : renderSourcesView()}
                </div>
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
