import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getResults } from '../utils/api';
import { formatDateTime } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import FilterBar from '../components/FilterBar';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './Results.css';

const Results = () => {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    pipelineId: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchResultList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        pipelineId: filters.pipelineId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        startedAfter: filters.startDate || undefined,
        finishedBefore: filters.endDate || undefined,
      };
      const res = await getResults(params);
      setResults(res.data);
    } catch (error) {
      showNotification('결과 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.endDate, filters.pipelineId, filters.search, filters.startDate, filters.status, showNotification]);

  useEffect(() => {
    fetchResultList();
  }, [fetchResultList]);

  // URL 파라미터에서 resultId가 있으면 상세 페이지로 이동
  useEffect(() => {
    const resultId = searchParams.get('resultId');
    if (resultId) {
      navigate(`/results/${resultId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch (error) {
      return value;
    }
  };

  const handleViewDetail = (resultId) => {
    navigate(`/results/${resultId}`);
  };

  return (
    <div className="page-container">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <h1 className="page-title">결과</h1>
      <div className="page-content">
        <FilterBar>
          <input
            className="form-input"
            type="search"
            placeholder="문서명 / URI 검색"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
          </select>
          <input
            className="form-input"
            type="number"
            min={0}
            placeholder="파이프라인 ID"
            value={filters.pipelineId}
            onChange={(e) => setFilters((prev) => ({ ...prev, pipelineId: e.target.value }))}
          />
          <input
            className="form-input"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <span>~</span>
          <input
            className="form-input"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </FilterBar>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>파일명</th>
                <th>파이프라인</th>
                <th>상태</th>
                <th>시작</th>
                <th>완료</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-message">
                    로딩 중...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-message">
                    결과 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.id}</td>
                    <td>{result.documentName || result.originalFileName || '-'}</td>
                    <td>{result.pipelineId || '-'}</td>
                    <td>
                      <StatusBadge status={result.status} size="small" />
                    </td>
                    <td>{formatDate(result.startedAt)}</td>
                    <td>{formatDate(result.finishedAt)}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => handleViewDetail(result.id)}
                      >
                        전체보기
                      </button>
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

export default Results;
