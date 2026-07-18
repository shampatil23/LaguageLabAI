import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from 'recharts';
import {
  Users, TrendingUp, Trophy, BookOpen, Brain, Star, AlertTriangle,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Target, Zap
} from 'lucide-react';
import { database, auth } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const LEVEL_ORDER = ['A1 Beginner', 'A2 Elementary', 'B1 Intermediate', 'B2 Upper Intermediate', 'C1 Advanced'];

export default function Analytics() {
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [aiSessions, setAiSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { setLoading(false); return; }

      // Fetch this teacher's students
      onValue(ref(database, 'users'), snap => {
        if (!snap.exists()) return;
        const data = snap.val();
        const myStudents = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(u => u.role === 'student' && u.teacherId === user.uid);
        setStudents(myStudents);

        // Fetch test results
        onValue(ref(database, 'testResults'), rsnap => {
          if (rsnap.exists()) {
            const ids = new Set(myStudents.map(s => s.id));
            const list = Object.entries(rsnap.val())
              .map(([id, val]: [string, any]) => ({ id, ...val }))
              .filter(r => ids.has(r.studentId));
            setResults(list);
          }
          setLoading(false);
        });

        // Collect AI session scores from each student's aiHistory
        const allSessions: any[] = [];
        myStudents.forEach(s => {
          onValue(ref(database, `users/${s.id}/aiHistory`), snap2 => {
            if (snap2.exists()) {
              Object.entries(snap2.val()).forEach(([id, val]: [string, any]) => {
                allSessions.push({ id, studentId: s.id, studentName: s.name || s.email, ...val });
              });
              setAiSessions([...allSessions]);
            }
          });
        });
      });
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading analytics...</div>;

  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const passed = results.filter(r => r.score >= 70).length;
  const passRate = results.length ? Math.round((passed / results.length) * 100) : 0;
  const avgAiScore = aiSessions.length ? Math.round(aiSessions.reduce((s, h) => s + (h.score || 0), 0) / aiSessions.length) : 0;

  // Per-student analysis
  const studentAnalysis = students.map(s => {
    const sResults = results.filter(r => r.studentId === s.id);
    const sAi = aiSessions.filter(a => a.studentId === s.id);
    const sAvg = sResults.length ? Math.round(sResults.reduce((acc, r) => acc + r.score, 0) / sResults.length) : 0;
    const sBest = sResults.length ? Math.max(...sResults.map(r => r.score)) : 0;
    const sWorst = sResults.length ? Math.min(...sResults.map(r => r.score)) : 0;
    const sAiAvg = sAi.length ? Math.round(sAi.reduce((acc, h) => acc + (h.score || 0), 0) / sAi.length) : 0;
    const sLevel = s.level || 'A1 Beginner';

    // Trend: compare last 2 vs first 2
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (sResults.length >= 4) {
      const sorted = [...sResults].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      const early = (sorted[0].score + sorted[1].score) / 2;
      const recent = (sorted[sorted.length - 1].score + sorted[sorted.length - 2].score) / 2;
      trend = recent > early + 5 ? 'up' : recent < early - 5 ? 'down' : 'stable';
    }

    return { student: s, results: sResults, aiSessions: sAi, avg: sAvg, best: sBest, worst: sWorst, aiAvg: sAiAvg, level: sLevel, trend };
  });

  // Level distribution
  const levelDist = LEVEL_ORDER.map(l => ({
    name: l.split(' ')[0],
    count: students.filter(s => (s.level || 'A1 Beginner') === l).length,
  }));

  // Score distribution over time (last 10 results)
  const timelineData = [...results]
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .slice(-12)
    .map((r, i) => ({ name: `#${i + 1}`, score: r.score, student: r.studentName }));

  // Course performance
  const coursePerfMap: Record<string, { total: number; count: number }> = {};
  results.forEach(r => {
    const key = r.courseTitle || 'Uncategorized';
    if (!coursePerfMap[key]) coursePerfMap[key] = { total: 0, count: 0 };
    coursePerfMap[key].total += r.score;
    coursePerfMap[key].count += 1;
  });
  const coursePerf = Object.entries(coursePerfMap).map(([name, d]) => ({ name: name.slice(0, 20), avg: Math.round(d.total / d.count) }));

  // Radar - class overview
  const classRadar = [
    { subject: 'Quiz Avg', score: avgScore },
    { subject: 'Pass Rate', score: passRate },
    { subject: 'AI Practice', score: avgAiScore },
    { subject: 'Engagement', score: Math.min(100, results.length * 5) },
    { subject: 'Consistency', score: results.length >= 10 ? 80 : 40 },
  ];

  // Pie - score spread
  const scorePie = [
    { name: 'Excellent (90+)', value: results.filter(r => r.score >= 90).length },
    { name: 'Good (70-89)', value: results.filter(r => r.score >= 70 && r.score < 90).length },
    { name: 'Needs Work (<70)', value: results.filter(r => r.score < 70).length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">In-Depth Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Comprehensive analysis of your students' performance and learning activity.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: students.length, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Class Avg Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'AI Sessions', value: aiSessions.length, icon: Brain, color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <Card key={stat.label} className="border-slate-200 rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Radar */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Class Performance Radar</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={classRadar}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution Pie */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scorePie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {scorePie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 ml-2 min-w-0">
                {scorePie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="text-[10px] text-slate-600 truncate">{d.name}</span>
                    <span className="text-[10px] font-bold text-slate-700 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level Distribution */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Level Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={levelDist} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Timeline */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Recent Score Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }} formatter={(v: any, _, p) => [`${v}%`, p.payload?.student || 'Score']} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Course Performance */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Performance by Course</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={coursePerf} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }} formatter={(v: any) => [`${v}%`, 'Avg Score']} />
                  <Bar dataKey="avg" fill="#10b981" radius={[0, 6, 6, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Student Deep Dive */}
      <Card className="border-slate-200 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Individual Student Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {studentAnalysis.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              No students assigned to you yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentAnalysis.map(({ student, results: sRes, aiSessions: sAi, avg, best, worst, aiAvg, level, trend }) => (
                <div key={student.id}>
                  {/* Student Row Header */}
                  <button
                    onClick={() => setExpandedStudent(prev => prev === student.id ? null : student.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center flex-shrink-0 text-sm">
                      {(student.name || student.email || 'S')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{student.name || student.email}</p>
                      <p className="text-[11px] text-slate-500">{level}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                      <div className="text-center">
                        <p className="font-black text-slate-900 text-base">{avg > 0 ? `${avg}%` : '—'}</p>
                        <p>Avg Score</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-slate-900 text-base">{sRes.length}</p>
                        <p>Quizzes</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-slate-900 text-base">{sAi.length}</p>
                        <p>AI Sessions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {trend === 'up' && <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold"><ArrowUpRight className="w-3.5 h-3.5" /> Improving</span>}
                      {trend === 'down' && <span className="flex items-center gap-0.5 text-rose-500 text-xs font-bold"><ArrowDownRight className="w-3.5 h-3.5" /> Declining</span>}
                      {trend === 'stable' && <span className="text-slate-400 text-xs">Stable</span>}
                      {expandedStudent === student.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedStudent === student.id && (
                    <div className="bg-slate-50/80 px-5 py-4 space-y-4 border-t border-slate-100">
                      {/* Mini Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Best Score', value: sRes.length ? `${best}%` : '—', color: 'text-emerald-700 bg-emerald-50' },
                          { label: 'Worst Score', value: sRes.length ? `${worst}%` : '—', color: 'text-rose-600 bg-rose-50' },
                          { label: 'AI Avg', value: sAi.length ? `${aiAvg}/100` : '—', color: 'text-purple-700 bg-purple-50' },
                          { label: 'Pass Rate', value: sRes.length ? `${Math.round((sRes.filter(r => r.score >= 70).length / sRes.length) * 100)}%` : '—', color: 'text-blue-700 bg-blue-50' },
                        ].map(s => (
                          <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color)}>
                            <p className="font-black text-lg">{s.value}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Score list */}
                      {sRes.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Recent Quiz Scores</p>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {sRes.slice(0, 6).map(r => (
                              <div key={r.id} className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-xl border border-slate-100">
                                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg',
                                  r.score >= 90 ? 'bg-emerald-100 text-emerald-700' : r.score >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-600'
                                )}>{r.score}%</span>
                                <span className="text-xs text-slate-700 flex-1 truncate">{r.lessonName}</span>
                                <span className="text-[10px] text-slate-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sRes.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs">
                          <AlertTriangle className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                          No quiz submissions yet from this student.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
