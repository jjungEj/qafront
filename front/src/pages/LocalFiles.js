import React, { useState, useEffect, useCallback } from 'react';
import { getLocalFileResults, getResult, uploadLocalFile } from '../utils/api';
import { formatFileSize, formatDateTime, formatProcessingTime } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LocalFileUploader from '../components/LocalFileUploader';
import { NotificationContainer } from '../components/Notification';
import './Page.css';

const LocalFiles = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [selectedResult, setSelectedResult] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const navigate = useNavigate();

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLocalFileResults();
      setResults(response.data || []);
    } catch (error) {
      showNotification('결과 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleOpenDetail = async (resultId) => {
    try {
      const response = await getResult(resultId);
      setSelectedResult(response.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      showNotification('결과 상세 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleViewInResults = (resultId) => {
    navigate(`/results?resultId=${resultId}`);
  };

  const handleFileUpload = useCallback(async (file) => {
    try {
      const response = await uploadLocalFile(file);
      showNotification('파일이 성공적으로 업로드되었습니다.', 'success');
      // 업로드 후 결과 목록 새로고침
      fetchResults();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '파일 업로드에 실패했습니다.';
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification]);

  const getStatusBadge = (status) => {
    return <StatusBadge status={status} size="small" />;
  };

  const filteredResults = results.filter(result => {
    if (filters.status && result.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = result.documentName?.toLowerCase().includes(searchLower);
      const matchesId = result.id?.toString().includes(searchLower);
      if (!matchesName && !matchesId) return false;
    }
    if (filters.startDate && result.startedAt) {
      if (new Date(result.startedAt) < new Date(filters.startDate)) return false;
    }
    if (filters.endDate && result.startedAt) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(result.startedAt) > endDate) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">로컬 파일</h1>
      <div className="page-content">
        <div className="action-buttons" style={{ marginBottom: '20px' }}>
          <LocalFileUploader onUpload={handleFileUpload} />
        </div>
        
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="파일명 검색..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ width: '150px' }}
          >
            <option value="">전체</option>
            <option value="COMPLETED">정상</option>
            <option value="FAILED">오류</option>
            <option value="PENDING">대기</option>
          </select>
          <input
            type="date"
            className="form-input"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            style={{ width: '150px' }}
          />
          <span>~</span>
          <input
            type="date"
            className="form-input"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            style={{ width: '150px' }}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일 이름</th>
                <th>상태</th>
                <th>크기</th>
                <th>건수</th>
                <th>등록일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-message">로딩 중...</td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">결과 데이터가 없습니다.</td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.documentName || result.originalFileName || '-'}</td>
                    <td>{getStatusBadge(result.status)}</td>
                    <td>{formatFileSize(result.originalFileSize)}</td>
                    <td>{result.sheets?.length || 0}건</td>
                    <td>{formatDateTime(result.startedAt)}</td>
                    <td>
                      <button 
                        className="btn-view" 
                        onClick={() => handleOpenDetail(result.id)}
                      >
                        열기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              <label className="form-label">파일명</label>
              <div>{selectedResult.documentName || selectedResult.originalFileName || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">상태</label>
              <div>{getStatusBadge(selectedResult.status)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">처리 완료</label>
              <div>{selectedResult.status === 'COMPLETED' ? '완료' : '미완료'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">처리 시간</label>
              <div>{formatProcessingTime(selectedResult.startedAt, selectedResult.finishedAt)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">문서 크기</label>
              <div>{formatFileSize(selectedResult.originalFileSize)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">처리 일시</label>
              <div>{formatDateTime(selectedResult.finishedAt)}</div>
            </div>
            
            {selectedResult.sheets && selectedResult.sheets.length > 0 && (
              <div className="form-group">
                <label className="form-label">추출된 데이터 (HTML)</label>
                <div style={{ marginTop: '12px' }}>
                  {selectedResult.sheets.map((sheet, index) => (
                    <div key={sheet.id || index} style={{ marginBottom: '20px', border: '1px solid #dee2e6', padding: '12px', borderRadius: '4px' }}>
                      <h4 style={{ marginBottom: '8px' }}>{sheet.sheetName || `시트 ${index + 1}`}</h4>
                      {sheet.htmlContent && (
                        <div 
                          className="sheet-html-content"
                          dangerouslySetInnerHTML={{ __html: sheet.htmlContent }}
                          style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #dee2e6', padding: '8px', borderRadius: '4px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => handleViewInResults(selectedResult.id)}
              >
                결과 페이지에서 보기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LocalFiles;
