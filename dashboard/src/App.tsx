import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Layout } from "./components/Layout";
import { AuthGuard } from "./components/AuthGuard";

// These are temporary components. We will build real ones in Days 6 and 7!
const DashboardHome = () => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm">Total Jobs</p>
        <p className="text-3xl font-bold">0</p>
      </div>
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm">Interviews</p>
        <p className="text-3xl font-bold text-blue-600">0</p>
      </div>
    </div>
  </div>
);

const MyJobs = () => (
  <div>
    <h2 className="text-2xl font-bold mb-4">My Job Applications</h2>
    <p className="text-slate-500 text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
      No jobs saved yet. Use the Chrome Extension or WhatsApp bot to start!
    </p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. THE LOGIN ROUTE: No Sidebar here */}
        <Route path="/login" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <SignIn routing="path" path="/login" signUpUrl="/login" />
          </div>
        } />

        {/* 2. THE PROTECTED ROUTES: Everything inside here uses the Layout (Sidebar) */}
        <Route path="/" element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }>
          {/* This index route means '/' will show DashboardHome inside the Layout */}
          <Route index element={<DashboardHome />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="insights" element={<div className="text-2xl font-bold">Salary Insights (Coming Week 17)</div>} />
          <Route path="settings" element={<div className="text-2xl font-bold">Settings</div>} />
        </Route>

        {/* 3. CATCH-ALL: If user goes to a random URL, send them home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;