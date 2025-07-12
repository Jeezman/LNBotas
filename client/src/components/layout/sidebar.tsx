import { 
  ChartLine, 
  Coins, 
  PieChart, 
  History, 
  Briefcase, 
  Settings, 
  Zap, 
  User, 
  LogOut 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartLine, current: true },
  { name: 'User Profile', href: '/user', icon: User, current: false },
  { name: 'Futures', href: '/futures', icon: Coins, current: false },
  { name: 'Options', href: '/options', icon: PieChart, current: false },
  { name: 'History', href: '/history', icon: History, current: false },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">LN Markets</h1>
            <p className="text-xs text-gray-500">Trading Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "text-primary bg-blue-50"
                      : "text-gray-600 hover:text-primary hover:bg-gray-50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-6 border-t border-gray-200 space-y-3">
        <Link href="/user" className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="text-gray-600 h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-500">
              {user?.apiKey ? 'API Connected' : 'API Not Connected'}
            </p>
          </div>
        </Link>
        
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 hover:bg-red-50 rounded-lg p-2 transition-colors text-red-600 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
