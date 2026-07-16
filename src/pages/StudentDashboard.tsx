import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PlayCircle, Target, Award, ArrowRight, Mic, BookOpen, Headphones, Hand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { cn } from '../lib/utils';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [micActive, setMicActive] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const userRef = ref(database, 'users/' + user.uid);
        
        // Presence logic
        set(ref(database, 'users/' + user.uid + '/onlineStatus'), 'online');
        onDisconnect(ref(database, 'users/' + user.uid + '/onlineStatus')).set('offline');
        
        onValue(userRef, snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setStudentData(data);
            if (data.micActive !== undefined) setMicActive(data.micActive);
            if (data.handRaised !== undefined) setHandRaised(data.handRaised);
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  const toggleMic = () => {
    if (!auth.currentUser) return;
    set(ref(database, 'users/' + auth.currentUser.uid + '/micActive'), !micActive);
  };

  const toggleHand = () => {
    if (!auth.currentUser) return;
    set(ref(database, 'users/' + auth.currentUser.uid + '/handRaised'), !handRaised);
  };

  const name = studentData?.name || 'Student';
  const level = studentData?.level || 'B1 Intermediate';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {name}</h1>
          <p className="text-slate-500 mt-1">You are currently at <strong className="text-primary-600 font-medium">{level}</strong> level in English.</p>
        </div>
        <Badge variant="success" className="text-sm px-3 py-1">Target: B2 Upper Intermediate</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="col-span-2 bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0 shadow-lg">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between h-full gap-6">
            <div className="space-y-4 max-w-sm">
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">Today's Goal</Badge>
              <h2 className="text-3xl font-bold">{studentData?.todayGoal?.title || 'Complete Lesson: Airport Check-in'}</h2>
              <p className="text-primary-100">{studentData?.todayGoal?.description || 'Practice your speaking and listening skills in a simulated airport environment.'}</p>
              <Button variant="secondary" className="mt-2" onClick={() => navigate('/conversation-practice')}>
                Start Lesson <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="w-32 h-32 rounded-full border-8 border-white/20 flex items-center justify-center shrink-0">
               <div className="text-center">
                 <div className="text-3xl font-bold">{studentData?.progress || '0'}%</div>
                 <div className="text-xs text-primary-100 font-medium uppercase tracking-wider">Completed</div>
               </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentData?.achievements ? studentData.achievements.map((ach: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center"><Award className="w-5 h-5"/></div>
                <div>
                  <div className="font-semibold text-slate-800">{ach.title}</div>
                  <div className="text-xs text-slate-500">{ach.desc}</div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-500 py-4 text-center">No achievements yet. Keep practicing!</div>
            )}
            <Button variant="outline" className="w-full text-xs">View All Badges</Button>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Recommended for you</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {studentData?.recommendations ? studentData.recommendations.map((rec: any, idx: number) => (
          <Card key={idx} className="hover:border-primary-300 transition-colors cursor-pointer group" onClick={() => navigate(rec.path || '/conversation-practice')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><BookOpen className="w-6 h-6"/></div>
              <h3 className="font-semibold text-slate-900 mb-1">{rec.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{rec.desc}</p>
              <div className="flex justify-between items-center">
                 <span className="text-xs font-medium text-slate-400">{rec.duration || '15 mins'}</span>
                 <PlayCircle className="w-5 h-5 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-3 text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
             No specific recommendations right now. Explore the Content Library!
          </div>
        )}
      </div>
    </div>
  );
}
