import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  BookOpen,
  FolderOpen,
  Users,
  UserSquare2,
  FileCheck,
  BarChart3,
  PieChart,
  MessageSquare,
  DownloadCloud,
  BrainCircuit,
  Settings,
  Target,
  ChevronLeft,
  ChevronRight,
  Building2,
  Megaphone
} from 'lucide-react';
import { cn } from '../lib/utils';

const superAdminNavItems = [
  { name: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
  { name: 'Institutions', path: '/institutions', icon: Building2 },
  { name: 'Create Course', path: '/create-course', icon: BookOpen },
];

import { UserPlus } from 'lucide-react';

const teacherNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'My Students', path: '/students', icon: Users },
  { name: 'Assessments', path: '/assessments', icon: FileCheck },
  { name: 'My Courses', path: '/courses', icon: BookOpen },
  { name: 'Content Library', path: '/content-library', icon: FolderOpen },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Analytics', path: '/analytics', icon: PieChart },
  { name: 'Broadcast', path: '/communication', icon: Megaphone },
  { name: 'Downloads', path: '/downloads', icon: DownloadCloud },
];

const studentNavItems = [
  { name: 'Dashboard', path: '/student-dashboard', icon: LayoutDashboard },
  { name: 'My Assessments', path: '/assessments', icon: FileCheck },
  { name: 'My Courses', path: '/courses', icon: BookOpen },
  { name: 'AI Conversation', path: '/conversation-practice', icon: BrainCircuit },
  { name: 'AI Learning', path: '/ai-learning', icon: MonitorPlay },
  { name: 'Notices', path: '/communication', icon: Megaphone },
  { name: 'My Progress', path: '/reports', icon: Target },
];

export function Sidebar() {
  const role = localStorage.getItem('userRole') || 'teacher';
  const [collapsed, setCollapsed] = useState(false);

  let navItems = teacherNavItems;
  if (role === 'student') navItems = studentNavItems;
  if (role === 'super_admin') navItems = superAdminNavItems;

  return (
    <div className={cn(
      "bg-white border-r border-slate-200 h-[calc(100vh-3.5rem)] flex flex-col shrink-0 sticky top-14 overflow-y-auto hidden md:flex transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex-1 py-4 flex flex-col gap-1 px-3">
        <div className={cn(
          "flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2",
          collapsed ? "justify-center px-0" : "justify-between px-3"
        )}>
          {!collapsed && <span>Menu</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              isActive
                ? "bg-primary-50 text-primary-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.name}
          </NavLink>
        ))}
      </div>

      <div className={cn("border-t border-slate-200 mt-auto", collapsed ? "p-3" : "p-4")}>
        <NavLink
          to="/settings"
          title={collapsed ? "Settings" : undefined}
          className={({ isActive }) => cn(
            "flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            isActive
              ? "bg-primary-50 text-primary-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && "Settings"}
        </NavLink>

        {!collapsed && (
          <div className="mt-4 px-3 flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-success-500 shrink-0"></div>
            <span className="truncate">Online Sync: Active</span>
          </div>
        )}
      </div>
    </div>
  );
}
