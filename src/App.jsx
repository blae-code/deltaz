import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import Records from './pages/Records';
import WeeklyDossier from './pages/WeeklyDossier';
import MissionLog from './pages/MissionLog';
import CraftingTracker from './pages/CraftingTracker';
import Logistics from './pages/Logistics';
import Journal from './pages/Journal';
import MissionPlanner from './pages/MissionPlanner';
import WarRoom from './pages/WarRoom';

const PageTransitionWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full" // Ensure the div takes full space
    >
      {children}
    </motion.div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AppShell />}>
          <Route path="/" element={<PageTransitionWrapper><Dashboard /></PageTransitionWrapper>} />
        <Route path="/jobs" element={<PageTransitionWrapper><Jobs /></PageTransitionWrapper>} />
        <Route path="/map" element={<PageTransitionWrapper><WorldMap /></PageTransitionWrapper>} />
        <Route path="/events" element={<PageTransitionWrapper><Events /></PageTransitionWrapper>} />
        <Route path="/factions" element={<PageTransitionWrapper><Factions /></PageTransitionWrapper>} />
        <Route path="/profile" element={<PageTransitionWrapper><Profile /></PageTransitionWrapper>} />
        <Route path="/intel" element={<PageTransitionWrapper><Intel /></PageTransitionWrapper>} />
        <Route path="/market" element={<PageTransitionWrapper><Market /></PageTransitionWrapper>} />
        <Route path="/colony" element={<PageTransitionWrapper><Colony /></PageTransitionWrapper>} />
        <Route path="/treaties" element={<PageTransitionWrapper><Treaties /></PageTransitionWrapper>} />
        <Route path="/inventory" element={<PageTransitionWrapper><Inventory /></PageTransitionWrapper>} />
        <Route path="/records" element={<PageTransitionWrapper><Records /></PageTransitionWrapper>} />
        <Route path="/dossier" element={<PageTransitionWrapper><WeeklyDossier /></PageTransitionWrapper>} />
        <Route path="/mission-log" element={<PageTransitionWrapper><MissionLog /></PageTransitionWrapper>} />
        <Route path="/workbench" element={<PageTransitionWrapper><CraftingTracker /></PageTransitionWrapper>} />
        <Route path="/logistics" element={<PageTransitionWrapper><Logistics /></PageTransitionWrapper>} />
        <Route path="/journal" element={<PageTransitionWrapper><Journal /></PageTransitionWrapper>} />
        <Route path="/planner" element={<PageTransitionWrapper><MissionPlanner /></PageTransitionWrapper>} />
        <Route path="/admin" element={<PageTransitionWrapper><Admin /></PageTransitionWrapper>} />
        <Route path="/warroom" element={<PageTransitionWrapper><WarRoom /></PageTransitionWrapper>} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  </AnimatePresence>
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