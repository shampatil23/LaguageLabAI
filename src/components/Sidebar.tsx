import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  BookOpen,
  FolderOpen,
  Users,
  FileCheck,
  BarChart3,
  PieChart,
  DownloadCloud,
  BrainCircuit,
  Settings,
  Target,
  ChevronLeft,
  ChevronRight,
  Building2,
  Megaphone,
  Menu,
  X
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
  const [mobileOpen, setMobileOpen] = useState(false);

  let navItems = teacherNavItems;
  if (role === 'student') navItems = studentNavItems;
  if (role === 'super_admin') navItems = superAdminNavItems;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  const navContent = (onItemClick?: () => void) => (
    <>
      <div className="flex-1 py-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={onItemClick}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              isActive
                ? "bg-primary-50 text-primary-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </div>

      {!collapsed && (
        <div className={cn("border-t border-slate-205 mt-auto", collapsed ? "p-3" : "p-4")}>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-success-500 shrink-0"></div>
            <span className="truncate">Online Sync: Active</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── Mobile Hamburger Button (shown in TopRibbon area via absolute positioning) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 md:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-primary-600 text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center font-bold text-sm">LL</div>
            <span className="font-semibold text-base">Language Lab AI</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 hover:bg-primary-700 rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          {navContent(() => setMobileOpen(false))}
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <div className={cn(
        "bg-white border-r border-slate-200 h-[calc(100vh-3.5rem)] flex-col shrink-0 sticky top-14 overflow-y-auto hidden md:flex transition-all duration-300",
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

        {!collapsed && (
          <div className={cn("border-t border-slate-200 mt-auto p-4")}>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-success-500 shrink-0"></div>
              <span className="truncate">Online Sync: Active</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
