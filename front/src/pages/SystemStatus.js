import React, { useState, useEffect } from 'react';
import { getSystemStatus } from '../utils/api';
import Notification, { NotificationContainer } from '../components/Notification';
import './Page.css';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await getSystemStatus();
      setStatus(response.data);
    } catch (error) {
      showNotification('시스템 상태를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
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
              <span className="status-value">
                {status.uptime ? new Date(status.uptime).toLocaleString('ko-KR') : '-'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;

