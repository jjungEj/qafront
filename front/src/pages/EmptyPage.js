import React from 'react';
import './Page.css';

const EmptyPage = ({ title }) => {
  return (
    <div className="page-container">
      <h1 className="page-title">{title || '페이지'}</h1>
      <div className="page-content">
        {/* 내용은 추후 구현 예정 */}
      </div>
    </div>
  );
};

export default EmptyPage;

