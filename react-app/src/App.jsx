import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SchemeSelector from './pages/SchemeSelector';
import Members from './pages/Members';
import Settings from './pages/Settings';
import './index.css';





function App() {
  const location = useLocation();
  const isFullScreenPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/schemes';

  if (isFullScreenPage) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/schemes" element={<SchemeSelector />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h2>Ponnusamy Savings</h2>
      </header>
      
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <Navigation />
    </div>
  );
}

export default App;
