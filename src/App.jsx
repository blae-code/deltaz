import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppShell from './components/layout/AppShell';
import LoginSplash from './components/auth/LoginSplash';
import AuthLoadingScreen from './components/auth/AuthLoadingScreen';
import Today from './pages/Today';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Territory from './pages/Territory';
import Economy from './pages/Economy';
import Colony from './pages/Colony';
import Loadout from './pages/Loadout';
import Dossier from './pages/Dossier';
import Admin from './pages/Admin';
import OpsLog from './pages/OpsLog';
import SectorHeatmap from './pages/SectorHeatmap';
import ResourceLedger from './pages/ResourceLedger';
import ConflictTimeline from './pages/ConflictTimeline';
import Logistics from './pages/Logistics';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AuthLoadingScreen />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginSplash />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Today />} />
        <Route path="/sitrep" element={<Dashboard />} />
        <Route path="/ops" element={<Operations />} />
        <Route path="/territory" element={<Territory />} />
        <Route path="/economy" element={<Economy />} />
        <Route path="/colony" element={<Colony />} />
        <Route path="/loadout" element={<Loadout />} />
        <Route path="/dossier" element={<Dossier />} />
        <Route path="/ops-log" element={<OpsLog />} />
        <Route path="/heatmap" element={<SectorHeatmap />} />
        <Route path="/logistics" element={<Logistics />} />
        <Route path="/ledger" element={<ResourceLedger />} />
        <Route path="/conflicts" element={<ConflictTimeline />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App