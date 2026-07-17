import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { FileDown, Trophy, TrendingUp, Users, BookOpen, Star, Zap, Award, Target, Brain, MessageSquare } from 'lucide-react';
import { database, auth } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { cn } from '../lib/utils';

type TestResult = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  lessonName: string;
  courseTitle: string;
  className: string;
  semester: string;
  sessionName: string;
  testTitle: string;
  totalQuestions: number;
  correct: number;
  score: number;
  submittedAt: string;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const role = localStorage.getItem('userRole') || 'teacher';
  const [results, setResults] = useState<TestResult[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [teacherStudentIds, setTeacherStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) { setLoading(false); return; }

      if (role === 'student') {
        onValue(ref(database, 'testResults'), snap => {
          const data = snap.val();
          if (data) {
            const list: TestResult[] = Object.entries(data)
              .map(([id, val]: [string, any]) => ({ id, ...val }))
              .filter(r => r.studentId === user.uid);
            setResults(list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
          } else { setResults([]); }
        });

        onValue(ref(database, `users/${user.uid}/aiHistory`), snap => {
          if (snap.exists()) {
            const data = snap.val();
            setAiHistory(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
          } else { setAiHistory([]); }
          setLoading(false);
        });
      } else {
        onValue(ref(database, 'users'), snap => {
          const data = snap.val();
          if (data) {
            const myStudentIds = new Set<string>(
              Object.entries(data)
                .filter(([, val]: [string, any]) => val.role === 'student' && val.teacherId === user.uid)
                .map(([id]) => id)
            );
            setTeacherStudentIds(myStudentIds);
            onValue(ref(database, 'testResults'), rsnap => {
              const rdata = rsnap.val();
              if (rdata) {
                const list: TestResult[] = Object.entries(rdata)
                  .map(([id, val]: [string, any]) => ({ id, ...val }))
                  .filter(r => myStudentIds.has(r.studentId));
                setResults(list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
              } else { setResults([]); }
              setLoading(false);
            });
          }
        });
      }
    });
    return () => unsubAuth();
  }, [role]);

  const filtered = results.filter(r => {
    const matchStudent = !filterStudent || r.studentName.toLowerCase().includes(filterStudent.toLowerCase());
    const matchCourse = !filterCourse || r.courseTitle.toLowerCase().includes(filterCourse.toLowerCase());
    return matchStudent && matchCourse;
  });

  const avgScore = results.length ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
  const uniqueStudents = new Set(results.map(r => r.studentId)).size;
  const passed = results.filter(r => r.score >= 70).length;

  // Chart configurations
  const lineData = results.slice(0, 10).reverse().map((r, i) => ({
    name: `Q${i + 1}`,
    score: r.score,
    lesson: r.lessonName,
  }));

  const pieData = [
    { name: 'Excellent (90+)', value: results.filter(r => r.score >= 90).length },
    { name: 'Good (70-89)', value: results.filter(r => r.score >= 70 && r.score < 90).length },
    { name: 'Needs Work (<70)', value: results.filter(r => r.score < 70).length },
  ].filter(d => d.value > 0);

  const radarData = [
    { subject: 'Quiz Avg', score: avgScore },
    { subject: 'Pass Rate', score: results.length > 0 ? Math.round((passed / results.length) * 100) : 0 },
    { subject: 'Consistency', score: results.length >= 3 ? 80 : results.length >= 1 ? 50 : 20 },
    { subject: 'AI Practice', score: aiHistory.length > 0 ? Math.round(aiHistory.reduce((s, h) => s + (h.score || 0), 0) / aiHistory.length) : 0 },
    { subject: 'Completion', score: results.length > 0 ? Math.min(100, results.length * 15) : 0 },
  ];

  // Student bar chart (teacher view)
  const studentScores: Record<string, { name: string; total: number; count: number }> = {};
  results.forEach(r => {
    if (!studentScores[r.studentId]) studentScores[r.studentId] = { name: r.studentName, total: 0, count: 0 };
    studentScores[r.studentId].total += r.score;
    studentScores[r.studentId].count += 1;
  });
  const chartData = Object.values(studentScores).map(s => ({
    name: s.name.split(' ')[0],
    avgScore: Math.round(s.total / s.count)
  })).slice(0, 10);

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">{score}%</span>;
    if (score >= 70) return <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs">{score}%</span>;
    return <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-xs">{score}%</span>;
  };

  // ─── STUDENT VIEW ───────────
  if (role === 'student') {
    // Compute achievements
    const achievements = [
      { icon: '🏆', title: 'First Test', desc: 'Completed your first quiz', unlocked: results.length >= 1 },
      { icon: '⭐', title: 'High Achiever', desc: 'Average score above 80%', unlocked: avgScore >= 80 },
      { icon: '💯', title: 'Perfect Score', desc: 'Got 100% on a quiz', unlocked: results.some(r => r.score === 100) },
      { icon: '🔥', title: 'On A Roll', desc: 'Completed 5+ quizzes', unlocked: results.length >= 5 },
      { icon: '🤖', title: 'AI Practitioner', desc: 'Completed an AI conversation', unlocked: aiHistory.length >= 1 },
      { icon: '🎯', title: 'Consistent Learner', desc: 'Scored 70%+ on 3 quizzes in a row', unlocked: (() => { let streak = 0; for (const r of [...results].reverse()) { if (r.score >= 70) streak++; else break; } return streak >= 3; })() },
    ];
    const avgAiScore = aiHistory.length > 0 ? Math.round(aiHistory.reduce((s, h) => s + (h.score || 0), 0) / aiHistory.length) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Progress</h1>
          <p className="text-slate-500 text-sm mt-1">Track your learning journey, scores, and achievements.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Quizzes Taken', value: results.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
            { label: 'Passed (≥70%)', value: passed, icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'AI Sessions', value: aiHistory.length, icon: Brain, color: 'text-purple-600 bg-purple-50' },
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

        {/* Charts Row */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Over Time */}
            <Card className="border-slate-200 rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="text-sm font-bold">Score Over Time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(v: any, _, props) => [
                          `${v}%`,
                          props.payload?.lesson || 'Score'
                        ]}
                      />
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card className="border-slate-200 rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="text-sm font-bold">Performance Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 ml-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skill Radar */}
            <Card className="border-slate-200 rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="text-sm font-bold">Skill Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Session History */}
            <Card className="border-slate-200 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  AI Conversation Avg Score
                  {aiHistory.length > 0 && <span className="ml-auto text-purple-600 font-black">{avgAiScore}/100</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No AI sessions yet
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-40 overflow-y-auto">
                    {aiHistory.slice(0, 5).map(h => (
                      <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0',
                          h.score >= 80 ? 'bg-emerald-100 text-emerald-700' : h.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        )}>
                          {h.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{h.topic}</p>
                          <p className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Achievements */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Achievements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements.map(a => (
                <div key={a.title} className={cn(
                  'p-4 rounded-2xl border flex items-start gap-3 transition-all',
                  a.unlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
                )}>
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{a.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{a.desc}</p>
                    {a.unlocked && <span className="text-[10px] font-bold text-amber-600 mt-1 block">✓ Unlocked</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        {results.length > 0 && (
          <Card className="border-slate-200 rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-sm font-bold">All Quiz Results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Lesson</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Course</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-600">Correct</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-600">Score</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{r.lessonName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.courseTitle}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{r.correct}/{r.totalQuestions}</td>
                        <td className="px-4 py-3 text-center">{getScoreBadge(r.score)}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">{new Date(r.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── TEACHER VIEW ───────────
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 sm:p-8 shadow-lg">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Test Reports & Analytics</h1>
          <p className="text-indigo-100 text-sm mt-1.5">Track quiz performance across your students at a glance.</p>
        </div>
        <button
          onClick={() => {
            // Build a proper XLSX with wider columns using a minimal XML approach
            const headers = ['Student', 'Lesson', 'Course', 'Session', 'Score', 'Total Questions', 'Correct Answers', 'Date'];
            const rows = filtered.map(r => [
              r.studentName || '',
              r.lessonName || '',
              r.courseTitle || '',
              r.sessionName || '',
              `${r.score}%`,
              String(r.totalQuestions),
              String(r.correct),
              new Date(r.submittedAt).toLocaleDateString()
            ]);

            // Build XLSX XML
            const escXml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const colWidths = [30, 35, 35, 20, 12, 18, 16, 18];
            const colsXml = colWidths.map(w => `<col min="1" max="1" width="${w}" customWidth="1"/>`).join('');
            const headerRow = headers.map(h => `<c t="inlineStr"><is><t>${escXml(h)}</t></is></c>`).join('');
            const dataRows = rows.map(row =>
              `<row>${row.map(cell => `<c t="inlineStr"><is><t>${escXml(cell)}</t></is></c>`).join('')}</row>`
            ).join('');

            const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colsXml}</cols><sheetData><row>${headerRow}</row>${dataRows}</sheetData></worksheet>`;
            const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Test Results" sheetId="1" r:id="rId1"/></sheets></workbook>`;
            const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
            const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

            // Use JSZip if available, otherwise fall back to CSV export (which opens in Excel)
            // Simple fallback: export as CSV with proper tab separation so Excel shows it correctly
            const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
            const bom = '\uFEFF'; // UTF-8 BOM for Excel to recognize encoding
            const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test_results.xlsx';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 shadow-md transition-all hover:scale-[1.03] self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" /> Export Excel
        </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tests', value: results.length, icon: BookOpen, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50/60' },
          { label: 'Students Tested', value: uniqueStudents, icon: Users, gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-50/60' },
          { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50/60' },
          { label: 'Passed (≥70%)', value: passed, icon: Trophy, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50/60' },
        ].map(stat => (
          <Card key={stat.label} className={cn('border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all', stat.bg)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white shadow-md', stat.gradient)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Target className="w-4 h-4 text-indigo-600" /> Average Score by Student</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v: any) => [`${v}%`, 'Avg Score']} />
                    <Bar dataKey="avgScore" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Performance Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold">All Test Results</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <input value={filterStudent} onChange={e => setFilterStudent(e.target.value)} placeholder="Filter by student..." className="h-8 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              <input value={filterCourse} onChange={e => setFilterCourse(e.target.value)} placeholder="Filter by course..." className="h-8 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading results...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No test results yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Lesson</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Course</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-600">Correct</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-600">Score</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">{r.studentName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.lessonName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.courseTitle}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{r.correct}/{r.totalQuestions}</td>
                      <td className="px-4 py-3 text-center">{getScoreBadge(r.score)}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{new Date(r.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
