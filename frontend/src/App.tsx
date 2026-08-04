import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import History from './pages/History';

function LogoutButton() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on login page
  if (location.pathname === '/') return null;

  return (
    <div
      className="logout-container fixed bottom-8 right-8 z-50"
      onClick={() => navigate('/')}
    >
      <button className="logout-btn">
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LogoutButton />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
