/**
* @ClassName	: Sidebar.js
* @Description	: 사이드바 네비게이션 컴포넌트, 메뉴 항목 표시 및 활성 상태 관리
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 메뉴 항목 라우팅 및 활성 상태 표시
* 								- 현재 경로에 따른 활성 메뉴 하이라이트
*/
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/system-status', label: '시스템 상태', icon: '🩺' },
    { path: '/local-files', label: '로컬 파일', icon: '📁' },
    { path: '/pipelines', label: '파이프라인', icon: '⚙️' },
    { path: '/results', label: '결과', icon: '🧾' },
    { path: '/qa', label: 'QA', icon: '✅' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">QA WebApp</h1>
      </div>
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.path} className="menu-item">
              <Link
                to={item.path}
                className={`menu-link ${
                  location.pathname === item.path ||
                  (location.pathname === '/' && item.path === '/system-status')
                    ? 'active'
                    : ''
                }`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

