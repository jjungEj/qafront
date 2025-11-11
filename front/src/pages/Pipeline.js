import React, { useState, useEffect } from 'react';
import { getPipelines, createPipeline, updatePipeline, deletePipeline, getModels } from '../utils/api';
import Modal from '../components/Modal';
import Notification, { NotificationContainer } from '../components/Notification';
import './Page.css';

const Pipeline = () => {
  const [pipelines, setPipelines] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    status: '',
    configuration: '',
    modelId: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [filterModelId, setFilterModelId] = useState('');

  useEffect(() => {
    fetchModels();
    fetchPipelines();
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [filterModelId]);

  const fetchModels = async () => {
    try {
      const response = await getModels();
      setModels(response.data);
    } catch (error) {
      showNotification('모델 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const modelId = filterModelId ? parseInt(filterModelId) : null;
      const response = await getPipelines(modelId);
      setPipelines(response.data);
    } catch (error) {
      showNotification('파이프라인 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOpenModal = (pipeline = null) => {
    if (pipeline) {
      setEditingPipeline(pipeline);
      setFormData({
        name: pipeline.name || '',
        status: pipeline.status || '',
        configuration: pipeline.configuration || '',
        modelId: pipeline.modelId ? pipeline.modelId.toString() : ''
      });
    } else {
      setEditingPipeline(null);
      setFormData({
        name: '',
        status: '',
        configuration: '',
        modelId: filterModelId || ''
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPipeline(null);
    setFormData({
      name: '',
      status: '',
      configuration: '',
      modelId: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '파이프라인 이름은 필수입니다.';
    } else if (formData.name.length > 100) {
      errors.name = '파이프라인 이름은 최대 100자까지 입력 가능합니다.';
    }
    
    if (!formData.modelId || formData.modelId === '') {
      errors.modelId = '모델 선택은 필수입니다.';
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
        modelId: parseInt(formData.modelId)
      };
      
      if (editingPipeline) {
        await updatePipeline(editingPipeline.id, submitData);
        showNotification('파이프라인이 성공적으로 수정되었습니다.', 'success');
      } else {
        await createPipeline(submitData);
        showNotification('파이프라인이 성공적으로 생성되었습니다.', 'success');
      }
      handleCloseModal();
      fetchPipelines();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '파이프라인 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 파이프라인을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deletePipeline(id);
      showNotification('파이프라인이 성공적으로 삭제되었습니다.', 'success');
      fetchPipelines();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '파이프라인 삭제에 실패했습니다.';
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

  const getModelName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : `모델 ID: ${modelId}`;
  };

  if (loading && pipelines.length === 0) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">파이프라인</h1>
      <div className="page-content">
        <div className="search-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>모델 필터:</span>
            <select
              className="form-select"
              value={filterModelId}
              onChange={(e) => setFilterModelId(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">전체</option>
              {models.map(model => (
                <option key={model.id} value={model.id.toString()}>
                  {model.name}
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
                <th>이름</th>
                <th>모델</th>
                <th>상태</th>
                <th>생성일</th>
                <th>수정일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-message">파이프라인 데이터가 없습니다.</td>
                </tr>
              ) : (
                pipelines.map((pipeline) => (
                  <tr key={pipeline.id}>
                    <td>{pipeline.id}</td>
                    <td>{pipeline.name}</td>
                    <td>{getModelName(pipeline.modelId)}</td>
                    <td>{pipeline.status || '-'}</td>
                    <td>{formatDate(pipeline.createdAt)}</td>
                    <td>{formatDate(pipeline.updatedAt)}</td>
                    <td>
                      <button 
                        className="btn-edit" 
                        onClick={() => handleOpenModal(pipeline)}
                      >
                        수정
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(pipeline.id)}
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
            새 파이프라인 생성
          </button>
        </div>
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
              파이프라인 이름 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="파이프라인 이름을 입력하세요"
            />
            {formErrors.name && (
              <div className="form-error">{formErrors.name}</div>
            )}
            <div className="form-help">최대 100자</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              모델 <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={formData.modelId}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
            >
              <option value="">모델을 선택하세요</option>
              {models.map(model => (
                <option key={model.id} value={model.id.toString()}>
                  {model.name} {model.version ? `(v${model.version})` : ''}
                </option>
              ))}
            </select>
            {formErrors.modelId && (
              <div className="form-error">{formErrors.modelId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">상태</label>
            <input
              type="text"
              className="form-input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="예: active, inactive"
            />
            {formErrors.status && (
              <div className="form-error">{formErrors.status}</div>
            )}
            <div className="form-help">최대 50자</div>
          </div>

          <div className="form-group">
            <label className="form-label">설정 (JSON)</label>
            <textarea
              className="form-textarea"
              value={formData.configuration}
              onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
              placeholder='{"key": "value"}'
              rows="6"
            />
            <div className="form-help">JSON 형식의 설정 정보를 입력하세요</div>
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

export default Pipeline;

