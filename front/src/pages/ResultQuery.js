import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Page.css';

const ResultQuery = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await axios.get('/api/results');
      setResults(response.data);
    } catch (error) {
      console.error('결과 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">결과조회</h1>
      <div className="page-content">
        <div className="search-section">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="search-input"
          />
          <button className="btn-primary">검색</button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>파이프라인</th>
                <th>상태</th>
                <th>결과</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">결과 데이터가 없습니다.</td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.id}</td>
                    <td>{result.pipelineName}</td>
                    <td>{result.status}</td>
                    <td>{result.result}</td>
                    <td>{result.createdAt}</td>
                    <td>
                      <button className="btn-view">상세보기</button>
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

export default ResultQuery;

