import React, { ReactNode } from 'react';
import { UserRole } from '../types';
import { LogOut, Menu, Bell, Search, Settings, User as UserIcon, LayoutGrid, Briefcase, MessageSquare, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
  role: UserRole;
  onLogout: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();

  const getNavItems = () => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          { name: 'Overview', icon: LayoutGrid, path: '/admin' },
          { name: 'Users & Providers', icon: UserIcon, path: '/admin/users' },
          { name: 'System Logs', icon: Briefcase, path: '/admin/logs' },
          { name: 'Alerts', icon: ShieldAlert, path: '/admin/alerts' },
        ];
      case UserRole.PROVIDER:
        return [
          { name: 'My Jobs', icon: Briefcase, path: '/provider' },
          { name: 'Profile', icon: UserIcon, path: '/provider/profile' },
          { name: 'Updates', icon: Bell, path: '/provider/updates' },
        ];
      case UserRole.CLIENT:
        return [
          { name: 'Find Services', icon: Search, path: '/client' },

        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isActive = (path: string) => location.pathname === path;

  // Client Layout is distinct (Top Navigation)
  if (role === UserRole.CLIENT) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-8">
                <div className="nav__logo">
                  <Link to="/" className="logo">KIND</Link>
                </div>
                <div className="hidden md:flex space-x-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">

                <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center border border-rose-200">
                  <UserIcon className="w-4 h-4 text-rose-600" />
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    );
  }

  // State for notifications
  const [hasUnread, setHasUnread] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);

  // Fetch notifications periodically or on mount to check for unread items
  React.useEffect(() => {

    const checkNotifications = async () => {
      const userId = localStorage.getItem('userId');

      if (role === UserRole.PROVIDER && userId) {
        try {
          const res = await fetch(`http://localhost:4000/api/contact-requests/provider/${userId}`);
          if (res.ok) {
            const data = await res.json();
            const requests = Array.isArray(data) ? data : [];
            const currentCount = requests.length;
            setNotificationCount(currentCount);

            const lastReadCount = parseInt(localStorage.getItem('providerLastReadCount') || '0');
            setHasUnread(currentCount > lastReadCount);
          }
        } catch (e) {
          console.error("Failed to check notifications", e);
        }
      } else if (role === UserRole.ADMIN) {
        try {
          const res = await fetch('http://localhost:4000/api/admin/pending-providers');
          if (res.ok) {
            const data = await res.json();
            const currentCount = Array.isArray(data) ? data.length : 0;
            setNotificationCount(currentCount);

            const lastReadCount = parseInt(localStorage.getItem('adminLastReadCount') || '0');
            setHasUnread(currentCount > lastReadCount);
          }
        } catch (e) {
          console.error("Failed to check admin notifications", e);
        }
      }
    };

    checkNotifications();
    // Poll every 30s
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [role, location.pathname]); // Re-check on nav change too

  // Admin and Provider Layout (Sidebar)
  const themeColor = role === UserRole.ADMIN ? 'indigo' : 'emerald';
  const logoBg = role === UserRole.ADMIN ? 'bg-indigo-600' : 'bg-emerald-600';
  const activeClass = role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
            <div className={`w-8 h-8 ${logoBg} rounded-lg flex items-center justify-center mr-3`}>
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">KIND</span>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {role === UserRole.ADMIN ? 'Admin' : 'Pro'}
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isActive(item.path)
                  ? activeClass
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 transition-colors duration-300">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 px-4 lg:px-0">
            {/* Breadcrumbs or Title could go here */}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              {role === UserRole.PROVIDER ? (
                <Link to="/provider/updates">
                  <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  )}
                </Link>
              ) : (
                <Link
                  to={role === UserRole.ADMIN ? "/admin/alerts" : "#"}
                  onClick={() => {
                    if (role === UserRole.ADMIN) {
                      localStorage.setItem('adminLastReadCount', notificationCount.toString());
                      setHasUnread(false);
                    }
                  }}
                >
                  <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  )}
                </Link>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600">
              <img src={`https://picsum.photos/seed/${role}/200`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          {children}
        </main>
      </div >
    </div >
  );
};
