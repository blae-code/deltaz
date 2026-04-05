import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ScanlineOverlay from "../terminal/ScanlineOverlay";

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden terminal-flicker">
      <ScanlineOverlay />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 pt-14 md:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}