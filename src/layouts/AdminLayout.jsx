



import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, Target, LogOut, Menu, X, LineChart, History, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

// Avatar Component - Same as UserLayout
const Avatar = ({
  src,
  alt,
  name,
  size = "md",
  className = "",
  showName = false,
  fallbackElement = null
}) => {
  const [imgSrc, setImgSrc] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Size variants
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-20 h-20 text-xl",
    "3xl": "w-24 h-24 text-2xl"
  };

  const getDriveImageUrls = (originalUrl) => {
    if (!originalUrl || typeof originalUrl !== "string") return [];

    // Extract file ID from various Google Drive URL formats
    let fileId = null;

    // Check if it's already a thumbnail URL
    const thumbnailMatch = originalUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (thumbnailMatch) {
      fileId = thumbnailMatch[1];
    } else {
      // Check other formats
      const fileIdMatch = originalUrl.match(/\/file\/d\/([^/]+)|id=([^&]+)|\/d\/([^/]+)/);
      fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] : null;
    }

    if (!fileId) return [originalUrl];

    // Return multiple fallback URLs with better CORS support
    return [
      `https://lh3.googleusercontent.com/d/${fileId}=w400-h400-c`, // Best for CORS
      `https://drive.google.com/uc?export=view&id=${fileId}`, // Direct export
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`, // Original thumbnail
      `https://lh3.googleusercontent.com/d/${fileId}`, // Simple googleusercontent
      `https://drive.google.com/file/d/${fileId}/view`, // View URL as last resort
      originalUrl, // Original URL as final fallback
    ];
  };

  useEffect(() => {
    if (!src || src.trim() === "") {
      setLoadFailed(true);
      return;
    }

    const urls = getDriveImageUrls(src);

    if (urls.length === 0) {
      setLoadFailed(true);
      return;
    }
    setImgSrc(urls[0]);
    setLoadFailed(false);
    setAttempts(0);
  }, [src]);

  const handleError = () => {
    const urls = getDriveImageUrls(src);
    const nextAttempt = attempts + 1;

    if (nextAttempt < urls.length) {
      setImgSrc(urls[nextAttempt]);
      setAttempts(nextAttempt);
    } else {
      setLoadFailed(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  const avatarClasses = `${sizeClasses[size]} rounded-full object-cover ${className}`;

  if (loadFailed || !src) {
    return (
      <div className="flex items-center gap-2">
        {fallbackElement || (
          <div className={`${avatarClasses} bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold shadow-lg`}>
            {getInitials(name)}
          </div>
        )}
        {showName && (
          <span className="text-sm font-medium text-gray-700">{name}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={imgSrc}
        alt={alt || name}
        onError={handleError}
        className={`${avatarClasses} shadow-lg ring-2 ring-white`}
        loading="lazy"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      {showName && (
        <span className="text-sm font-medium text-gray-700">{name}</span>
      )}
    </div>
  );
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold text-blue-600">MIS</span>
              <span className="text-xs sm:text-sm bg-blue-600 text-white px-2 py-0.5 rounded">ADMIN</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {user && (
              <div className="flex items-center gap-2">
                {/* Updated Avatar Component - Same as UserLayout */}
                <Avatar
                  src={user.image}
                  name={user.name}
                  size="sm"
                  className="border-2 border-gray-200"
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline-block text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[65px]">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white border-r border-gray-200 fixed top-[65px] bottom-0 left-0 z-20 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="h-full overflow-y-auto">
            <nav className="p-4 space-y-1">
              <Link
                to="/admin/dashboard"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/dashboard')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <LayoutDashboard size={20} className="shrink-0" />
                <span className="font-medium ml-3">Dashboard</span>
              </Link>
              <Link
                to="/admin/history-commitment"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/history-commitment')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <Clock size={20} className="shrink-0" />
                <span className="font-medium ml-3">Last Week Commitment</span>
              </Link>

              <Link
                to="/admin/history"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/history')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <History size={20} className="shrink-0" />
                <span className="font-medium ml-3">History</span>
              </Link>


              <Link
                to="/admin/today-tasks"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/today-tasks')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <Calendar size={20} className="shrink-0" />
                <span className="font-medium ml-3">Today Tasks</span>
              </Link>
              <Link
                to="/admin/pending-tasks"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/pending-tasks')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <ClipboardList size={20} className="shrink-0" />
                <span className="font-medium ml-3">Pending Tasks</span>
              </Link>
              {/* <Link
                to="/admin/commitment"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                  isActive('/admin/commitment')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={closeSidebar}
              >
                <Target size={20} className="shrink-0" />
                <span className="font-medium ml-3">Commitments</span>
              </Link> */}
              <Link
                to="/admin/kpi-kra"
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/admin/kpi-kra')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                onClick={closeSidebar}
              >
                <LineChart size={20} className="shrink-0" />
                <span className="font-medium ml-3">KPI & KRA</span>
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen pb-16">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;