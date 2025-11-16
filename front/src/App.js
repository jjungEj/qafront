import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SystemStatus from './pages/SystemStatus';
import LocalFiles from './pages/LocalFiles';
import Pipelines from './pages/Pipelines';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import QA from './pages/QA';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SystemStatus />} />
          <Route path="/system-status" element={<SystemStatus />} />
          <Route path="/local-files" element={<LocalFiles />} />
          <Route path="/pipelines" element={<Pipelines />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<ResultDetail />} />
          <Route path="/qa" element={<QA />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

