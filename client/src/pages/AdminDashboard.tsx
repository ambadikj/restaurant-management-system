import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  LayoutGrid, 
  UtensilsCrossed, 
  Boxes, 
  Timer, 
  QrCode, 
  LineChart, 
  LogOut,
  UserCircle
} from 'lucide-react';

// 1. Extract config outside the component to prevent re-creation on renders
const DASHBOARD_MODULES = [
  {
    id: 'employees',
    title: 'Manage Employees',
    description: 'Add staff, assign roles, and manage access permissions.',
    path: '/admin/employees',
    icon: Users,
    color: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      borderHover: 'hover:border-blue-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.15)]',
      iconGroupHover: 'group-hover:text-blue-300'
    }
  },
  {
    id: 'categories',
    title: 'Manage Categories',
    description: 'Organize food and drink offerings into distinct menu groups.',
    path: '/admin/categories',
    icon: LayoutGrid,
    color: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      borderHover: 'hover:border-indigo-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)]',
      iconGroupHover: 'group-hover:text-indigo-300'
    }
  },
  {
    id: 'menu',
    title: 'Manage Menu',
    description: 'Add items, set pricing, upload images, and toggle availability.',
    path: '/admin/menu',
    icon: UtensilsCrossed,
    color: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      borderHover: 'hover:border-green-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(34,197,94,0.15)]',
      iconGroupHover: 'group-hover:text-green-300'
    }
  },
  {
    id: 'inventory',
    title: 'Manage Inventory',
    description: 'Track raw ingredients, monitor stock levels, and log deliveries.',
    path: '/admin/inventory',
    icon: Boxes,
    color: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      borderHover: 'hover:border-yellow-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)]',
      iconGroupHover: 'group-hover:text-yellow-300'
    }
  },
  {
    id: 'limits',
    title: 'Set Daily Limits',
    description: 'Configure daily production caps and order limits for items.',
    path: '/admin/limits',
    icon: Timer,
    color: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      borderHover: 'hover:border-red-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(239,68,68,0.15)]',
      iconGroupHover: 'group-hover:text-red-300'
    }
  },
  {
    id: 'tables',
    title: 'Tables & QR Codes',
    description: 'Manage seating arrangements and generate scan-to-order QR codes.',
    path: '/admin/tables',
    icon: QrCode,
    color: {
      text: 'text-teal-400',
      bg: 'bg-teal-500/10',
      borderHover: 'hover:border-teal-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(20,184,166,0.15)]',
      iconGroupHover: 'group-hover:text-teal-300'
    }
  },
  {
    id: 'reports',
    title: 'View Reports',
    description: 'Analyze daily sales, popular items, and overall performance.',
    path: '/admin/reports',
    icon: LineChart,
    color: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/10',
      borderHover: 'hover:border-orange-500/50',
      shadowHover: 'hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.15)]',
      iconGroupHover: 'group-hover:text-orange-300'
    }
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  // 2. Safe parsing for localStorage to prevent app crashes on malformed JSON
  const user = useMemo(() => {
    try {
      const userString = localStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true }); // Prevent users from clicking 'back' into dashboard
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] font-sans selection:bg-blue-500/30">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-10 border-b border-gray-800 bg-[#0A0D14]/80 backdrop-blur-md px-6 py-4 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
              <UserCircle className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-50 tracking-tight">Admin Portal</h1>
              <p className="text-gray-400 text-xs font-medium">
                Welcome back, <span className="text-gray-200">{user?.fullName || 'Manager'}</span>
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            aria-label="Logout"
            className="group flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-200 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">Overview</h2>
            <p className="text-gray-400 text-sm mt-1">Select a module to manage your restaurant operations.</p>
          </div>

          {/* Dynamic Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {DASHBOARD_MODULES.map((module) => {
              const Icon = module.icon;
              
              return (
                <Link 
                  key={module.id}
                  to={module.path} 
                  className={`
                    group relative flex flex-col bg-[#11151F] border border-gray-800 rounded-2xl p-6 
                    transition-all duration-300 ease-out
                    hover:-translate-y-1 hover:bg-[#151A26]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
                    ${module.color.borderHover} ${module.color.shadowHover}
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 ${module.color.bg}`}>
                    <Icon className={`w-6 h-6 transition-colors ${module.color.text} ${module.color.iconGroupHover}`} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-100 mb-2 transition-colors group-hover:text-white">
                    {module.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm leading-relaxed flex-grow">
                    {module.description}
                  </p>

                  {/* Optional: Subtle decorative arrow indicator on hover */}
                  <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                     <svg className={`w-5 h-5 ${module.color.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                  </div>
                </Link>
              );
            })}
          </div>
          
        </div>
      </main>
    </div>
  );
}