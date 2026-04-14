import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-16 pb-20 md:pb-0 flex-1">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}