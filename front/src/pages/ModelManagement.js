import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Page.css';

const ModelManagement = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get('/api/models');
      setModels(response.data);
    } catch (error) {
      console.error('모델 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">모델 관리</h1>
      <div className="page-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>모델명</th>
                <th>버전</th>
                <th>상태</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-message">모델 데이터가 없습니다.</td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr key={model.id}>
                    <td>{model.id}</td>
                    <td>{model.name}</td>
                    <td>{model.version}</td>
                    <td>{model.status}</td>
                    <td>{model.createdAt}</td>
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
          <button className="btn-primary">새 모델 추가</button>
        </div>
      </div>
    </div>
  );
};

export default ModelManagement;

