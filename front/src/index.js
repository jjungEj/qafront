/**
* @ClassName	: index.js
* @Description	: React 애플리케이션의 진입점, DOM에 루트 컴포넌트 렌더링
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - React 18의 createRoot API 사용
* 								- StrictMode로 개발 환경 검증 활성화
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

