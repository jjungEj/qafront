import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import EmptyPage from './pages/EmptyPage';
import QA from './pages/QA';
import QADetail from './pages/QADetail';
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
          <Route path="/qa/files/:id" element={<QADetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

