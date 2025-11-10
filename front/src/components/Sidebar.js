import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/system-status', label: '시스템상태', icon: '📊' },
    { path: '/pipeline', label: '파이프라인', icon: '⚙️' },
    { path: '/result-query', label: '결과조회', icon: '🔍' },
    { path: '/model-management', label: '모델 관리', icon: '🤖' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Helpy Struct</h1>
      </div>
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.path} className="menu-item">
              <Link
                to={item.path}
                className={`menu-link ${location.pathname === item.path ? 'active' : ''}`}
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

