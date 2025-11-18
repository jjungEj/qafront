/**
* @ClassName	: QA.js
* @Description	: QA 파일 관리 페이지, 파일 목록 조회, 업로드, 삭제 기능 제공
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - QA 파일 목록 조회 및 표시
* 								- 파일 업로드 및 삭제 기능
* 								- 파일 상세 페이지로 이동 기능
*/
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  uploadQaFile,
  getQaFiles,
  deleteQaFile
} from '../utils/api';
import { formatDateTime, formatFileSize } from '../utils/format';
import LocalFileUploader from '../components/LocalFileUploader';
import { NotificationContainer } from '../components/Notification';
import './Page.css';

const QA = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getQaFiles();
      setFiles(response.data || []);
    } catch (error) {
      showNotification('파일 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = useCallback(async (file) => {
    try {
      const response = await uploadQaFile(file);
      showNotification('파일이 성공적으로 업로드되었습니다.', 'success');
      fetchFiles();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors?.map(e => e.message).join(', ')) ||
                          '파일 업로드에 실패했습니다.';
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification, fetchFiles]);

  const handleOpenDetail = (fileId) => {
    // 같은 화면에서 상세 페이지로 이동
    navigate(`/qa/files/${fileId}`);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`"${fileName}" 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteQaFile(fileId);
      showNotification('파일이 삭제되었습니다.', 'success');
      fetchFiles(); // 목록 새로고침
    } catch (error) {
      const errorMessage = error.response?.data?.message || '파일 삭제에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">QA 파일 관리</h1>
      <div className="page-content">
        <div className="action-buttons" style={{ marginBottom: '20px' }}>
          <LocalFileUploader onUpload={handleFileUpload} />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>파일 크기</th>
                <th>타입</th>
                <th>확인 사항</th>
                <th>업로드 일시</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-message">로딩 중...</td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">파일이 없습니다.</td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.fileName}</td>
                    <td>{formatFileSize(file.fileSize)}</td>
                    <td>{file.fileType?.toUpperCase() || '-'}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.feedback || '-'}
                    </td>
                    <td>{formatDateTime(file.uploadedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-view" 
                          onClick={() => handleOpenDetail(file.id)}
                        >
                          전체 보기
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleDeleteFile(file.id, file.fileName)}
                          style={{ 
                            backgroundColor: '#dc3545', 
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="파일 삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QA;
