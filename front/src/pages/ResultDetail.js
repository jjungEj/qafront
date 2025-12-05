/**
* @ClassName  : ResultDetail.js
* @Description : 결과 상세 페이지, QA 시작 버튼 및 빈 상태 안내
*/
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getResultDetail, requestResultQa } from '../utils/api';
import { formatDateTimeWithoutSeconds, formatFileSize } from '../utils/format';
import './Page.css';
import './Results.css';

const ResultDetail = () => {
  const { fileName: encodedFileName } = useParams();
  const targetFileName = encodedFileName ? decodeURIComponent(encodedFileName) : '';
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState(null);
  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    if (!targetFileName) {
      setError('파일명이 필요합니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getResultDetail(targetFileName);
      const payload = response?.data ?? {};
      const data =
        payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : payload;
      setDetail({
        fileName: data?.fileName || targetFileName,
        folder: data?.folder || '-',
        fileSize: data?.fileSize,
        lastModifiedAt: data?.lastModifiedAt,
      });
    } catch (err) {
      const message = err?.response?.data?.message || '결과 상세 정보를 불러오지 못했습니다.';
      setError(message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [targetFileName]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStartQa = async () => {
    if (!targetFileName || qaLoading) {
      return;
    }
    setQaLoading(true);
    setQaError(null);
    try {
      const response = await requestResultQa(targetFileName);
      const payload = response?.data ?? {};
      const data =
        payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : payload;
      const workspaceFileName = data?.fileName || payload?.fileName;
      if (!workspaceFileName) {
        throw new Error('QA 워크스페이스 파일명을 확인할 수 없습니다.');
      }
      navigate('/qa', { state: { qaTargetFileName: workspaceFileName } });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'QA 요청에 실패했습니다.';
      setQaError(message);
    } finally {
      setQaLoading(false);
    }
  };

  const meta = detail || {
    fileName: targetFileName || '-',
    folder: '-',
    fileSize: null,
    lastModifiedAt: null,
  };

  return (
    <div className="page-container">
      <h1 className="page-title">결과 상세</h1>
      <div className="page-content">
        <div className="result-detail-actions">
          <Link className="btn-secondary" to="/results">
            목록으로
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchDetail}
            disabled={loading}
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
        {error && <div className="results-error">{error}</div>}
        {loading ? (
          <div className="results-empty">불러오는 중...</div>
        ) : (
          <>
            <div className="result-meta-grid">
              <div className="result-meta-item">
                <span>파일명</span>
                <strong>{meta.fileName}</strong>
              </div>
              <div className="result-meta-item">
                <span>폴더</span>
                <strong>{meta.folder || '-'}</strong>
              </div>
              <div className="result-meta-item">
                <span>파일 크기</span>
                <strong>{formatFileSize(meta.fileSize)}</strong>
              </div>
              <div className="result-meta-item">
                <span>최종 수정</span>
                <strong>{formatDateTimeWithoutSeconds(meta.lastModifiedAt)}</strong>
              </div>
            </div>

            <div className="result-section">
              <div className="result-section-header">
                <h2>문서 이미지</h2>
              </div>
              <div className="result-placeholder">
                문서 이미지가 아직 제공되지 않았습니다. 추후 이미지가 준비되면 이 영역에 렌더링됩니다.
              </div>
            </div>

            <div className="result-section">
              <div className="result-section-header">
                <h2>HTML Table</h2>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStartQa}
                  disabled={qaLoading || !targetFileName}
                >
                  {qaLoading ? 'QA 준비 중...' : 'QA 진행'}
                </button>
              </div>
              {qaError && <div className="results-error">{qaError}</div>}
              <div className="result-placeholder">
                HTML Table 데이터가 아직 없음으로 표시됩니다. &quot;QA 진행&quot;을 누르면 해당 파일이
                QA 워크스페이스(<code>back/workspace/before</code>)로 복사되고, QA 페이지에서 즉시 편집이
                가능합니다.
              </div>
            </div>

            <div className="result-section">
              <div className="result-section-header">
                <h2>추출 결과</h2>
              </div>
              <div className="result-placeholder">
                추출 결과가 아직 존재하지 않습니다. QA 과정을 완료하면 이 영역에서 결과를 표시할 수
                있습니다.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultDetail;

