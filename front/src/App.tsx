import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './core/ProtectedRoute';
import { DownloadPage } from './pages/DownloadPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SpacePage } from './pages/SpacePage';
import { UploadPage } from './pages/UploadPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route
        path="/mon-espace"
        element={
          <ProtectedRoute>
            <SpacePage />
          </ProtectedRoute>
        }
      />
      <Route path="/d/:token" element={<DownloadPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
