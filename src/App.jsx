import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import WorldMap from './pages/WorldMap';
import Events from './pages/Events';
import Factions from './pages/Factions';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Intel from './pages/Intel';
import Market from './pages/Market';
import Colony from './pages/Colony';
import Treaties from './pages/Treaties';
import Inventory from './pages/Inventory';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/events" element={<Events />} />
        <Route path="/factions" element={<Factions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/intel" element={<Intel />} />
        <Route path="/market" element={<Market />} />
        <Route path="/colony" element={<Colony />} />
        <Route path="/treaties" element={<Treaties />} />
        <Route path="/inventory" element={<Inventory />} />
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