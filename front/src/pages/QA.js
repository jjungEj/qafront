import React, { useState, useEffect, useCallback } from 'react';
import { 
  getQaResults,
  getQaResult,
  getQaDocumentByResultId,
  updateQaStatus,
  getQaComments,
  createQaComment,
  updateResultSheetHtml
} from '../utils/api';
import { formatDateTime, formatFileSize, formatProcessingTime } from '../utils/format';
import Modal from '../components/Modal';
import { NotificationContainer } from '../components/Notification';
import './Page.css';

const QA = () => {
  const [results, setResults] = useState([]);
  const [qaDocuments, setQaDocuments] = useState({}); // resultId -> QaDocument
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [qaDocument, setQaDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [commentForm, setCommentForm] = useState({
    comment: '',
    modifiedField: ''
  });

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchQaResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getQaResults();
      const resultsData = response.data || [];
      setResults(resultsData);
      
      // 각 결과의 QA 문서 정보 로드
      const qaDocs = {};
      await Promise.all(
        resultsData.map(async (result) => {
          try {
            const qaDocResponse = await getQaDocumentByResultId(result.id);
            qaDocs[result.id] = qaDocResponse.data;
          } catch (error) {
            // QA 문서가 없을 수 있음
            qaDocs[result.id] = null;
          }
        })
      );
      setQaDocuments(qaDocs);
    } catch (error) {
      showNotification('QA 결과 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchQaResults();
  }, [fetchQaResults]);

  const fetchQaDetail = async (resultId) => {
    try {
      // QA 결과 상세 조회 (결과 상세 + 코멘트 포함)
      const resultResponse = await getQaResult(resultId);
      const resultData = resultResponse.data;
      setSelectedResult(resultData);
      
      // 결과에 qaComments가 포함되어 있으면 사용
      if (resultData.qaComments && Array.isArray(resultData.qaComments)) {
        setComments(resultData.qaComments);
      } else {
        // 없으면 별도로 조회
        try {
          const commentsResponse = await getQaComments(resultId);
          setComments(commentsResponse.data || []);
        } catch (error) {
          setComments([]);
        }
      }
      
      // QA 문서 정보 조회
      try {
        const qaDocResponse = await getQaDocumentByResultId(resultId);
        setQaDocument(qaDocResponse.data);
      } catch (error) {
        // QA 문서가 없을 수 있음
        setQaDocument(null);
      }
      
      setIsDetailModalOpen(true);
    } catch (error) {
      showNotification('QA 상세 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleHtmlEdit = (sheet) => {
    setEditingSheetId(sheet.id);
    setEditedHtml(sheet.htmlContent || '');
  };

  const handleHtmlSave = async (resultId, sheetId, htmlContent) => {
    try {
      // HTML 수정
      await updateResultSheetHtml(resultId, sheetId, htmlContent);
      
      // 코멘트 추가 (있는 경우)
      if (commentForm.comment.trim()) {
        try {
          await createQaComment(resultId, {
            comment: commentForm.comment.trim(),
            modifiedField: commentForm.modifiedField || 'htmlContent'
          });
        } catch (error) {
          console.error('코멘트 추가 실패:', error);
          // HTML 수정은 성공했지만 코멘트 추가 실패는 경고만 표시
          showNotification('HTML은 수정되었지만 코멘트 추가에 실패했습니다.', 'warning');
        }
      }
      
      showNotification('HTML이 성공적으로 수정되었습니다.', 'success');
      setEditingSheetId(null);
      setEditedHtml('');
      setCommentForm({ comment: '', modifiedField: '' });
      
      // 상세 정보 다시 불러오기
      await fetchQaDetail(resultId);
      
      // QA 결과 목록도 업데이트
      fetchQaResults();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'HTML 수정에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResult || !commentForm.comment.trim()) return;

    try {
      await createQaComment(selectedResult.id, {
        comment: commentForm.comment.trim(),
        modifiedField: commentForm.modifiedField || null
      });
      showNotification('코멘트가 추가되었습니다.', 'success');
      setCommentForm({ comment: '', modifiedField: '' });
      
      // 상세 정보 다시 불러오기 (코멘트 포함)
      await fetchQaDetail(selectedResult.id);
      
      // QA 결과 목록도 업데이트
      fetchQaResults();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '코멘트 추가에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedResult) return;
    
    try {
      await updateQaStatus(selectedResult.id, {
        documentType: qaDocument?.documentType || 'HTML',
        qaContent: qaDocument?.qaContent || '',
        status: status
      });
      
      showNotification('상태가 업데이트되었습니다.', 'success');
      
      // QA 문서 정보 다시 로드
      try {
        const qaDocResponse = await getQaDocumentByResultId(selectedResult.id);
        setQaDocument(qaDocResponse.data);
      } catch (error) {
        console.error('QA 문서 정보를 불러오는데 실패했습니다.', error);
      }
      
      // QA 결과 목록도 업데이트
      fetchQaResults();
    } catch (error) {
      const errorMessage = error.response?.data?.message || '상태 업데이트에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const getDocumentTypeBadge = (type) => {
    if (type === 'HTML') {
      return <span className="status-badge status-info">HTML</span>;
    }
    if (type === 'KingMaker') {
      return <span className="status-badge status-warning">KingMaker</span>;
    }
    return <span className="status-badge">{type || 'HTML'}</span>;
  };

  const getStatusBadge = (status) => {
    if (status === '확인 필요') {
      return <span className="status-badge status-success">확인 필요</span>;
    }
    if (status === '확인 완료') {
      return <span className="status-badge status-warning">확인 완료</span>;
    }
    return <span className="status-badge">{status || '확인 필요'}</span>;
  };

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">QA</h1>
      <div className="page-content">
        <div className="action-buttons" style={{ marginBottom: '20px' }}>
          <button className="btn-secondary">HTML 변환</button>
          <button className="btn-secondary">KingMaker 적용</button>
          <button className="btn-primary">자동 확인</button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>문서명</th>
                <th>문서 유형</th>
                <th>QA 내용</th>
                <th>생성 일시</th>
                <th>상태</th>
                <th>확인</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-message">로딩 중...</td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">QA 데이터가 없습니다.</td>
                </tr>
              ) : (
                results.map((result) => {
                  const qaDoc = qaDocuments[result.id] || {};
                  return (
                    <tr key={result.id}>
                      <td>{result.documentName || result.originalFileName || '-'}</td>
                      <td>{getDocumentTypeBadge(qaDoc.documentType || 'HTML')}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {qaDoc.qaContent || '해당 문서는 QA 대상이 아니므로 확인이 필요합니다.'}
                      </td>
                      <td>{formatDateTime(result.startedAt)}</td>
                      <td>{getStatusBadge(qaDoc.status || '확인 필요')}</td>
                      <td>
                        <button 
                          className="btn-view" 
                          onClick={() => fetchQaDetail(result.id)}
                        >
                          상세 보기
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

      {/* QA 상세 모달 */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedResult(null);
          setQaDocument(null);
          setComments([]);
          setEditingSheetId(null);
          setEditedHtml('');
          setCommentForm({ comment: '', modifiedField: '' });
        }}
        title="QA 상세"
        size="large"
      >
        {selectedResult && (
          <div>
            {/* 문서 정보 */}
            <div className="form-group">
              <label className="form-label">문서명</label>
              <div><h2 style={{ margin: 0 }}>{selectedResult.documentName || selectedResult.originalFileName || '-'}</h2></div>
            </div>
            
            <div className="form-group">
              <label className="form-label">상태</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>상태: </span>
                <select
                  className="form-select"
                  value={qaDocument?.status || '확인 필요'}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  style={{ width: '200px' }}
                >
                  <option value="확인 필요">확인 필요</option>
                  <option value="확인 완료">확인 완료</option>
                </select>
              </div>
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

            {/* HTML Table 표시 및 수정 */}
            {selectedResult.sheets && selectedResult.sheets.length > 0 && (
              <div className="form-group">
                <label className="form-label">추출된 데이터 (HTML)</label>
                {selectedResult.sheets.map((sheet, index) => {
                  const isEditing = editingSheetId === sheet.id;
                  const currentHtml = isEditing ? editedHtml : (sheet.htmlContent || '');
                  
                  return (
                    <div key={sheet.id || index} style={{ marginBottom: '20px', border: '1px solid #dee2e6', padding: '12px', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0 }}>{sheet.sheetName || `시트 ${index + 1}`}</h4>
                        {!isEditing ? (
                          <button 
                            className="btn-edit" 
                            onClick={() => handleHtmlEdit(sheet)}
                          >
                            HTML 수정하기
                          </button>
                        ) : (
                          <div>
                            <button 
                              className="btn-primary" 
                              onClick={() => handleHtmlSave(selectedResult.id, sheet.id, editedHtml)}
                              style={{ marginRight: '8px' }}
                            >
                              저장
                            </button>
                            <button 
                              className="btn-secondary" 
                              onClick={() => {
                                setEditingSheetId(null);
                                setEditedHtml('');
                                setCommentForm({ comment: '', modifiedField: '' });
                              }}
                            >
                              취소
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div>
                          <textarea
                            className="form-textarea"
                            value={currentHtml}
                            onChange={(e) => setEditedHtml(e.target.value)}
                            rows="15"
                            style={{ fontFamily: 'monospace', width: '100%', marginBottom: '12px' }}
                          />
                          <div className="form-group" style={{ marginTop: '12px' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="수정한 필드명 (예: htmlContent)"
                              value={commentForm.modifiedField}
                              onChange={(e) => setCommentForm({ ...commentForm, modifiedField: e.target.value })}
                              style={{ marginBottom: '8px' }}
                            />
                            <textarea
                              className="form-textarea"
                              placeholder="수정 내용에 대한 코멘트를 입력하세요"
                              value={commentForm.comment}
                              onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                              rows="3"
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="sheet-html-content"
                          dangerouslySetInnerHTML={{ __html: currentHtml }}
                          style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #dee2e6', padding: '8px', borderRadius: '4px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 코멘트 섹션 */}
            <div className="form-group">
              <label className="form-label">코멘트</label>
              <form onSubmit={handleCommentSubmit} style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    value={commentForm.comment}
                    onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                    placeholder="코멘트를 입력하세요"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    value={commentForm.modifiedField}
                    onChange={(e) => setCommentForm({ ...commentForm, modifiedField: e.target.value })}
                    placeholder="수정한 필드명 (선택사항)"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  코멘트 추가
                </button>
              </form>

              {comments.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ 
                      padding: '12px', 
                      marginBottom: '8px', 
                      border: '1px solid #dee2e6', 
                      borderRadius: '4px',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>{comment.comment}</strong>
                      </div>
                      {comment.modifiedField && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                          수정 필드: {comment.modifiedField}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {formatDateTime(comment.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedResult(null);
                  setQaDocument(null);
                  setComments([]);
                  setEditingSheetId(null);
                  setEditedHtml('');
                  setCommentForm({ comment: '', modifiedField: '' });
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QA;
