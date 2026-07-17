import { Bell, HelpCircle, Search, User, LogOut } from 'lucide-react';
import { currentUser } from '../mockData';
import { Input } from './ui/Input';
import { useNavigate } from 'react-router-dom';

export function TopRibbon() {
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-primary-600 text-white flex items-center justify-between px-4 shadow-sm z-50 sticky top-0 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold text-lg">
            LL
          </div>
          <span className="font-semibold text-lg tracking-tight">Language Lab AI</span>
          <span className="text-primary-200 text-sm ml-2 hidden sm:inline-block">| Language Lab AI</span>
        </div>
        
        <div className="w-64 lg:w-96 hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-primary-200" />
            <input 
              type="text"
              placeholder="Search courses, students, practicals..." 
              className="h-8 w-full bg-primary-700/50 border border-primary-500 rounded-md pl-9 pr-3 text-sm text-white placeholder:text-primary-200 focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-1.5 hover:bg-primary-700 rounded-md transition-colors" title="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-warning-500 rounded-full border border-primary-600"></span>
        </button>
        <button className="p-1.5 hover:bg-primary-700 rounded-md transition-colors" title="Help">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-primary-500 mx-1"></div>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-primary-700 p-1.5 rounded-md transition-colors">
          <div className="w-7 h-7 bg-primary-200 text-primary-800 rounded-full flex items-center justify-center font-semibold text-xs">
            {(localStorage.getItem('userName') || currentUser.name).split(' ').map(n => n[0]).join('')}
          </div>
          <div className="hidden lg:block text-sm">
            <div className="font-medium leading-none">{localStorage.getItem('userName') || currentUser.name}</div>
            <div className="text-[10px] text-primary-200 mt-0.5 capitalize">{localStorage.getItem('userRole') || currentUser.role}</div>
          </div>
        </div>
        <button onClick={() => {
          localStorage.clear();
          navigate('/login', { replace: true });
        }} className="p-1.5 hover:bg-primary-700 rounded-md transition-colors ml-1 text-primary-200 hover:text-white" title="Logout">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
