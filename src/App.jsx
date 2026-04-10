import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Feed from './pages/Feed';
import CreatorProfile from './pages/CreatorProfile';
import Dashboard from './pages/Dashboard';
import ContentPage from './pages/ContentPage';
import Checkout from './pages/Checkout';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import LiveDiscover from './pages/LiveDiscover';
import LiveWatch from './pages/LiveWatch';
import GoLive from './pages/GoLive';
import CreatorPortal from './pages/CreatorPortal';
import FanDashboard from './pages/FanDashboard';
import FanPortal from './pages/FanPortal';
import AdminConsole from './pages/AdminConsole';
import CreatorOnboarding from './pages/CreatorOnboarding';

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
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/creator" element={<CreatorProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/live-discover" element={<LiveDiscover />} />
        <Route path="/live" element={<LiveWatch />} />
        <Route path="/go-live" element={<GoLive />} />
        <Route path="/creator-portal" element={<CreatorPortal />} />
        <Route path="/fan-dashboard" element={<FanDashboard />} />
        <Route path="/fan-portal" element={<FanPortal />} />
        <Route path="/admin-console" element={<AdminConsole />} />
        <Route path="/creator-onboarding" element={<CreatorOnboarding />} />
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