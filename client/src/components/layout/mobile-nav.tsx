import { useState } from 'react';
import { 
  ChartLine, 
  Coins, 
  PieChart, 
  History, 
  Briefcase, 
  Settings, 
  Zap, 
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartLine },
  { name: 'User Profile', href: '/user', icon: User },
  { name: 'Futures', href: '/futures', icon: Coins },
  { name: 'Options', href: '/options', icon: PieChart },
  { name: 'History', href: '/history', icon: History },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
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
          
          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={handleNavigation}
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
          
          {/* User Section */}
          <div className="p-6 border-t border-gray-200 space-y-3">
            <Link 
              href="/user" 
              onClick={handleNavigation}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
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
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 hover:bg-red-50 rounded-lg p-2 transition-colors text-red-600 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 