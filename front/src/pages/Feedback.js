import React, { useState, useEffect } from 'react';
import { getFeedbacks, createFeedback, updateFeedback, deleteFeedback, getResults } from '../utils/api';
import Modal from '../components/Modal';
import Notification, { NotificationContainer } from '../components/Notification';
import './Page.css';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [formData, setFormData] = useState({
    resultId: '',
    author: '',
    comment: '',
    rating: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [filterResultId, setFilterResultId] = useState('');

  useEffect(() => {
    fetchResults();
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [filterResultId]);

  const fetchResults = async () => {
    try {
      const response = await getResults();
      setResults(response.data);
    } catch (error) {
      showNotification('결과 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const resultId = filterResultId ? parseInt(filterResultId) : null;
      const response = await getFeedbacks(resultId);
      setFeedbacks(response.data);
    } catch (error) {
      showNotification('피드백 목록을 불러오는데 실패했습니다.', 'error');
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

  const handleOpenModal = (feedback = null) => {
    if (feedback) {
      setEditingFeedback(feedback);
      setFormData({
        resultId: feedback.resultId ? feedback.resultId.toString() : '',
        author: feedback.author || '',
        comment: feedback.comment || '',
        rating: feedback.rating ? feedback.rating.toString() : ''
      });
    } else {
      setEditingFeedback(null);
      setFormData({
        resultId: filterResultId || '',
        author: '',
        comment: '',
        rating: ''
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFeedback(null);
    setFormData({
      resultId: '',
      author: '',
      comment: '',
      rating: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.resultId || formData.resultId === '') {
      errors.resultId = '결과 선택은 필수입니다.';
    }
    
    if (!formData.author || formData.author.trim() === '') {
      errors.author = '작성자는 필수입니다.';
    } else if (formData.author.length > 100) {
      errors.author = '작성자는 최대 100자까지 입력 가능합니다.';
    }
    
    if (!formData.comment || formData.comment.trim() === '') {
      errors.comment = '피드백 내용은 필수입니다.';
    } else if (formData.comment.length > 500) {
      errors.comment = '피드백 내용은 최대 500자까지 입력 가능합니다.';
    }
    
    if (formData.rating && (isNaN(formData.rating) || parseFloat(formData.rating) < 0)) {
      errors.rating = '평점은 0 이상의 숫자여야 합니다.';
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
        resultId: parseInt(formData.resultId),
        rating: formData.rating ? parseFloat(formData.rating) : null
      };
      
      if (editingFeedback) {
        await updateFeedback(editingFeedback.id, submitData);
        showNotification('피드백이 성공적으로 수정되었습니다.', 'success');
      } else {
        await createFeedback(submitData);
        showNotification('피드백이 성공적으로 생성되었습니다.', 'success');
      }
      handleCloseModal();
      fetchFeedbacks();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '피드백 저장에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 피드백을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteFeedback(id);
      showNotification('피드백이 성공적으로 삭제되었습니다.', 'success');
      fetchFeedbacks();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '피드백 삭제에 실패했습니다.';
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

  const getResultName = (resultId) => {
    const result = results.find(r => r.id === resultId);
    return result ? `결과 ID: ${resultId}` : `결과 ID: ${resultId}`;
  };

  const renderRating = (rating) => {
    if (!rating) return '-';
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  if (loading && feedbacks.length === 0) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">피드백</h1>
      <div className="page-content">
        <div className="search-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>결과 필터:</span>
            <select
              className="form-select"
              value={filterResultId}
              onChange={(e) => setFilterResultId(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">전체</option>
              {results.map(result => (
                <option key={result.id} value={result.id.toString()}>
                  결과 ID: {result.id}
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
                <th>결과 ID</th>
                <th>작성자</th>
                <th>피드백</th>
                <th>평점</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-message">피드백 데이터가 없습니다.</td>
                </tr>
              ) : (
                feedbacks.map((feedback) => (
                  <tr key={feedback.id}>
                    <td>{feedback.id}</td>
                    <td>{feedback.resultId}</td>
                    <td>{feedback.author}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {feedback.comment}
                    </td>
                    <td>{renderRating(feedback.rating)}</td>
                    <td>{formatDate(feedback.createdAt)}</td>
                    <td>
                      <button 
                        className="btn-edit" 
                        onClick={() => handleOpenModal(feedback)}
                      >
                        수정
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(feedback.id)}
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
            새 피드백 추가
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFeedback ? '피드백 수정' : '새 피드백 추가'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              결과 <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={formData.resultId}
              onChange={(e) => setFormData({ ...formData, resultId: e.target.value })}
            >
              <option value="">결과를 선택하세요</option>
              {results.map(result => (
                <option key={result.id} value={result.id.toString()}>
                  결과 ID: {result.id}
                </option>
              ))}
            </select>
            {formErrors.resultId && (
              <div className="form-error">{formErrors.resultId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              작성자 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="작성자 이름을 입력하세요"
            />
            {formErrors.author && (
              <div className="form-error">{formErrors.author}</div>
            )}
            <div className="form-help">최대 100자</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              피드백 내용 <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="피드백 내용을 입력하세요"
              rows="6"
            />
            {formErrors.comment && (
              <div className="form-error">{formErrors.comment}</div>
            )}
            <div className="form-help">최대 500자</div>
          </div>

          <div className="form-group">
            <label className="form-label">평점</label>
            <input
              type="number"
              className="form-input"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              placeholder="0-5 사이의 숫자"
              min="0"
              max="5"
              step="0.5"
            />
            {formErrors.rating && (
              <div className="form-error">{formErrors.rating}</div>
            )}
            <div className="form-help">0-5 사이의 숫자 (선택사항)</div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingFeedback ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Feedback;

