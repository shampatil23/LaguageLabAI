import { Outlet, useNavigate } from 'react-router-dom';
import { TopRibbon } from './TopRibbon';
import { Sidebar } from './Sidebar';
import { useEffect } from 'react';
import { auth, database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';


export function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      const userRef = ref(database, 'users/' + user.uid);
      const unsubDb = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.registeredDeviceId) {
          const localDeviceId = localStorage.getItem('deviceId');
          if (localDeviceId && data.registeredDeviceId !== localDeviceId) {
            auth.signOut().then(() => {
              alert('You have been logged out because your account was accessed from another device.');
              navigate('/login');
            });
          }
        }
      });
      return () => unsubDb();
    });
    return () => unsubAuth();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      <TopRibbon />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
