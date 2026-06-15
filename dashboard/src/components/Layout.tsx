import { useState } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, BarChart3, Settings, Menu, X, Plus } from "lucide-react";
import { parseJob, saveJob } from "../api/jobs";

export const Layout = () => {
  const { getToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPasteJobOpen, setIsPasteJobOpen] = useState(false);
  const [jobText, setJobText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'My Jobs', path: '/jobs', icon: <Briefcase size={20} /> },
    { name: 'Insights', path: '/insights', icon: <BarChart3 size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleOpenPasteModal = () => {
    setIsPasteJobOpen(true);
    setError("");
    setSuccessMessage("");
    setJobText("");
  };

  const handleClosePasteModal = () => {
    setIsPasteJobOpen(false);
    setError("");
    setSuccessMessage("");
    setJobText("");
    setIsLoading(false);
  };

  const handlePasteJobSubmit = async () => {
    if (!jobText.trim()) {
      setError("Please paste job text");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const token = await getToken();
      
      // Parse the job text
      const parsedJobs = await parseJob(jobText, undefined, token ?? undefined);
      
      if (!parsedJobs || parsedJobs.length === 0) {
        setError("Could not parse job from text. Please check the format and try again.");
        setIsLoading(false);
        return;
      }

      // Save the first parsed job
      const jobToSave = parsedJobs[0];
      await saveJob(jobToSave, token ?? undefined);
      
      setSuccessMessage("✓ Job saved successfully! Check 'My Jobs' to view it.");
      setJobText("");
      
      // Close modal after 2 seconds
      setTimeout(() => {
        handleClosePasteModal();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to parse and save job");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'hidden'
      } md:flex md:w-64 bg-white border-r border-slate-200 flex flex-col fixed md:relative h-screen z-40 transition-all`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">RoleSnap</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1 pb-6">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          
          <div className="hidden md:block text-sm text-slate-500">
            {navItems.find(item => isActive(item.path))?.name || 'Dashboard'}
          </div>

          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <button 
              onClick={handleOpenPasteModal}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base font-medium"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Paste Job</span>
            </button>
            <UserButton afterSignOutUrl="/login" />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet /> 
        </main>
      </div>

      {/* Paste Job Modal */}
      {isPasteJobOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Paste a Job Posting</h2>
              <button 
                onClick={handleClosePasteModal}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
                <p className="font-semibold">{successMessage}</p>
              </div>
            )}

            <textarea 
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              disabled={isLoading}
              className="w-full h-40 p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="Paste any job posting text here (from WhatsApp, Twitter, LinkedIn, etc.)..."
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button 
                onClick={handleClosePasteModal}
                disabled={isLoading}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handlePasteJobSubmit}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Parsing..." : "Parse & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};