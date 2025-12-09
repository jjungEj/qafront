/**
* @ClassName  : ResultsList.js
* @Description : 결과 목록 페이지, Result API 연동 및 페이징 카드 UI
*/
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getResultList } from '../utils/api';
import { formatDateTimeWithoutSeconds, formatFileSize } from '../utils/format';
import './Page.css';
import './Results.css';

const PAGE_SIZE = 10;
const DEFAULT_STATE = {
  contents: [],
  navigationPages: [],
  hasPrevious: false,
  hasNext: false,
  page: 0,
  totalElements: 0,
};

const normalizeNumberArray = (source) => {
  if (!Array.isArray(source)) {
    return [];
  }
  return source
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);
};

const ResultsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async (pageToLoad = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getResultList({ page: pageToLoad, size: PAGE_SIZE });
      const payload = response?.data ?? {};
      const data =
        payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : payload;

      const contents = Array.isArray(data.contents)
        ? data.contents
        : Array.isArray(data.content)
          ? data.content
          : [];
      const navigationPages = normalizeNumberArray(data.navigationPages);
      const resolvedPage =
        typeof data.page === 'number'
          ? data.page
          : typeof data.currentPage === 'number'
            ? data.currentPage
            : pageToLoad;
      const rawHasPrevious =
        data.hasPrevious ??
        data.hasPrev ??
        data.previous ??
        null;
      const hasPrevious =
        rawHasPrevious === null ? resolvedPage > 0 : Boolean(rawHasPrevious);
      const hasNext = Boolean(
        data.hasNext ?? data.hasMore ?? data.next ?? data.hasFollowing ?? false
      );
      const totalElements =
        typeof data.totalElements === 'number'
          ? data.totalElements
          : typeof data.total === 'number'
            ? data.total
            : contents.length;

      // 디버깅: completed 값 확인
      console.log('Results API Response - contents:', contents);
      contents.forEach((item, idx) => {
        console.log(`Item ${idx}: fileName=${item?.fileName}, completed=${item?.completed}, folder=${item?.folder}`);
      });

      setState({
        contents,
        navigationPages,
        hasPrevious,
        hasNext,
        page: resolvedPage,
        totalElements,
      });
    } catch (err) {
      const message = err?.response?.data?.message || '결과 목록을 불러오지 못했습니다.';
      setError(message);
      setState((prev) => ({
        ...prev,
        contents: [],
        navigationPages: [],
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryPage = Number(searchParams.get('page'));
    const resolvedPage = Number.isNaN(queryPage) ? 0 : Math.max(queryPage, 0);
    fetchResults(resolvedPage);
  }, [searchParams, fetchResults]);

  const navIsZeroBased = useMemo(
    () => state.navigationPages.some((value) => value === 0),
    [state.navigationPages]
  );

  const handlePageChange = (nextPage) => {
    if (loading) {
      return;
    }
    const normalizedPage = Math.max(nextPage, 0);
    if (normalizedPage === 0) {
      setSearchParams({});
      return;
    }
    setSearchParams({ page: String(normalizedPage) });
  };

  const handleNavClick = (navValue) => {
    if (loading) {
      return;
    }
    const numeric = Number(navValue);
    if (Number.isNaN(numeric)) {
      return;
    }
    const targetPage = navIsZeroBased ? numeric : Math.max(numeric - 1, 0);
    handlePageChange(targetPage);
  };

  const renderPagination = () => {
    if (
      state.navigationPages.length === 0 &&
      !state.hasPrevious &&
      !state.hasNext
    ) {
      return null;
    }

    return (
      <div className="results-pagination">
        <button
          type="button"
          onClick={() => handlePageChange(state.page - 1)}
          disabled={loading || !state.hasPrevious}
        >
          ‹
        </button>
        {state.navigationPages.map((pageNumber) => {
          const resolvedIndex = navIsZeroBased ? pageNumber : Math.max(pageNumber - 1, 0);
          const displayLabel = navIsZeroBased ? pageNumber + 1 : pageNumber;
          const isActive = resolvedIndex === state.page;
          return (
            <button
              type="button"
              key={`${pageNumber}`}
              className={isActive ? 'active' : ''}
              onClick={() => handleNavClick(pageNumber)}
              disabled={loading}
            >
              {displayLabel}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => handlePageChange(state.page + 1)}
          disabled={loading || !state.hasNext}
        >
          ›
        </button>
      </div>
    );
  };

  const renderCard = (item, index = 0) => {
    let fileName = item?.fileName || '(알 수 없음)';
    const folder = item?.folder || '-';
    const fileSize = item?.fileSize;
    const lastModifiedAt = item?.lastModifiedAt;
    
    // statusText 필드를 우선 사용, 없으면 completed로 판단 (하위 호환성)
    let statusLabel = item?.statusText;
    let statusClass = 'result-list-item-status-waiting';
    
    if (!statusLabel) {
      // statusText가 없으면 completed로 판단
      const isCompleted = item?.completed === true;
      
      // 폴더별 기본 상태 라벨
      if (isCompleted) {
        statusLabel = folder === 'before' ? '수정 완료' : '업로드 완료';
        statusClass = 'result-list-item-status-completed';
      } else {
        if (folder === 'before') {
          statusLabel = '수정 진행 중';
          statusClass = 'result-list-item-status-in-progress';
        } else if (folder === 'after') {
          statusLabel = '업로드 대기 중';
          statusClass = 'result-list-item-status-waiting';
        } else {
          statusLabel = '업로드 대기 중';
          statusClass = 'result-list-item-status-waiting';
        }
      }
    } else {
      // statusText가 있으면 해당 값 사용하고 클래스 결정
      if (statusLabel === '업로드 완료' || statusLabel === '수정 완료') {
        statusClass = 'result-list-item-status-completed';
      } else if (statusLabel === '수정 진행 중') {
        statusClass = 'result-list-item-status-in-progress';
      } else {
        statusClass = 'result-list-item-status-waiting';
      }
    }
    
    // 파일명에서 "before" 제거 (대소문자 구분 없이)
    fileName = fileName.replace(/\bbefore\b/gi, '').trim();
    // 연속된 공백이나 특수문자 정리
    fileName = fileName.replace(/\s+/g, ' ').replace(/^[\s\-_]+|[\s\-_]+$/g, '');
    
    const detailPath = `/results/${encodeURIComponent(item?.fileName || fileName)}`;
    const cardKey = `${folder}-${item?.fileName || fileName}-${index}`;

    return (
      <div className="result-list-item" key={cardKey}>
        <div className="result-list-item-name">
          <span className="result-list-item-title">{fileName}</span>
        </div>
        <div className="result-list-item-status">
          <span className={`result-list-item-status-badge ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <div className="result-list-item-size">{formatFileSize(fileSize)}</div>
        <div className="result-list-item-date">{formatDateTimeWithoutSeconds(lastModifiedAt)}</div>
        <div className="result-list-item-actions">
          <Link className="btn-primary" to={detailPath}>
            상세 보기
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1 className="page-title">결과 목록</h1>
      <div className="page-content">
        <div className="results-toolbar">
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            총 {state.totalElements ?? 0}개 파일
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fetchResults(state.page)}
            disabled={loading}
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
        {error && <div className="results-error">{error}</div>}
        {loading ? (
          <div className="results-empty">불러오는 중...</div>
        ) : state.contents.length === 0 ? (
          <div className="results-empty">데이터 없음</div>
        ) : (
          <>
            <div className="results-list">
              <div className="results-list-header">
                <div className="result-list-header-name">파일명</div>
                <div className="result-list-header-status">상태</div>
                <div className="result-list-header-size">파일 크기</div>
                <div className="result-list-header-date">최종 수정</div>
                <div className="result-list-header-actions">작업</div>
              </div>
              {state.contents.map((item, index) => renderCard(item, index))}
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsList;

