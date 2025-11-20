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
  uploadQaHtmlFile,
  uploadQaFilesBatch,
  getQaFiles,
  deleteQaFile
} from '../utils/api';
import { formatDateTime, formatFileSize } from '../utils/format';
import LocalFileUploader from '../components/LocalFileUploader';
import { NotificationContainer } from '../components/Notification';
import './Page.css';

const PAGE_SIZE = 10;
const MAX_BATCH_COUNT = 5;

const QA = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [failedUploads, setFailedUploads] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchFiles = useCallback(async (targetPage = 0, targetKeyword = '') => {
    try {
      setLoading(true);
      const params = { page: targetPage, size: PAGE_SIZE };
      if (targetKeyword) {
        params.keyword = targetKeyword;
      }

      const response = await getQaFiles(params);
      const data = response.data ?? {};
      const resolvedFiles = Array.isArray(data)
        ? data
        : (data.files ?? data.content ?? data.items ?? []);

      const resolvedTotalPages = typeof data.totalPages === 'number'
        ? data.totalPages
        : (typeof data.totalPage === 'number'
          ? data.totalPage
          : (resolvedFiles.length > 0 ? 1 : 0));

      const resolvedTotalElements = typeof data.totalElements === 'number'
        ? data.totalElements
        : (typeof data.total === 'number'
          ? data.total
          : resolvedFiles.length);

      setFiles(resolvedFiles);
      setTotalPages(resolvedTotalPages);
      setTotalElements(resolvedTotalElements);
    } catch (error) {
      showNotification('파일 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

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

  const refetchCurrentPage = useCallback(() => {
    return fetchFiles(page, keyword);
  }, [fetchFiles, page, keyword]);

  useEffect(() => {
    fetchFiles(page, keyword);
  }, [fetchFiles, page, keyword]);

  const handleExcelUpload = useCallback(async (file) => {
    try {
      const response = await uploadQaFile(file);
      showNotification('파일이 성공적으로 업로드되었습니다.', 'success');
      setFailedUploads([]);
      refetchCurrentPage();
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        const message = error.response?.data?.message || '이미 업로드 된 파일입니다.';
        showNotification(message, 'warning');
      } else {
        const errorMessage = buildErrorMessage(error, '파일 업로드에 실패했습니다.');
        showNotification(errorMessage, 'error');
      }
      throw error;
    }
  }, [showNotification, refetchCurrentPage, buildErrorMessage]);

  const handleHtmlUpload = useCallback(async (file) => {
    try {
      const response = await uploadQaHtmlFile(file);
      showNotification('HTML 파일이 성공적으로 업로드되었습니다.', 'success');
      setFailedUploads([]);
      refetchCurrentPage();
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        const message = error.response?.data?.message || '이미 업로드 된 파일입니다.';
        showNotification(message, 'warning');
      } else {
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
      }
      throw error;
    }
  }, [showNotification, refetchCurrentPage, buildErrorMessage]);

  const handleBatchUpload = useCallback(async (selectedFiles) => {
    try {
      const response = await uploadQaFilesBatch(selectedFiles);
      const data = response.data ?? {};
      const uploadedFiles = data.uploadedFiles ?? [];
      const failedFiles = data.failedFiles ?? [];

      if (uploadedFiles.length > 0) {
        showNotification(`${uploadedFiles.length}개 파일이 업로드되었습니다.`, 'success');
        refetchCurrentPage();
      }

      if (failedFiles.length > 0) {
        failedFiles.forEach((item) => {
          const reason = item.reason || '업로드에 실패했습니다.';
          const name = item.fileName || '알 수 없는 파일';
          showNotification(`${name}: ${reason}`, 'warning');
        });
      }

      setFailedUploads(failedFiles);
      return data;
    } catch (error) {
      if (error.response?.status === 409) {
        const message = error.response?.data?.message || '이미 업로드 된 파일입니다.';
        showNotification(message, 'warning');
      } else {
        const errorMessage = buildErrorMessage(error, '다중 업로드에 실패했습니다.');
        showNotification(errorMessage, 'error');
      }
      throw error;
    }
  }, [showNotification, refetchCurrentPage, buildErrorMessage]);

  const handleOpenDetail = (fileId) => {
    navigate(`/qa/files/${fileId}`);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`"${fileName}" 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteQaFile(fileId);
      showNotification('파일이 삭제되었습니다.', 'success');
      refetchCurrentPage();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '파일 삭제에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0) {
      return;
    }
    if (totalPages && nextPage >= totalPages) {
      return;
    }
    if (nextPage === page) {
      return;
    }

    setPage(nextPage);
  };

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setKeyword(searchInput.trim());
  };

  const handleResetSearch = () => {
    if (!searchInput && !keyword) {
      return;
    }
    setSearchInput('');
    setKeyword('');
    setPage(0);
  };

  const hasPagination = totalPages > 1;

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">QA 파일 관리</h1>
      <div className="page-content">
        <div className="action-buttons" style={{ marginBottom: '20px' }}>
          <LocalFileUploader 
            onExcelUpload={handleExcelUpload}
            onHtmlUpload={handleHtmlUpload}
            onBatchUpload={handleBatchUpload}
            maxBatchCount={MAX_BATCH_COUNT}
          />
        </div>

        <form className="search-section" onSubmit={handleSearchSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder="파일명 또는 확인 사항으로 검색"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          <button className="btn-primary" type="submit">
            검색
          </button>
          <button 
            className="btn-secondary" 
            type="button" 
            onClick={handleResetSearch}
            disabled={!keyword && !searchInput}
          >
            초기화
          </button>
        </form>

        <div className="table-meta">
          {`총 ${totalElements}건`}
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

        {hasPagination && (
          <div className="pagination">
            <button
              type="button"
              className="pagination__button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={`page-${index}`}
                type="button"
                className={`pagination__button${page === index ? ' active' : ''}`}
                onClick={() => handlePageChange(index)}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              className="pagination__button"
              onClick={() => handlePageChange(page + 1)}
              disabled={totalPages !== 0 && page >= totalPages - 1}
            >
              다음
            </button>
          </div>
        )}

        {failedUploads.length > 0 && (
          <div className="upload-feedback">
            <h3>업로드 실패 파일</h3>
            <ul>
              {failedUploads.map((item, index) => (
                <li key={`${item.fileName || 'unknown'}-${index}`}>
                  <span className="upload-feedback__name">{item.fileName || `파일 ${index + 1}`}</span>
                  <span className="upload-feedback__reason">{item.reason || '원인을 확인할 수 없습니다.'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QA;
