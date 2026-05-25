import { UserButton } from "@clerk/clerk-react";
import { Link, Outlet } from "react-router-dom";
import { LayoutDashboard, Briefcase, BarChart3, Settings } from "lucide-react"; // npm install lucide-react

export const Layout = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'My Jobs', path: '/jobs', icon: <Briefcase size={20} /> },
    { name: 'Insights', path: '/insights', icon: <BarChart3 size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">RoleSnap</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path} 
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="md:hidden font-bold text-blue-600 text-xl">RoleSnap</div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">Application Mode</span>
            <UserButton afterSignOutUrl="/login" />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};