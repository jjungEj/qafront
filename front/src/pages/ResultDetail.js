import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResult, updateResultSheetHtml, createQaComment } from '../utils/api';
import { formatFileSize, formatDateTime, formatProcessingTime } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import { NotificationContainer } from '../components/Notification';
import './Page.css';

const ResultDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [commentForm, setCommentForm] = useState({
    comment: '',
    modifiedField: ''
  });
  const [isOriginalImageExpanded, setIsOriginalImageExpanded] = useState(false);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchResultDetail = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getResult(id);
      setResult(response.data);
    } catch (error) {
      showNotification('결과 상세 정보를 불러오는데 실패했습니다.', 'error');
      navigate('/results');
    } finally {
      setLoading(false);
    }
  }, [id, showNotification, navigate]);

  useEffect(() => {
    fetchResultDetail();
  }, [fetchResultDetail]);

  const handleHtmlEdit = (sheet) => {
    setEditingSheetId(sheet.id);
    setEditedHtml(sheet.htmlContent || '');
    setCommentForm({ comment: '', modifiedField: '' });
  };

  const handleHtmlSave = async (sheetId, htmlContent) => {
    if (!id) return;
    
    try {
      // HTML 수정
      await updateResultSheetHtml(id, sheetId, htmlContent);
      
      // 코멘트 추가 (있는 경우)
      if (commentForm.comment.trim()) {
        try {
          await createQaComment(id, {
            comment: commentForm.comment.trim(),
            modifiedField: commentForm.modifiedField || 'htmlContent'
          });
        } catch (error) {
          console.error('코멘트 추가 실패:', error);
        }
      }
      
      showNotification('HTML이 성공적으로 수정되었습니다.', 'success');
      setEditingSheetId(null);
      setEditedHtml('');
      setCommentForm({ comment: '', modifiedField: '' });
      
      // 상세 정보 다시 불러오기
      await fetchResultDetail();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'HTML 수정에 실패했습니다.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleDownloadJson = () => {
    if (!result || !result.sheets) return;
    
    try {
      const jsonData = result.sheets.map(sheet => ({
        sheetName: sheet.sheetName,
        htmlContent: sheet.htmlContent
      }));
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${result.documentName || 'result'}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showNotification('JSON 파일을 다운로드했습니다.', 'success');
    } catch (error) {
      showNotification('JSON 다운로드에 실패했습니다.', 'error');
    }
  };

  const getImagePreviewSrc = (imageBase64) => {
    if (!imageBase64) return null;
    return imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>결과를 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title">결과 조회</h1>
        <button className="btn-secondary" onClick={() => navigate('/results')}>
          목록으로
        </button>
      </div>
      
      <div className="page-content">
        {/* 문서 정보 */}
        <div className="document-info" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '16px' }}>{result.documentName || result.originalFileName || `결과 #${result.id}`}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>처리 완료</div>
              <div style={{ fontWeight: 600 }}>{result.status === 'COMPLETED' ? '완료' : '미완료'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>처리 시간</div>
              <div style={{ fontWeight: 600 }}>{formatProcessingTime(result.startedAt, result.finishedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>문서 크기</div>
              <div style={{ fontWeight: 600 }}>{formatFileSize(result.originalFileSize)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>처리 일시</div>
              <div style={{ fontWeight: 600 }}>{formatDateTime(result.finishedAt)}</div>
            </div>
          </div>
        </div>

        {/* 원본 이미지 섹션 (접기/펼치기) */}
        <div style={{ marginBottom: '24px', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
          <div 
            style={{ 
              padding: '12px 16px', 
              backgroundColor: '#f8f9fa', 
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onClick={() => setIsOriginalImageExpanded(!isOriginalImageExpanded)}
          >
            <h3 style={{ margin: 0 }}>원본 이미지</h3>
            <span>{isOriginalImageExpanded ? '▼' : '▶'}</span>
          </div>
          {isOriginalImageExpanded && (
            <div style={{ padding: '16px' }}>
              {result.sheets && result.sheets.length > 0 && result.sheets[0].imageBase64 ? (
                <img 
                  src={getImagePreviewSrc(result.sheets[0].imageBase64)} 
                  alt="원본 이미지"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  원본 이미지가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 추출된 데이터 (HTML) 섹션 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>추출된 데이터 (HTML)</h2>
            <div>
              <button className="btn-secondary" onClick={handleDownloadJson} style={{ marginRight: '8px' }}>
                JSON 다운로드
              </button>
            </div>
          </div>

          {result.sheets && result.sheets.length > 0 ? (
            result.sheets.map((sheet, index) => {
              const isEditing = editingSheetId === sheet.id;
              const currentHtml = isEditing ? editedHtml : (sheet.htmlContent || '');
              
              return (
                <div key={sheet.id || index} style={{ marginBottom: '20px', border: '1px solid #dee2e6', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>{sheet.sheetName || `시트 ${index + 1}`}</h3>
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
                          onClick={() => handleHtmlSave(sheet.id, editedHtml)}
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
                      style={{ 
                        maxHeight: '600px', 
                        overflow: 'auto', 
                        border: '1px solid #dee2e6', 
                        padding: '12px', 
                        borderRadius: '4px',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              추출된 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultDetail;

