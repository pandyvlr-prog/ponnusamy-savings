import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Home, Users, Settings } from 'lucide-react';

function Dashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome to the new React-based Ponnusamy Savings app.</p>
    </div>
  );
}

function Members() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Members</h1>
      <p>Member list migration coming soon...</p>
    </div>
  );
}

function AppSettings() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Settings</h1>
      <p>Settings panel migration coming soon...</p>
    </div>
  );
}

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#121212', color: '#f3f4f6' }}>
      <header style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
        <h2>Ponnusamy Savings (React)</h2>
      </header>
      
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settings" element={<AppSettings />} />
        </Routes>
      </main>

      <nav style={{ display: 'flex', justifyContent: 'space-around', padding: '16px', borderTop: '1px solid #374151', backgroundColor: '#1e1e1e' }}>
        <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Home size={24} />
          <span style={{ fontSize: '12px', marginTop: '4px' }}>Home</span>
        </Link>
        <Link to="/members" style={{ color: '#9ca3af', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Users size={24} />
          <span style={{ fontSize: '12px', marginTop: '4px' }}>Members</span>
        </Link>
        <Link to="/settings" style={{ color: '#9ca3af', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Settings size={24} />
          <span style={{ fontSize: '12px', marginTop: '4px' }}>Settings</span>
        </Link>
      </nav>
    </div>
  );
}

export default App;
