import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, Trophy, TrendingUp, Users, BookOpen } from 'lucide-react';
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

export default function Reports() {
  const role = localStorage.getItem('userRole') || 'teacher';
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [teacherStudentIds, setTeacherStudentIds] = useState<Set<string>>(new Set());
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) { setLoading(false); return; }
      setCurrentUid(user.uid);

      if (role === 'student') {
        // Student: fetch only their own results from testResults
        const resultsRef = ref(database, 'testResults');
        onValue(resultsRef, snap => {
          const data = snap.val();
          if (data) {
            const list: TestResult[] = Object.entries(data)
              .map(([id, val]: [string, any]) => ({ id, ...val }))
              .filter(r => r.studentId === user.uid);
            setResults(list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
          } else { setResults([]); }
          setLoading(false);
        });
      } else {
        // Teacher: first get their students, then filter results
        const usersRef = ref(database, 'users');
        onValue(usersRef, snap => {
          const data = snap.val();
          if (data) {
            const myStudentIds = new Set<string>(
              Object.entries(data)
                .filter(([, val]: [string, any]) => val.role === 'student' && val.teacherId === user.uid)
                .map(([id]) => id)
            );
            setTeacherStudentIds(myStudentIds);

            const resultsRef = ref(database, 'testResults');
            onValue(resultsRef, rsnap => {
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
    if (score >= 90) return <Badge variant="success" className="font-bold">{score}%</Badge>;
    if (score >= 70) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold">{score}%</Badge>;
    return <Badge variant="danger" className="font-bold">{score}%</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {role === 'student' ? 'My Test Results' : 'Test Reports & Analytics'}
          </h1>
          <p className="text-slate-500 mt-1">
            {role === 'student'
              ? 'View your quiz results and scores across all lessons.'
              : 'Quiz results from your students only.'}
          </p>
        </div>
        {role !== 'student' && (
          <button
            onClick={() => {
              const csv = ['Student,Lesson,Course,Session,Score,Total Questions,Correct,Date',
                ...filtered.map(r => `${r.studentName},${r.lessonName},${r.courseTitle},${r.sessionName},${r.score}%,${r.totalQuestions},${r.correct},${new Date(r.submittedAt).toLocaleDateString()}`)
              ].join('\n');
              const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'test_results.csv'; a.click();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: role === 'student' ? 'Quizzes Taken' : 'Total Tests', value: results.length, icon: BookOpen, color: 'text-primary-600 bg-primary-50' },
          { label: role === 'student' ? 'Lessons Done' : 'Students Tested', value: role === 'student' ? results.length : uniqueStudents, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Passed (≥70%)', value: passed, icon: Trophy, color: 'text-green-600 bg-green-50' },
        ].map(stat => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
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

      {/* Chart - teacher only */}
      {role !== 'student' && chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Average Score by Student</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: any) => [`${v}%`, 'Avg Score']} />
                  <Bar dataKey="avgScore" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle>All Test Results</CardTitle>
            {role !== 'student' && (
              <div className="flex gap-2 flex-wrap">
                <input value={filterStudent} onChange={e => setFilterStudent(e.target.value)} placeholder="Filter by student..." className="h-8 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                <input value={filterCourse} onChange={e => setFilterCourse(e.target.value)} placeholder="Filter by course..." className="h-8 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading results...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No test results yet. Results appear here when quizzes are completed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {role !== 'student' && <TableHead className="font-semibold text-slate-700">Student</TableHead>}
                    <TableHead className="font-semibold text-slate-700">Lesson</TableHead>
                    <TableHead className="font-semibold text-slate-700">Course</TableHead>
                    <TableHead className="font-semibold text-slate-700">Session</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Correct</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Score</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      {role !== 'student' && <TableCell className="font-medium text-slate-900">{r.studentName}</TableCell>}
                      <TableCell className="text-slate-700">{r.lessonName}</TableCell>
                      <TableCell><span className="text-xs text-slate-500">{r.courseTitle}</span>{r.className && <span className="ml-1 text-xs text-slate-400">· {r.className}</span>}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.sessionName}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{r.correct} / {r.totalQuestions}</TableCell>
                      <TableCell className="text-center">{getScoreBadge(r.score)}</TableCell>
                      <TableCell className="text-right text-xs text-slate-400">{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
