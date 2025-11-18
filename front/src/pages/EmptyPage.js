/**
* @ClassName	: EmptyPage.js
* @Description	: 빈 페이지 컴포넌트, 추후 구현 예정인 페이지의 플레이스홀더
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 미구현 페이지용 플레이스홀더 컴포넌트
* 								- 제목 prop을 통한 동적 페이지 제목 표시
*/
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

