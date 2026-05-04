import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import TrialBanner from "@/components/billing/TrialBanner";

export default function AppLayout() {
  const location = useLocation();
  const isFeed = location.pathname === "/feed";
  const isAuth = ["/student-login", "/trainer-login", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold">
        Salta al contenuto
      </a>
      {isFeed ? (
        <div className="hidden md:block"><Navbar /></div>
      ) : (
        <Navbar />
      )}
      <main id="main-content" className={`${isFeed ? "pb-0 md:pt-16" : "pt-16 pb-20 md:pb-0"} flex-1`}>
        {!isFeed && !isAuth && <div className="px-4"><TrialBanner /></div>}
        <Outlet />
      </main>
      {!isFeed && <Footer />}
      <BottomNav feedMode={isFeed} />
    </div>
  );
}
