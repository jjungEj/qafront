/**
* @ClassName	: Notification.js
* @Description	: 알림 메시지 컴포넌트, 자동 사라짐 기능 및 여러 알림 관리
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 알림 표시 및 자동 사라짐 기능
* 								- 여러 알림 동시 관리 (NotificationContainer)
* 								- 타입별 스타일링 (info, success, error, warning)
*/
import React, { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300); // 애니메이션 시간
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <span className="notification-message">{message}</span>
        {onClose && (
          <button className="notification-close" onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export const NotificationContainer = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
          duration={notification.duration}
        />
      ))}
    </div>
  );
};

export default Notification;

