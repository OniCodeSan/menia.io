import { lazy, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { Loader2 } from 'lucide-react';

// CookieBanner lazy: l'unico consumer di framer-motion nel critical path.
// Lazy-loadarlo sposta vendor-motion (~112KB) fuori dal preload iniziale.
const CookieBanner = lazy(() => import('./components/shared/CookieBanner'));

const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const Pricing = lazy(() => import('./pages/Pricing'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile'));
const CreatorsExplore = lazy(() => import('./pages/CreatorsExplore'));
// Live feature attualmente disabilitata in UI: i route /live e /dashboard/lives
// redirigono altrove. I componenti LiveRoom/DashboardLives restano nel codice
// per riattivazione futura, ma non sono importati.
const Broadcasts = lazy(() => import('./pages/dashboard/Broadcasts'));
const DashboardCourses = lazy(() => import('./pages/dashboard/Courses'));
const DashboardCommunity = lazy(() => import('./pages/dashboard/Community'));
const DashboardAnalytics = lazy(() => import('./pages/dashboard/Analytics'));
const DashboardSettings = lazy(() => import('./pages/dashboard/Settings'));
const MockCheckout = lazy(() => import('./pages/MockCheckout'));
const Billing = lazy(() => import('./pages/Billing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage'));
const Messages = lazy(() => import('./pages/Messages'));
const CreatorPortal = lazy(() => import('./pages/CreatorPortal'));
const FanDashboard = lazy(() => import('./pages/FanDashboard'));
const StudentSettings = lazy(() => import('./pages/StudentSettings'));
const FanPortal = lazy(() => import('./pages/FanPortal'));
const AdminConsole = lazy(() => import('./pages/AdminConsole'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const ContentPolicy = lazy(() => import('./pages/ContentPolicy'));
const Support = lazy(() => import('./pages/Support'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const FanLogin = lazy(() => import('./pages/FanLogin'));
const CreatorLogin = lazy(() => import('./pages/CreatorLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const GdprSettings = lazy(() => import('./pages/GdprSettings'));

function RedirectWithHandle({ to }) {
  const { handle } = useParams();
  const { search } = useLocation();
  return <Navigate to={`${to}/${handle}${search}`} replace />;
}

function LazyFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { authError, navigateToLogin } = useAuth();

  // No global isLoadingAuth gate: route pubbliche (Home, Courses, Pricing)
  // renderizzano subito; AuthGuard / FanDashboard / DashboardLayout gestiscono
  // il loading state per le rotte protette. Riduce il time-to-first-paint
  // mostrando immediatamente il chrome dell'app.

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
        <Route path="/student-portal" element={<FanPortal />} />
        <Route path="/billing/mock-checkout" element={<MockCheckout />} />
        <Route path="/trainer-portal" element={<CreatorPortal />} />
        <Route path="/student-login" element={<FanLogin />} />
        <Route path="/trainer-login" element={<CreatorLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard/course/:id/edit" element={<CourseEditorPage />} />

        {/* Backward-compat redirects for renamed standalone routes */}
        <Route path="/fan-login" element={<Navigate to="/student-login" replace />} />
        <Route path="/creator-login" element={<Navigate to="/trainer-login" replace />} />
        <Route path="/fan-portal" element={<Navigate to="/student-portal" replace />} />
        <Route path="/creator-portal" element={<Navigate to="/trainer-portal" replace />} />

        {/* Creator dashboard with sidebar layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/courses" element={<DashboardCourses />} />
          {/* /dashboard/lives disabilitato: redirige a /dashboard */}
          <Route path="/dashboard/lives" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/community" element={<DashboardCommunity />} />
          <Route path="/dashboard/broadcasts" element={<Broadcasts />} />
          <Route path="/dashboard/analytics" element={<DashboardAnalytics />} />
          <Route path="/dashboard/settings" element={<DashboardSettings />} />
        </Route>

        {/* Main app with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/trainer" element={<CreatorsExplore />} />
          <Route path="/trainers" element={<CreatorsExplore />} />
          <Route path="/trainer/:handle" element={<CreatorProfile />} />
          {/* /live/:id disabilitato: redirige al catalogo corsi */}
          <Route path="/live/:id" element={<Navigate to="/courses" replace />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin-console" element={<AdminConsole />} />
          <Route path="/policy" element={<ContentPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-settings" element={<GdprSettings />} />
          <Route path="/student-dashboard" element={<FanDashboard />} />
          <Route path="/student-settings" element={<StudentSettings />} />
          <Route path="/billing" element={<Billing />} />
          {/* Backward-compat redirects: old fan/creator URLs → new student/trainer */}
          <Route path="/fan-dashboard" element={<Navigate to="/student-dashboard" replace />} />
          <Route path="/creator" element={<Navigate to="/trainer" replace />} />
          <Route path="/creators" element={<Navigate to="/trainers" replace />} />
          <Route path="/creator/:handle" element={<RedirectWithHandle to="/trainer" />} />
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
              <Suspense fallback={null}>
                <CookieBanner />
              </Suspense>
            </Router>
            <Toaster />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
