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
  Clock,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartLine, current: true },
  { name: 'User Profile', href: '/user', icon: User, current: false },
  { name: 'Futures', href: '/futures', icon: Coins, current: false },
  { name: 'Options', href: '/options', icon: PieChart, current: false },
  {
    name: 'Schedule Swaps',
    href: '/schedule-swaps',
    icon: Clock,
    current: false,
  },
  { name: 'History', href: '/history', icon: History, current: false },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <SidebarPrimitive collapsible="icon" className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200">
        <div className="flex items-center justify-center group-data-[state=expanded]:justify-start space-x-3 px-4 py-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="text-white h-5 w-5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-lg font-bold text-gray-900">LN Markets</h1>
            <p className="text-xs text-gray-500">Trading Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        isActive
                          ? '!text-primary bg-blue-100 hover:text-primary hover:bg-blue-50'
                          : 'text-gray-600 hover:text-primary hover:bg-gray-50',
                        'flex items-center space-x-2'
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="User Profile"
              className="hover:bg-gray-50"
            >
              <Link href="/user" className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="text-gray-600 h-3 w-3" />
                </div>
                <div className="flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.apiKey ? 'API Connected' : 'API Not Connected'}
                  </p>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Sign Out"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </SidebarPrimitive>
  );
}
