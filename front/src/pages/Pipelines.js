import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPipelines,
  getPipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getResults,
} from '../utils/api';
import FilterBar from '../components/FilterBar';
import DetailPanel from '../components/DetailPanel';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './Pipelines.css';

const DEFAULT_FORM = {
  documentName: '',
  status: 'pending',
  startedAt: '',
  finishedAt: '',
  errorMessage: '',
};

const Pipelines = () => {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [pipelineDetail, setPipelineDetail] = useState(null);
  const [pipelineResults, setPipelineResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editingPipeline, setEditingPipeline] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchPipelineDetail = useCallback(async (pipelineId) => {
    try {
      setDetailLoading(true);
      const [detailRes, resultsRes] = await Promise.all([
        getPipeline(pipelineId),
        getResults({ pipelineId }),
      ]);
      setPipelineDetail(detailRes.data);
      setPipelineResults(resultsRes.data || []);
    } catch (error) {
      showNotification('파이프라인 상세를 불러오지 못했습니다.', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showNotification]);

  const fetchPipelinesList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status || undefined,
        search: filters.search || undefined,
        startedAfter: filters.startDate || undefined,
        finishedBefore: filters.endDate || undefined,
      };
      const res = await getPipelines(params);
      setPipelines(res.data);
      if (res.data.length && !selectedPipelineId) {
        setSelectedPipelineId(res.data[0].id);
      }
    } catch (error) {
      showNotification('파이프라인 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.endDate, filters.search, filters.startDate, filters.status, selectedPipelineId, showNotification]);

  useEffect(() => {
    fetchPipelinesList();
  }, [fetchPipelinesList]);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchPipelineDetail(selectedPipelineId);
    } else {
      setPipelineDetail(null);
      setPipelineResults([]);
    }
  }, [fetchPipelineDetail, selectedPipelineId]);

  const handleRowClick = (pipeline) => {
    setSelectedPipelineId(pipeline.id);
  };

  const handleOpenModal = (pipeline) => {
    if (pipeline) {
      setEditingPipeline(pipeline);
      setFormData({
        documentName: pipeline.documentName || '',
        status: pipeline.status || 'pending',
        startedAt: pipeline.startedAt ? toLocalDatetimeInput(pipeline.startedAt) : '',
        finishedAt: pipeline.finishedAt ? toLocalDatetimeInput(pipeline.finishedAt) : '',
        errorMessage: pipeline.errorMessage || '',
      });
    } else {
      setEditingPipeline(null);
      setFormData(DEFAULT_FORM);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPipeline(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.documentName.trim()) {
      errors.documentName = '문서명은 필수입니다.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      documentName: formData.documentName.trim(),
      status: formData.status,
      startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : null,
      finishedAt: formData.finishedAt ? new Date(formData.finishedAt).toISOString() : null,
      errorMessage: formData.errorMessage.trim() || null,
    };

    try {
      if (editingPipeline) {
        await updatePipeline(editingPipeline.id, payload);
        showNotification('파이프라인이 수정되었습니다.', 'success');
      } else {
        const res = await createPipeline(payload);
        showNotification('파이프라인이 생성되었습니다.', 'success');
        if (res.data?.id) {
          setSelectedPipelineId(res.data.id);
        }
      }
      handleCloseModal();
      fetchPipelinesList();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '파이프라인 저장에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  const handleDelete = async (pipelineId) => {
    if (!window.confirm('정말로 이 파이프라인을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deletePipeline(pipelineId);
      showNotification('파이프라인이 삭제되었습니다.', 'success');
      if (selectedPipelineId === pipelineId) {
        setSelectedPipelineId(null);
      }
      fetchPipelinesList();
    } catch (error) {
      const message = error.response?.data?.message || '파이프라인 삭제에 실패했습니다.';
      showNotification(message, 'error');
    }
  };

  const toLocalDatetimeInput = (value) => {
    try {
      return new Date(value).toISOString().slice(0, 16);
    } catch (error) {
      return '';
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

  const pipelineSections = useMemo(() => {
    if (!pipelineDetail) return [];
    return [
      {
        title: '기본 정보',
        items: [
          { label: '문서명', value: pipelineDetail.documentName },
          { label: '상태', value: <StatusBadge status={pipelineDetail.status} /> },
          { label: '시작 시간', value: formatDate(pipelineDetail.startedAt) },
          { label: '완료 시간', value: formatDate(pipelineDetail.finishedAt) },
        ],
      },
      {
        title: '메타데이터',
        items: [
          { label: '생성일', value: formatDate(pipelineDetail.createdAt) },
          { label: '수정일', value: formatDate(pipelineDetail.updatedAt) },
        ],
        extra: pipelineDetail.errorMessage ? (
          <div className="pipeline-error-callout">
            <strong>오류 메시지</strong>
            <p>{pipelineDetail.errorMessage}</p>
          </div>
        ) : null,
      },
      {
        title: '연결된 결과',
        items: [],
        extra: pipelineResults.length ? (
          <ul className="detail-related-list">
            {pipelineResults.map((result) => (
              <li key={result.id}>
                <span>
                  결과 #{result.id}{' '}
                  <StatusBadge status={result.status} size="small" />
                </span>
                <span>{formatDate(result.startedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="detail-muted">연결된 결과가 없습니다.</div>
        ),
      },
    ];
  }, [pipelineDetail, pipelineResults]);

  return (
    <div className="page-container">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <h1 className="page-title">파이프라인</h1>
      <div className="page-content pipelines-layout">
        <div className="pipelines-main">
          <FilterBar
            rightActions={
              <button className="btn-primary" onClick={() => handleOpenModal(null)}>
                새 파이프라인 생성
              </button>
            }
          >
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
              type="search"
              placeholder="문서명 검색"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <div className="date-range-inputs">
              <input
                className="form-input"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <span>~</span>
              <input
                className="form-input"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </FilterBar>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>문서명</th>
                  <th>상태</th>
                  <th>시작</th>
                  <th>완료</th>
                  <th>오류</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-message">
                      로딩 중...
                    </td>
                  </tr>
                ) : pipelines.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-message">
                      파이프라인 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pipelines.map((pipeline) => {
                    const isActive = selectedPipelineId === pipeline.id;
                    return (
                      <tr
                        key={pipeline.id}
                        className={isActive ? 'is-selected-row' : ''}
                        onClick={() => handleRowClick(pipeline)}
                      >
                        <td>{pipeline.id}</td>
                        <td>{pipeline.documentName}</td>
                        <td>
                          <StatusBadge status={pipeline.status} size="small" />
                        </td>
                        <td>{formatDate(pipeline.startedAt)}</td>
                        <td>{formatDate(pipeline.finishedAt)}</td>
                        <td className="pipeline-error-cell">
                          {pipeline.errorMessage ? (
                            <span title={pipeline.errorMessage}>{pipeline.errorMessage}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenModal(pipeline);
                            }}
                          >
                            수정
                          </button>
                          <button
                            className="btn-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(pipeline.id);
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

        <DetailPanel
          title={pipelineDetail ? pipelineDetail.documentName : '파이프라인 상세'}
          status={pipelineDetail?.status}
          sections={detailLoading ? [] : pipelineSections}
          actions={
            pipelineDetail && (
              <button className="btn-secondary" onClick={() => handleOpenModal(pipelineDetail)}>
                정보 수정
              </button>
            )
          }
          footer={
            pipelineDetail
              ? `마지막 업데이트: ${formatDate(pipelineDetail.updatedAt)}`
              : '행을 선택하면 상세 정보가 표시됩니다.'
          }
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPipeline ? '파이프라인 수정' : '새 파이프라인 생성'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              문서명 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={formData.documentName}
              onChange={(e) => setFormData((prev) => ({ ...prev, documentName: e.target.value }))}
              placeholder="문서명을 입력하세요"
            />
            {formErrors.documentName && <div className="form-error">{formErrors.documentName}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">상태</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">대기중</option>
              <option value="processing">처리중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>

          <div className="form-group form-row">
            <div>
              <label className="form-label">시작 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={formData.startedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, startedAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">완료 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={formData.finishedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, finishedAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">오류 메시지</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={formData.errorMessage}
              onChange={(e) => setFormData((prev) => ({ ...prev, errorMessage: e.target.value }))}
              placeholder="오류 발생 시 메시지를 입력하세요"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingPipeline ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Pipelines;
