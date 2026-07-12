import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { Layout } from "./components/Layout";
import { AuthGuard } from "./components/AuthGuard";
import { DashboardHome } from "./pages/DashboardHome";
import { MyJobs } from "./pages/MyJobs";
import { Insights } from "./pages/Insights";
import { Settings } from "./pages/Settings";
import { ExtensionAuth } from "./pages/ExtensionAuth";

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
          <Route index element={<DashboardHome />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 3. EXTENSION TOKEN BRIDGE: Hidden iframe page used by the Chrome extension */}
        <Route path="/extension-auth" element={<ExtensionAuth />} />

        {/* 4. CATCH-ALL: If user goes to a random URL, send them home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;