import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LocalFiles from './pages/LocalFiles';
import Pipelines from './pages/Pipelines';
import Results from './pages/Results';
import SystemStatus from './pages/SystemStatus';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/local-files" element={<LocalFiles />} />
          <Route path="/pipelines" element={<Pipelines />} />
          <Route path="/results" element={<Results />} />
          <Route path="/system-status" element={<SystemStatus />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

