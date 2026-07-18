import { Outlet, useNavigate } from 'react-router-dom';
import { TopRibbon } from './TopRibbon';
import { Sidebar } from './Sidebar';
import { useEffect } from 'react';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, onDisconnect } from 'firebase/database';


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
        if (data) {
          if (data.registeredDeviceId) {
            const localDeviceId = localStorage.getItem('deviceId');
            if (localDeviceId && data.registeredDeviceId !== localDeviceId) {
              auth.signOut().then(() => {
                alert('You have been logged out because your account was accessed from another device.');
                navigate('/login');
              });
            }
          }

          // Real-time student presence tracking
          if (data.role === 'student') {
            const statusRef = ref(database, 'users/' + user.uid + '/status');
            const connectedRef = ref(database, '.info/connected');
            onValue(connectedRef, (connectedSnap) => {
              if (connectedSnap.val() === true) {
                onDisconnect(statusRef).set('Offline');
                // Avoid overwriting a more detailed status (like Watching/Taking Quiz)
                // by check: only set to 'Online' if current status is Offline or missing
                if (!data.status || data.status === 'Offline') {
                  set(statusRef, 'Online');
                }
              }
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
