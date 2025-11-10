import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Page.css';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get('/api/system-status');
      setStatus(response.data);
    } catch (error) {
      console.error('시스템 상태 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">시스템상태</h1>
      <div className="page-content">
        {status && (
          <div className="status-card">
            <h2>시스템 정보</h2>
            <div className="status-item">
              <span className="status-label">상태:</span>
              <span className="status-value">{status.status}</span>
            </div>
            <div className="status-item">
              <span className="status-label">버전:</span>
              <span className="status-value">{status.version}</span>
            </div>
            <div className="status-item">
              <span className="status-label">업타임:</span>
              <span className="status-value">{new Date(status.uptime).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;

