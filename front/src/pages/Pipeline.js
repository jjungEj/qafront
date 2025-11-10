import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Page.css';

const Pipeline = () => {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      const response = await axios.get('/api/pipelines');
      setPipelines(response.data);
    } catch (error) {
      console.error('파이프라인 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">파이프라인</h1>
      <div className="page-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>상태</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-message">파이프라인 데이터가 없습니다.</td>
                </tr>
              ) : (
                pipelines.map((pipeline) => (
                  <tr key={pipeline.id}>
                    <td>{pipeline.id}</td>
                    <td>{pipeline.name}</td>
                    <td>{pipeline.status}</td>
                    <td>{pipeline.createdAt}</td>
                    <td>
                      <button className="btn-edit">수정</button>
                      <button className="btn-delete">삭제</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="action-buttons">
          <button className="btn-primary">새 파이프라인 생성</button>
        </div>
      </div>
    </div>
  );
};

export default Pipeline;

