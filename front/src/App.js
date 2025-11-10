import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SystemStatus from './pages/SystemStatus';
import Pipeline from './pages/Pipeline';
import ResultQuery from './pages/ResultQuery';
import ModelManagement from './pages/ModelManagement';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SystemStatus />} />
          <Route path="/system-status" element={<SystemStatus />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/result-query" element={<ResultQuery />} />
          <Route path="/model-management" element={<ModelManagement />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

