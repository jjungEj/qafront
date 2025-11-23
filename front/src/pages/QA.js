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
import { 
  uploadQaFile,
  uploadQaHtmlFile,
  uploadQaFilesMultiple,
  getQaFilesPaged,
  searchQaFiles,
  deleteQaFile
} from '../utils/api';
import { formatDateTime, formatFileSize } from '../utils/format';
import LocalFileUploader from '../components/LocalFileUploader';
import { NotificationContainer } from '../components/Notification';
import Modal from '../components/Modal';
import QADetail from './QADetail';
import './Page.css';

const QA = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [pageData, setPageData] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const pageSize = 5;

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchFiles = useCallback(async (page = 0, keyword = '') => {
    try {
      setLoading(true);
      let response;
      
      if (keyword.trim()) {
        // 검색 모드
        response = await searchQaFiles(keyword, page, pageSize);
        setIsSearching(true);
      } else {
        // 페이징 모드
        response = await getQaFilesPaged(page, pageSize);
        setIsSearching(false);
      }
      
      const data = response.data || {};
      setPageData(data);
      setFiles(data.content || []);
      setCurrentPage(data.page || 0);
    } catch (error) {
      showNotification('파일 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, pageSize]);

  const buildErrorMessage = useCallback((error, fallbackMessage) => {
    const messageFromResponse = error.response?.data?.message;
    if (messageFromResponse) {
      return messageFromResponse;
    }

    const fieldErrors = error.response?.data?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      return fieldErrors.map((e) => e.message).join(', ');
    }

    return fallbackMessage;
  }, []);

  useEffect(() => {
    fetchFiles(currentPage, searchKeyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchKeyword]);

  const handleExcelUpload = useCallback(async (file) => {
    try {
      const response = await uploadQaFile(file);
      showNotification('파일이 성공적으로 업로드되었습니다.', 'success');
      setCurrentPage(0);
      fetchFiles(0, searchKeyword).then(() => {
        // 업로드 성공한 파일을 자동으로 선택
        if (response.data && response.data.id) {
          setSelectedFileId(response.data.id);
        }
      });
      return response.data;
    } catch (error) {
      // 409 에러 처리 (중복 파일)
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message || '이미 업로드한 파일입니다.';
        showNotification(errorMessage, 'warning');
        setCurrentPage(0);
        fetchFiles(0, searchKeyword);
        return null;
      }
      const errorMessage = buildErrorMessage(error, '파일 업로드에 실패했습니다.');
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification, fetchFiles, buildErrorMessage, searchKeyword]);

  const handleHtmlUpload = useCallback(async (file) => {
    try {
      const response = await uploadQaHtmlFile(file);
      showNotification('HTML 파일이 성공적으로 업로드되었습니다.', 'success');
      setCurrentPage(0);
      fetchFiles(0, searchKeyword).then(() => {
        // 업로드 성공한 파일을 자동으로 선택
        if (response.data && response.data.id) {
          setSelectedFileId(response.data.id);
        }
      });
      return response.data;
    } catch (error) {
      // 409 에러 처리 (중복 파일)
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message || '이미 업로드한 파일입니다.';
        showNotification(errorMessage, 'warning');
        setCurrentPage(0);
        fetchFiles(0, searchKeyword);
        return null;
      }
      let errorMessage = buildErrorMessage(error, 'HTML 파일 업로드에 실패했습니다.');
      if (error.response?.status === 400) {
        const serverMessage = error.response?.data?.message || '';
        if (!serverMessage || /table/i.test(serverMessage)) {
          errorMessage = '테이블을 찾을 수 없습니다.';
        } else {
          errorMessage = serverMessage;
        }
      }
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification, fetchFiles, buildErrorMessage, searchKeyword]);

  const handleMultipleUpload = useCallback(async (files) => {
    try {
      const response = await uploadQaFilesMultiple(files);
      const result = response.data;
      
      // 중복 파일 알림
      if (result.duplicateFiles && result.duplicateFiles.length > 0) {
        setDuplicateFiles(result.duplicateFiles);
        setShowDuplicateModal(true);
      }
      
      // 성공/실패 알림
      const successCount = result.successFiles?.length || 0;
      const duplicateCount = result.duplicateFiles?.length || 0;
      const errorCount = result.errorFiles?.length || 0;
      
      if (successCount > 0) {
        showNotification(
          `업로드 완료: 성공 ${successCount}개${duplicateCount > 0 ? `, 중복 ${duplicateCount}개` : ''}${errorCount > 0 ? `, 실패 ${errorCount}개` : ''}`,
          successCount === files.length ? 'success' : 'warning'
        );
      } else if (duplicateCount > 0) {
        showNotification(`모든 파일이 중복되었습니다. (${duplicateCount}개)`, 'warning');
      } else if (errorCount > 0) {
        showNotification(`업로드 실패: ${errorCount}개`, 'error');
      }
      
      // 목록 새로고침 및 첫 번째 파일 자동 선택
      if (successCount > 0) {
        setCurrentPage(0);
        fetchFiles(0, searchKeyword).then(() => {
          // 업로드 성공한 첫 번째 파일을 자동으로 선택
          if (result.successFiles && result.successFiles.length > 0) {
            const firstFile = result.successFiles[0];
            setSelectedFileId(firstFile.id);
          }
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = buildErrorMessage(error, '다중 파일 업로드에 실패했습니다.');
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification, fetchFiles, buildErrorMessage, searchKeyword]);

  const handleSelectFile = (fileId) => {
    // 파일 선택 (상세 화면 표시)
    setSelectedFileId(fileId);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`"${fileName}" 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteQaFile(fileId);
      showNotification('파일이 삭제되었습니다.', 'success');
      // 삭제 후 선택된 파일이 삭제된 파일이면 선택 해제
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
      }
      
      // 삭제 후 현재 페이지 유지 (마지막 페이지의 마지막 항목 삭제 시 이전 페이지로 이동)
      const newPage = pageData && files.length === 1 && currentPage > 0 
        ? currentPage - 1 
        : currentPage;
      setCurrentPage(newPage);
      fetchFiles(newPage, searchKeyword);
    } catch (error) {
      const errorMessage = error.response?.data?.message || '파일 삭제에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchFiles(0, searchKeyword);
  };

  const handleSearchReset = () => {
    setSearchKeyword('');
    setCurrentPage(0);
    fetchFiles(0, '');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchFiles(newPage, searchKeyword);
  };

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">QA 파일 관리</h1>
      <div className="page-content">
        {/* 검색 기능과 파일 업로드를 같은 줄에 배치 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap' }}>
          {/* 검색 기능 */}
          <div style={{ flex: '0 0 auto' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="파일명으로 검색..."
                style={{
                  width: '300px',
                  maxWidth: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 16px' }}
              >
                검색
              </button>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  초기화
                </button>
              )}
            </form>
          </div>

          {/* 파일 업로드 */}
          <div className="action-buttons" style={{ flex: '0 0 auto' }}>
            <LocalFileUploader 
              onExcelUpload={handleExcelUpload}
              onHtmlUpload={handleHtmlUpload}
              onMultipleUpload={handleMultipleUpload}
              multiple={true}
            />
          </div>
        </div>

        {/* 파일 목록 정보 */}
        {pageData && (
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
            전체 {pageData.totalElements || 0}개
            {isSearching && searchKeyword && ` (검색어: "${searchKeyword}")`}
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>파일 크기</th>
                <th>타입</th>
                <th>상태</th>
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
                  <td colSpan="6" className="empty-message">
                    {isSearching ? '검색 결과가 없습니다.' : '파일이 없습니다.'}
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr 
                    key={file.id}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedFileId === file.id ? '#e3f2fd' : 'transparent'
                    }}
                    onClick={() => handleSelectFile(file.id)}
                  >
                    <td style={{ fontWeight: selectedFileId === file.id ? 'bold' : 'normal' }}>
                      {file.fileName}
                    </td>
                    <td>{formatFileSize(file.fileSize)}</td>
                    <td>{file.fileType?.toUpperCase() || '-'}</td>
                    <td>
                      {file.updatedAt && file.updatedAt !== file.uploadedAt ? (
                        <span style={{ 
                          color: '#10b981', 
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          backgroundColor: '#d1fae5',
                          borderRadius: '4px'
                        }}>
                          수정완료
                        </span>
                      ) : (
                        <span style={{ 
                          color: '#6b7280', 
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px'
                        }}>
                          대기
                        </span>
                      )}
                    </td>
                    <td>{formatDateTime(file.uploadedAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이징 컨트롤 */}
        {pageData && pageData.totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '12px',
            marginTop: '20px',
            padding: '16px'
          }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pageData.hasPrevious || loading}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              이전
            </button>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              페이지 {currentPage + 1} / {pageData.totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pageData.hasNext || loading}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              다음
            </button>
          </div>
        )}

        {/* 파일 상세 화면 */}
        {selectedFileId && (
          <div style={{ marginTop: '40px', borderTop: '2px solid #dee2e6', paddingTop: '20px' }}>
            <QADetail 
              fileId={selectedFileId} 
              onClose={() => setSelectedFileId(null)}
            />
          </div>
        )}

        {/* 중복 파일 모달 */}
        <Modal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicateFiles([]);
          }}
          title="중복 파일 알림"
        >
          <div>
            <p style={{ marginBottom: '16px' }}>
              다음 파일들은 이미 업로드되어 있습니다:
            </p>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0,
              margin: 0,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {duplicateFiles.map((file, index) => (
                <li 
                  key={index}
                  style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '4px',
                    border: '1px solid #fde68a'
                  }}
                >
                  {file.fileName}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateFiles([]);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default QA;
