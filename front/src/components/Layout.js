/**
* @ClassName	: Layout.js
* @Description	: 사이드바와 메인 콘텐츠 영역을 포함하는 레이아웃 컴포넌트
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 사이드바와 메인 콘텐츠 영역 구성
* 								- children prop을 통해 페이지 콘텐츠 렌더링
*/
import React from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

