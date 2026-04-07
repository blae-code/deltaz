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
import TradeHub from './pages/TradeHub';
import Records from './pages/Records';
import WeeklyDossier from './pages/WeeklyDossier';
import MissionLog from './pages/MissionLog';
import CraftingTracker from './pages/CraftingTracker';
import Logistics from './pages/Logistics';
import Journal from './pages/Journal';
import MissionPlanner from './pages/MissionPlanner';
import SectorHeatmap from './pages/SectorHeatmap';
import ResourceLedger from './pages/ResourceLedger';
import ConflictTimeline from './pages/ConflictTimeline';
import Today from './pages/Today';
import OpsLog from './pages/OpsLog';
import Bazaar from './pages/Bazaar';

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
        <Route path="/trade" element={<TradeHub />} />
        <Route path="/records" element={<Records />} />
        <Route path="/dossier" element={<WeeklyDossier />} />
        <Route path="/mission-log" element={<MissionLog />} />
        <Route path="/workbench" element={<CraftingTracker />} />
        <Route path="/logistics" element={<Logistics />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/planner" element={<MissionPlanner />} />
        <Route path="/heatmap" element={<SectorHeatmap />} />
        <Route path="/ledger" element={<ResourceLedger />} />
        <Route path="/conflicts" element={<ConflictTimeline />} />
        <Route path="/ops-log" element={<OpsLog />} />
        <Route path="/bazaar" element={<Bazaar />} />
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