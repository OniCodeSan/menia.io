import { lazy, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import CookieBanner from './components/shared/CookieBanner';
import { Loader2 } from 'lucide-react';

const Home = lazy(() => import('./pages/Home'));
const Feed = lazy(() => import('./pages/Feed'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Explore = lazy(() => import('./pages/Explore'));
const Messages = lazy(() => import('./pages/Messages'));
const LiveDiscover = lazy(() => import('./pages/LiveDiscover'));
const LiveWatch = lazy(() => import('./pages/LiveWatch'));
const GoLive = lazy(() => import('./pages/GoLive'));
const CreatorPortal = lazy(() => import('./pages/CreatorPortal'));
const FanDashboard = lazy(() => import('./pages/FanDashboard'));
const FanPortal = lazy(() => import('./pages/FanPortal'));
const AdminConsole = lazy(() => import('./pages/AdminConsole'));
const CreatorOnboarding = lazy(() => import('./pages/CreatorOnboarding'));
const TokenWalletPage = lazy(() => import('./pages/TokenWalletPage'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const Support = lazy(() => import('./pages/Support'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const FanLogin = lazy(() => import('./pages/FanLogin'));
const CreatorLogin = lazy(() => import('./pages/CreatorLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));

function LazyFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Standalone full-page flows (no Navbar/BottomNav) */}
        <Route path="/fan-portal" element={<FanPortal />} />
        <Route path="/creator-portal" element={<CreatorPortal />} />
        <Route path="/fan-login" element={<FanLogin />} />
        <Route path="/creator-login" element={<CreatorLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/creator-onboarding" element={<CreatorOnboarding />} />

        {/* Main app with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/creator" element={<CreatorProfile />} />
          <Route path="/creator/:handle" element={<CreatorProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/content/:id" element={<ContentPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/token-wallet" element={<TokenWalletPage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/live-discover" element={<LiveDiscover />} />
          <Route path="/live/:id" element={<LiveWatch />} />
          <Route path="/go-live" element={<GoLive />} />
          <Route path="/admin-console" element={<AdminConsole />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/fan-dashboard" element={<FanDashboard />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <HelmetProvider>
      <AuthProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <AuthenticatedApp />
              <CookieBanner />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
