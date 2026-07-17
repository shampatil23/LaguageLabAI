import { LogOut } from 'lucide-react';
import { currentUser } from '../mockData';
import { useNavigate } from 'react-router-dom';

export function TopRibbon() {
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-primary-600 text-white flex items-center justify-between px-4 shadow-sm z-50 sticky top-0 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold text-lg">
          LL
        </div>
        <span className="font-semibold text-lg tracking-tight">Language Lab AI</span>
      </div>

      <div className="flex items-center gap-4">
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
