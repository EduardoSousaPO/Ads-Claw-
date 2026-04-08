import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import AlertsPage from './pages/AlertsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ConversationsPage from './pages/ConversationsPage';
import AgentChat from './components/AgentChat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
        </Route>
      </Routes>
      {/* Chat flutuante disponível em todas as páginas */}
      <AgentChat />
    </Router>
  );
}

export default App;
