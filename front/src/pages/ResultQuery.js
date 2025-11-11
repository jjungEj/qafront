import React, { useState, useEffect } from 'react';
import { getResults, getResult, createResult, updateResult, deleteResult, getPipelines } from '../utils/api';
import Modal from '../components/Modal';
import Notification, { NotificationContainer } from '../components/Notification';
import './Page.css';

const ResultQuery = () => {
  const [results, setResults] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
    metrics: '',
    log: '',
    startedAt: '',
    finishedAt: '',
    pipelineId: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [filterPipelineId, setFilterPipelineId] = useState('');

  useEffect(() => {
    fetchPipelines();
    fetchResults();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [filterPipelineId]);

  const fetchPipelines = async () => {
    try {
      const response = await getPipelines();
      setPipelines(response.data);
    } catch (error) {
      showNotification('파이프라인 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      const pipelineId = filterPipelineId ? parseInt(filterPipelineId) : null;
      const response = await getResults(pipelineId);
      setResults(response.data);
    } catch (error) {
      showNotification('결과 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchResultDetail = async (id) => {
    try {
      const response = await getResult(id);
      setSelectedResult(response.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      showNotification('결과 상세 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOpenModal = (result = null) => {
    if (result) {
      setEditingResult(result);
      setFormData({
        status: result.status || '',
        metrics: result.metrics || '',
        log: result.log || '',
        startedAt: result.startedAt ? new Date(result.startedAt).toISOString().slice(0, 16) : '',
        finishedAt: result.finishedAt ? new Date(result.finishedAt).toISOString().slice(0, 16) : '',
        pipelineId: result.pipelineId ? result.pipelineId.toString() : ''
      });
    } else {
      setEditingResult(null);
      setFormData({
        status: '',
        metrics: '',
        log: '',
        startedAt: '',
        finishedAt: '',
        pipelineId: filterPipelineId || ''
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingResult(null);
    setFormData({
      status: '',
      metrics: '',
      log: '',
      startedAt: '',
      finishedAt: '',
      pipelineId: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.pipelineId || formData.pipelineId === '') {
      errors.pipelineId = '파이프라인 선택은 필수입니다.';
    }
    
    if (formData.status && formData.status.length > 50) {
      errors.status = '상태는 최대 50자까지 입력 가능합니다.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        pipelineId: parseInt(formData.pipelineId),
        startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : null,
        finishedAt: formData.finishedAt ? new Date(formData.finishedAt).toISOString() : null
      };
      
      if (editingResult) {
        await updateResult(editingResult.id, submitData);
        showNotification('결과가 성공적으로 수정되었습니다.', 'success');
      } else {
        await createResult(submitData);
        showNotification('결과가 성공적으로 생성되었습니다.', 'success');
      }
      handleCloseModal();
      fetchResults();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '결과 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 결과를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteResult(id);
      showNotification('결과가 성공적으로 삭제되었습니다.', 'success');
      fetchResults();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '결과 삭제에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR');
    } catch {
      return dateString;
    }
  };

  const getPipelineName = (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline ? pipeline.name : `파이프라인 ID: ${pipelineId}`;
  };

  const parseJson = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  };

  if (loading && results.length === 0) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">결과조회</h1>
      <div className="page-content">
        <div className="search-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>파이프라인 필터:</span>
            <select
              className="form-select"
              value={filterPipelineId}
              onChange={(e) => setFilterPipelineId(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">전체</option>
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id.toString()}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>파이프라인</th>
                <th>상태</th>
                <th>시작일시</th>
                <th>종료일시</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">결과 데이터가 없습니다.</td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.id}</td>
                    <td>{getPipelineName(result.pipelineId)}</td>
                    <td>{result.status || '-'}</td>
                    <td>{formatDate(result.startedAt)}</td>
                    <td>{formatDate(result.finishedAt)}</td>
                    <td>
                      <button 
                        className="btn-view" 
                        onClick={() => fetchResultDetail(result.id)}
                      >
                        상세보기
                      </button>
                      <button 
                        className="btn-edit" 
                        onClick={() => handleOpenModal(result)}
                        style={{ marginLeft: '8px' }}
                      >
                        수정
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(result.id)}
                        style={{ marginLeft: '8px' }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="action-buttons">
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            새 결과 추가
          </button>
        </div>
      </div>

      {/* 결과 상세 모달 */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedResult(null);
        }}
        title="결과 상세"
        size="large"
      >
        {selectedResult && (
          <div>
            <div className="form-group">
              <label className="form-label">ID</label>
              <div>{selectedResult.id}</div>
            </div>
            <div className="form-group">
              <label className="form-label">파이프라인</label>
              <div>{getPipelineName(selectedResult.pipelineId)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">상태</label>
              <div>{selectedResult.status || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">메트릭스</label>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {selectedResult.metrics ? 
                  JSON.stringify(parseJson(selectedResult.metrics), null, 2) : 
                  '-'}
              </pre>
            </div>
            <div className="form-group">
              <label className="form-label">로그</label>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedResult.log || '-'}
              </pre>
            </div>
            <div className="form-group">
              <label className="form-label">시작일시</label>
              <div>{formatDate(selectedResult.startedAt)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">종료일시</label>
              <div>{formatDate(selectedResult.finishedAt)}</div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedResult(null);
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 결과 생성/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingResult ? '결과 수정' : '새 결과 추가'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              파이프라인 <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={formData.pipelineId}
              onChange={(e) => setFormData({ ...formData, pipelineId: e.target.value })}
            >
              <option value="">파이프라인을 선택하세요</option>
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id.toString()}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            {formErrors.pipelineId && (
              <div className="form-error">{formErrors.pipelineId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">상태</label>
            <input
              type="text"
              className="form-input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="예: completed, failed"
            />
            {formErrors.status && (
              <div className="form-error">{formErrors.status}</div>
            )}
            <div className="form-help">최대 50자</div>
          </div>

          <div className="form-group">
            <label className="form-label">메트릭스 (JSON)</label>
            <textarea
              className="form-textarea"
              value={formData.metrics}
              onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
              placeholder='{"accuracy": 0.95, "loss": 0.05}'
              rows="4"
            />
            <div className="form-help">JSON 형식의 메트릭스 정보를 입력하세요</div>
          </div>

          <div className="form-group">
            <label className="form-label">로그</label>
            <textarea
              className="form-textarea"
              value={formData.log}
              onChange={(e) => setFormData({ ...formData, log: e.target.value })}
              placeholder="로그 내용을 입력하세요"
              rows="6"
            />
          </div>

          <div className="form-group">
            <label className="form-label">시작일시</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.startedAt}
              onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">종료일시</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.finishedAt}
              onChange={(e) => setFormData({ ...formData, finishedAt: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingResult ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResultQuery;

