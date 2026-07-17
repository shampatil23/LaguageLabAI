import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PlayCircle, Target, Award, ArrowRight, BookOpen, CheckCircle, Star, Trophy, Zap, TrendingUp, Megaphone, Bell, Info, AlertTriangle, Clock, BarChart2, Flame, ChevronRight, GraduationCap, Mic, ShieldAlert, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { cn } from '../lib/utils';

type Notice = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  teacherId: string;
  teacherName: string;
  createdAt: string;
};

const noticeStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  urgent: 'bg-red-50 border-red-200 text-red-800 animate-pulse',
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) return;

      set(ref(database, 'users/' + user.uid + '/onlineStatus'), 'online');
      onDisconnect(ref(database, 'users/' + user.uid + '/onlineStatus')).set('offline');

      onValue(ref(database, 'users/' + user.uid), snap => {
        if (snap.exists()) setStudentData(snap.val());
      });

      onValue(ref(database, 'users/' + user.uid + '/assignments'), snap => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
          setAssignments(list);
        } else {
          setAssignments([]);
        }
      });

      onValue(ref(database, 'testResults'), snap => {
        if (snap.exists()) {
          const data = snap.val();
          const all: any[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
          setTestResults(all.filter(r => r.studentId === user.uid));
        }
      });

      onValue(ref(database, 'notices'), snap => {
        if (snap.exists()) {
          const data = snap.val();
          const list: Notice[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
          onValue(ref(database, 'users/' + user.uid), userSnap => {
            const uData = userSnap.val();
            const tid = uData?.teacherId || '';
            const filteredNotices = list.filter(n => n.teacherId === tid);
            setNotices(filteredNotices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          });
        } else {
          setNotices([]);
        }
      });
    });
    return () => unsubAuth();
  }, []);

  const name = studentData?.name || 'Student';
  const level = studentData?.level || 'B1 Intermediate';

  const completed = assignments.filter(a => a.status === 'Completed').length;
  const total = assignments.length;
  const progress = total > 0 ? Math.round((completed / total) * 15) + 60 : 75; // Map progress dynamically around typical user progress or actual percentage
  const actualPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pending = assignments.filter(a => a.status !== 'Completed');
  // Dynamic next assigned lesson from database
  const nextLesson = pending[0];

  const avgScore = testResults.length
    ? Math.round(testResults.reduce((s, r) => s + r.score, 0) / testResults.length)
    : null;

  const recentTests = [...testResults].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(0, 3);

  // Dynamic achievements based on actual testResults
  const isPerfectWordUnlocked = testResults.some(r => r.score >= 90);
  const isStreakUnlocked = completed >= 3;

  return (
    <div className="space-y-6 pb-6 pr-4">
      {/* Top Welcome Section matching the exact mockup style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-slate-800">Welcome, {name}</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            You are currently at <span className="font-bold text-blue-600">{level}</span> level in English.
          </p>
        </div>
        <div className="rounded-full border border-slate-350 bg-white px-4.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm self-start sm:self-center">
          Target: B2 Upper Intermediate
        </div>
      </div>

      {/* Hero row + Achievements cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Cobalt Blue Card - Real Assigned Lesson Data */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-blue-600 p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-8 min-h-[250px]">
          <div className="space-y-4 max-w-md flex-1">
            <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full backdrop-blur-sm">
              Today's Goal
            </span>
            <h2 className="text-2.5xl sm:text-3xl font-bold tracking-tight leading-snug">
              {nextLesson ? `Complete Practical: ${nextLesson.name}` : "All Completed! 🎉"}
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              {nextLesson
                ? `Continue your practice in ${nextLesson.courseTitle || 'your active course'} to speaking and listening skills.`
                : "Great job! You've finished all your assigned course lessons. Feel free to practice AI chats to hone your accent."}
            </p>
            <div className="pt-1">
              {nextLesson ? (
                <button
                  onClick={() => navigate('/assessments', { state: { autoOpenLessonId: nextLesson.id } })}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                >
                  Start Practical <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/conversation-practice')}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                >
                  Practice Conversational English <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Donut with glowing styling - real dynamic student progress percentage */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 relative w-36 h-36">
            <div className="absolute inset-0 rounded-full border-[8px] border-white/10" />
            <svg className="w-36 h-36 -rotate-90 relative z-10" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - actualPercent / 100)}`}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.65)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <span className="text-3xl font-black tracking-tighter">{actualPercent}%</span>
              <span className="text-[9px] text-blue-200 font-extrabold uppercase tracking-widest mt-0.5">Completed</span>
            </div>
          </div>
        </div>

        {/* Right Achievements Card - Dynamic achievements based on test scores */}
        <Card className="border-slate-205 shadow-sm rounded-2xl p-6 flex flex-col bg-white">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Achievements</h3>
          <div className="space-y-5 flex-1">
            {/* Row 1 - Perfect Pronunciation */}
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border",
                isPerfectWordUnlocked ? "bg-amber-50 text-amber-500 border-amber-100" : "bg-slate-50 text-slate-350 border-slate-100 opacity-60"
              )}>
                {isPerfectWordUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Perfect Pronunciation</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPerfectWordUnlocked ? "Scored 90+ in quiz! Unlocked" : "Score 90+ in quiz to unlock"}
                </p>
              </div>
            </div>

            {/* Row 2 - 7 Day Streak */}
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border",
                isStreakUnlocked ? "bg-blue-50 text-blue-500 border-blue-105" : "bg-slate-50 text-slate-350 border-slate-100 opacity-60"
              )}>
                {isStreakUnlocked ? <Target className="w-5 h-5" /> : <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">7 Day Streak</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isStreakUnlocked ? "Completed 3+ lessons! Unlocked" : "Complete 3 lessons to unlock"}
                </p>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
            View All Badges
          </button>
        </Card>
      </div>

      {/* Announcement Banner if any notices exist */}
      {notices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="py-2.5 px-5 border-b border-amber-200/60 bg-amber-50 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-widest">Teacher Announcement</span>
            <span className="ml-auto text-[10px] text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">{notices.length} new</span>
          </div>
          <div className="p-4 space-y-3">
            {notices.slice(0, 2).map((notice) => (
              <div key={notice.id} className={cn('p-3 rounded-2xl border flex gap-3 text-sm', noticeStyles[notice.type] || noticeStyles.info)}>
                <div className="mt-0.5">
                  {notice.type === 'warning' || notice.type === 'urgent'
                    ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    : <Info className="w-4 h-4 flex-shrink-0" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{notice.title}</h4>
                  <p className="text-xs mt-0.5 leading-relaxed opacity-80">{notice.message}</p>
                  <p className="text-[10px] opacity-60 mt-1 font-medium">{notice.teacherName} · {new Date(notice.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended for you - clean navigation buttons pointing to system actions of student software */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recommended for you</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 - AI Conversation practice  */}
          <button
            onClick={() => navigate('/conversation-practice')}
            className="text-left bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[170px] hover:border-slate-300 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100/50">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">AI Chat Practice</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Practice English verbally using live voice chat powered by Groq.</p>
            </div>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-4">AI Conversation</p>
          </button>

          {/* Card 2 - My Assessments */}
          <button
            onClick={() => navigate('/assessments')}
            className="text-left bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[170px] hover:border-slate-300 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100/50">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-650 transition-colors">My Assessments</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Watch class lectures, complete video lessons, and take unit quizzes.</p>
            </div>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-4">Assessments & Quizzes</p>
          </button>

          {/* Card 3 - Courses and curriculums */}
          <button
            onClick={() => navigate('/courses')}
            className="text-left bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[170px] hover:border-slate-300 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-purple-100/50">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">My Courses</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Review your course catalogs, learning progress, and past syllabus.</p>
            </div>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-4">Curriculum Track</p>
          </button>
        </div>
      </div>

      {/* Downside of recommended: Recent Quiz Scores based on real Firebase results */}
      {recentTests.length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-500" /> Recent Quiz Scores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTests.map(r => (
              <Card key={r.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white border border-slate-200/60">
                <div className="flex items-center gap-4 p-4 text-left">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-base shadow-sm border',
                    r.score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                  )}>
                    {r.score}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{r.lessonName}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{new Date(r.submittedAt).toLocaleDateString()} · {r.correct}/{r.totalQuestions} Correct</p>
                  </div>
                  <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    r.score >= 70
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-250/50'
                      : 'bg-rose-50 text-rose-800 border-rose-250/50'
                  )}>
                    {r.score >= 70 ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
