/**
* @ClassName	: Modal.js
* @Description	: 모달 다이얼로그 컴포넌트, 배경 클릭 시 닫기 및 크기 옵션 지원
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 모달 열기/닫기 기능 구현
* 								- 배경 클릭 시 닫기 처리
* 								- 크기 옵션(medium 등) 지원
*/
import React from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-container modal-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

