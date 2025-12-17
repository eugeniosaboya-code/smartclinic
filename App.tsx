import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import PublicBooking from './pages/PublicBooking';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/booking" element={<PublicBooking />} />
        
        {/* Redirect root to dashboard (simulate login done) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected Admin Routes */}
        <Route path="/dashboard" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        
        <Route path="/patients" element={
          <Layout>
            <PatientList />
          </Layout>
        } />
        
        <Route path="/patients/:id" element={
          <Layout>
            <PatientDetail />
          </Layout>
        } />

        <Route path="/settings" element={
            <Layout>
                <Settings />
            </Layout>
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;