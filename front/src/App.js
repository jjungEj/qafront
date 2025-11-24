/**
* @ClassName	: App.js
* @Description	: React Router를 사용한 메인 애플리케이션 컴포넌트, 라우팅 설정 및 레이아웃 구성
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - React Router를 통한 페이지 라우팅 설정
* 								- Layout 컴포넌트로 전체 페이지 구조 구성
*/
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import EmptyPage from './pages/EmptyPage';
import QA from './pages/QA';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<EmptyPage title="시스템 상태" />} />
          <Route path="/system-status" element={<EmptyPage title="시스템 상태" />} />
          <Route path="/local-files" element={<EmptyPage title="로컬 파일" />} />
          <Route path="/pipelines" element={<EmptyPage title="파이프라인" />} />
          <Route path="/results" element={<EmptyPage title="결과" />} />
          <Route path="/results/:id" element={<EmptyPage title="결과 조회" />} />
          <Route path="/qa" element={<QA />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

