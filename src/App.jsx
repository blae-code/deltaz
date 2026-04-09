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
import FutureFeaturePage from './components/terminal/FutureFeaturePage';

// ── Active v1 pages ──────────────────────────────────────────────────────────
import Today from './pages/Today';
import Jobs from './pages/Jobs';
import WorldMap from './pages/WorldMap';
import Factions from './pages/Factions';
import Colony from './pages/Colony';
import Loadout from './pages/Loadout';      // Inventory + Workbench tabs
import MissionLog from './pages/MissionLog';
import Journal from './pages/Journal';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

// ── Sub-pages (used internally by hub pages; keep routes valid) ──────────────
import Inventory from './pages/Inventory';
import CraftingTracker from './pages/CraftingTracker';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AuthLoadingScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginSplash />;
    }
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* ── Active v1 routes ────────────────────────────────────────────── */}
        <Route path="/"            element={<Today />} />
        <Route path="/jobs"        element={<Jobs />} />
        <Route path="/map"         element={<WorldMap />} />
        <Route path="/factions"    element={<Factions />} />
        <Route path="/colony"      element={<Colony />} />
        <Route path="/loadout"     element={<Loadout />} />
        <Route path="/inventory"   element={<Inventory />} />
        <Route path="/workbench"   element={<CraftingTracker />} />
        <Route path="/mission-log" element={<MissionLog />} />
        <Route path="/journal"     element={<Journal />} />
        <Route path="/profile"     element={<Profile />} />
        <Route path="/admin"       element={<Admin />} />

        {/* ── Future feature routes ───────────────────────────────────────── */}
        <Route path="/sitrep"    element={<FutureFeaturePage name="SITREP"      description="Customizable situation-report dashboard with live widget feeds and world-state overview." />} />
        <Route path="/ops"       element={<FutureFeaturePage name="OPERATIONS"  description="Unified operations hub — war room, mission planning, comms, and intel feeds." />} />
        <Route path="/territory" element={<FutureFeaturePage name="TERRITORY"   description="Territory control overview — AO map, clan standings, and diplomatic relations." />} />
        <Route path="/economy"   element={<FutureFeaturePage name="ECONOMY"     description="Server-wide economic layer — bazaar, trade hub, and faction market pricing." />} />
        <Route path="/dossier"   element={<FutureFeaturePage name="DOSSIER"     description="Weekly situation summary — personal performance, notable events, and server-wide highlights." />} />
        <Route path="/events"    element={<FutureFeaturePage name="COMMS"       description="Server-wide broadcast feed — faction dispatches, world events, and emergency alerts." />} />
        <Route path="/trade"     element={<FutureFeaturePage name="TRADE HUB"   description="Player-to-player barter system with deal proposals, escrow, and trade history." />} />
        <Route path="/bazaar"    element={<FutureFeaturePage name="BAZAAR"      description="NPC vendor marketplace for exchanging scavenged goods and surplus supplies." />} />
        <Route path="/market"    element={<FutureFeaturePage name="MARKET"      description="Faction-driven commodity exchange with live pricing, scarcity modifiers, and trade ledger." />} />
        <Route path="/intel"     element={<FutureFeaturePage name="INTEL FEED"  description="Curated intelligence reports — faction movements, anomalies, and field dispatches." />} />
        <Route path="/planner"   element={<FutureFeaturePage name="PLANNER"     description="Collaborative mission planning board with route mapping and resource allocation." />} />
        <Route path="/warroom"   element={<FutureFeaturePage name="WAR ROOM"    description="Strategic operations center — conflict tracking, territory control, and tactical displays." />} />
        <Route path="/treaties"  element={<FutureFeaturePage name="TREATIES"    description="Diplomatic treaty board for alliances, non-aggression pacts, and aid agreements." />} />
        <Route path="/logistics" element={<FutureFeaturePage name="LOGISTICS"   description="Faction supply chain management — production queues, distribution, and embargoes." />} />
        <Route path="/ledger"    element={<FutureFeaturePage name="LEDGER"      description="Server-wide resource ledger tracking faction stockpiles and economic flows." />} />
        <Route path="/heatmap"   element={<FutureFeaturePage name="HEATMAP"     description="Sector activity visualization — threat density, resource concentration, and movement patterns." />} />
        <Route path="/conflicts" element={<FutureFeaturePage name="CONFLICTS"   description="Conflict timeline and diplomatic matrix showing active disputes and ceasefire agreements." />} />
        <Route path="/ops-log"   element={<FutureFeaturePage name="OPS LOG"     description="Operational activity log with player telemetry, dispatch history, and after-action records." />} />
        <Route path="/records"   element={<FutureFeaturePage name="RECORDS"     description="Achievement and milestone tracking — missions completed, factions engaged, territories visited." />} />

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
