import React, { useState, useEffect } from 'react';
import { getModels, createModel, updateModel, deleteModel } from '../utils/api';
import Modal from '../components/Modal';
import Notification, { NotificationContainer } from '../components/Notification';
import './Page.css';

const ModelManagement = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await getModels();
      setModels(response.data);
    } catch (error) {
      showNotification('모델 목록을 불러오는데 실패했습니다.', 'error');
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

  const handleOpenModal = (model = null) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        name: model.name || '',
        description: model.description || '',
        version: model.version || ''
      });
    } else {
      setEditingModel(null);
      setFormData({
        name: '',
        description: '',
        version: ''
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
    setFormData({
      name: '',
      description: '',
      version: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '모델 이름은 필수입니다.';
    } else if (formData.name.length > 100) {
      errors.name = '모델 이름은 최대 100자까지 입력 가능합니다.';
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = '설명은 최대 500자까지 입력 가능합니다.';
    }
    
    if (formData.version && formData.version.length > 50) {
      errors.version = '버전은 최대 50자까지 입력 가능합니다.';
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
      if (editingModel) {
        await updateModel(editingModel.id, formData);
        showNotification('모델이 성공적으로 수정되었습니다.', 'success');
      } else {
        await createModel(formData);
        showNotification('모델이 성공적으로 생성되었습니다.', 'success');
      }
      handleCloseModal();
      fetchModels();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '모델 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 모델을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteModel(id);
      showNotification('모델이 성공적으로 삭제되었습니다.', 'success');
      fetchModels();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '모델 삭제에 실패했습니다.';
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

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">모델 관리</h1>
      <div className="page-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>모델명</th>
                <th>설명</th>
                <th>버전</th>
                <th>생성일</th>
                <th>수정일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-message">모델 데이터가 없습니다.</td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr key={model.id}>
                    <td>{model.id}</td>
                    <td>{model.name}</td>
                    <td>{model.description || '-'}</td>
                    <td>{model.version || '-'}</td>
                    <td>{formatDate(model.createdAt)}</td>
                    <td>{formatDate(model.updatedAt)}</td>
                    <td>
                      <button 
                        className="btn-edit" 
                        onClick={() => handleOpenModal(model)}
                      >
                        수정
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(model.id)}
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
            새 모델 추가
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingModel ? '모델 수정' : '새 모델 추가'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              모델명 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="모델 이름을 입력하세요"
            />
            {formErrors.name && (
              <div className="form-error">{formErrors.name}</div>
            )}
            <div className="form-help">최대 100자</div>
          </div>

          <div className="form-group">
            <label className="form-label">설명</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="모델에 대한 설명을 입력하세요"
              rows="4"
            />
            {formErrors.description && (
              <div className="form-error">{formErrors.description}</div>
            )}
            <div className="form-help">최대 500자</div>
          </div>

          <div className="form-group">
            <label className="form-label">버전</label>
            <input
              type="text"
              className="form-input"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="예: 1.0"
            />
            {formErrors.version && (
              <div className="form-error">{formErrors.version}</div>
            )}
            <div className="form-help">최대 50자</div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingModel ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ModelManagement;

