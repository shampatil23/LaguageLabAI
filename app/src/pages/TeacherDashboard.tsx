import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  FileText,
  Plus,
  Mic,
  AlertTriangle,
  CreditCard,
  Loader2,
  BookOpen,
  BarChart2,
  TrendingUp,
  Hand,
  Zap,
  Trophy,
  Activity,
  MonitorPlay
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { auth, database } from '../lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { cn } from '../lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  'A1 Beginner': '#94a3b8',
  'A2 Elementary': '#60a5fa',
  'B1 Intermediate': '#6366f1',
  'B2 Upper Intermediate': '#8b5cf6',
  'C1 Advanced': '#10b981',
  'C2 Mastery': '#f59e0b',
};

const LEVEL_ORDER = ['A1 Beginner', 'A2 Elementary', 'B1 Intermediate', 'B2 Upper Intermediate', 'C1 Advanced', 'C2 Mastery'];

function getLevelFromScore(avgScore: number | null): string {
  if (avgScore === null) return 'Unassessed';
  if (avgScore >= 90) return 'C1 Advanced';
  if (avgScore >= 75) return 'B2 Upper Intermediate';
  if (avgScore >= 60) return 'B1 Intermediate';
  if (avgScore >= 45) return 'A2 Elementary';
  return 'A1 Beginner';
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<any>(null);
  const [renewing, setRenewing] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewStep, setRenewStep] = useState<'select_plan' | 'payment_details'>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState('50_students_1_year');
  const [transactionId, setTransactionId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentSenderUpi, setPaymentSenderUpi] = useState('');
  const [zapPayUpi, setZapPayUpi] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [currentUid, setCurrentUid] = useState<string | null>(auth.currentUser?.uid || null);

  const plans = {
    '50_students_1_month': { name: 'Up to 50 Students (1 Month)', price: 1500, limit: 50 },
    '50_students_3_months': { name: 'Up to 50 Students (3 Months)', price: 4000, limit: 50 },
    '50_students_6_months': { name: 'Up to 50 Students (6 Months)', price: 8000, limit: 50 },
    '50_students_1_year': { name: 'Up to 50 Students (1 Year)', price: 15000, limit: 50 },
    '100_students_1_month': { name: 'Up to 100 Students (1 Month)', price: 2500, limit: 100 },
    '100_students_3_months': { name: 'Up to 100 Students (3 Months)', price: 7000, limit: 100 },
    '100_students_6_months': { name: 'Up to 100 Students (6 Months)', price: 13500, limit: 100 },
    '100_students_1_year': { name: 'Up to 100 Students (1 Year)', price: 25000, limit: 100 },
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) setCurrentUid(user.uid);
      else setCurrentUid(null);
    });
    const settingsRef = ref(database, 'settings/zapPayUpi');
    const unsubSettings = onValue(settingsRef, snapshot => {
      setZapPayUpi(snapshot.val() || 'admin@upi');
    });
    return () => { unsubAuth(); unsubSettings(); };
  }, []);

  useEffect(() => {
    if (!currentUid) return;
    const instRef = ref(database, 'users/' + currentUid);
    const unsubInst = onValue(instRef, snap => { setInstitution(snap.val()); });

    const usersRef = ref(database, 'users');
    const unsubStudents = onValue(usersRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const teacherStudents = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(u => u.role === 'student' && u.teacherId === currentUid);
        setStudents(teacherStudents);

        // Collect all assignments
        const allAssignments: any[] = [];
        teacherStudents.forEach(s => {
          if (s.assignments) {
            Object.entries(s.assignments).forEach(([aid, aval]: [string, any]) => {
              allAssignments.push({ studentId: s.id, studentName: s.name, ...aval });
            });
          }
        });
        setAssignments(allAssignments);
      }
    });

    // Fetch test results
    const testRef = ref(database, 'testResults');
    const unsubTest = onValue(testRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        setTestResults(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else setTestResults([]);
    });

    const requestsRef = ref(database, 'licenseRequests');
    const unsubReq = onValue(requestsRef, snap => {
      const data = snap.val();
      if (data) {
        const reqList = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter(req => req.institutionId === currentUid)
          .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        setPaymentHistory(reqList);
      } else setPaymentHistory([]);
    });

    return () => { unsubInst(); unsubStudents(); unsubTest(); unsubReq(); };
  }, [currentUid]);

  const handleRenewRequest = async () => {
    if (!currentUid || !transactionId || !paymentName || !paymentSenderUpi) {
      alert('Please fill all the details (Name, Sender UPI ID, and UTR)');
      return;
    }
    setRenewing(true);
    try {
      const newReqRef = push(ref(database, 'licenseRequests'));
      await set(newReqRef, {
        institutionId: currentUid,
        institutionName: institution?.name || 'Unknown',
        amount: plans[selectedPlan as keyof typeof plans].price,
        duration: selectedPlan,
        studentLimit: plans[selectedPlan as keyof typeof plans].limit,
        transactionId,
        paymentName,
        paymentSenderUpi,
        status: 'pending',
        requestDate: new Date().toISOString()
      });
      alert('Renewal request submitted successfully!');
      setShowRenewModal(false);
      setTransactionId(''); setPaymentName(''); setPaymentSenderUpi('');
      setRenewStep('select_plan');
    } catch (err) {
      alert('Error submitting request');
    } finally {
      setRenewing(false);
    }
  };

  const hasPendingRequest = paymentHistory.some(req => req.status === 'pending');

  // Build per-student stats
  const studentStats = students.map(s => {
    const myResults = testResults.filter(r => r.studentId === s.id);
    const myAssignments = s.assignments
      ? Object.values(s.assignments as Record<string, any>)
      : [];
    const completed = myAssignments.filter((a: any) => a.status === 'Completed').length;
    const avgScoreVal = myResults.length
      ? Math.round(myResults.reduce((sum, r) => sum + r.score, 0) / myResults.length)
      : null;
    const computedLevel = getLevelFromScore(avgScoreVal);
    return { ...s, avgScore: avgScoreVal, completedCount: completed, totalCount: myAssignments.length, computedLevel };
  });

  // Level distribution for chart
  const levelDist = LEVEL_ORDER.map(l => ({
    name: l.split(' ')[0] + ' ' + (l.split(' ')[1] || ''),
    count: studentStats.filter(s => s.computedLevel === l).length,
    color: LEVEL_COLORS[l],
  })).filter(l => l.count > 0);

  // Online/offline
  const onlineCount = students.filter(s => s.onlineStatus === 'online').length;
  const handRaisedStudents = students.filter(s => s.handRaised);

  // Completion rate
  const totalAssigned = assignments.length;
  const totalCompleted = assignments.filter(a => a.status === 'Completed').length;
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  // Avg score across all test results for MY students
  const myStudentIds = new Set(students.map(s => s.id));
  const myTestResults = testResults.filter(r => myStudentIds.has(r.studentId));
  const overallAvgScore = myTestResults.length
    ? Math.round(myTestResults.reduce((s, r) => s + r.score, 0) / myTestResults.length)
    : null;

  // Recent test results (last 5)
  const recentResults = [...myTestResults]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Renew modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <CardTitle>Renew License</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-6">
              {renewStep === 'select_plan' ? (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-800">Select Plan Duration</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                    {Object.entries(plans).map(([key, plan]) => (
                      <div key={key} onClick={() => setSelectedPlan(key)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPlan === key ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="font-medium text-slate-900 text-sm">{plan.name}</div>
                        <div className="text-sm text-slate-500">₹{plan.price.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <p className="text-sm text-slate-600 mb-4">Pay <strong className="text-slate-900">₹{plans[selectedPlan as keyof typeof plans].price.toLocaleString()}</strong> via UPI</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${zapPayUpi}&pn=ZapPay&am=${plans[selectedPlan as keyof typeof plans].price}&cu=INR`)}`}
                      alt="UPI QR" className="w-40 h-40 mx-auto border rounded-lg shadow-sm" />
                    <p className="text-xs text-slate-500 mt-2">UPI ID: <span className="font-mono">{zapPayUpi}</span></p>
                  </div>
                  <Input value={paymentName} onChange={e => setPaymentName(e.target.value)} placeholder="Your Name" />
                  <Input value={paymentSenderUpi} onChange={e => setPaymentSenderUpi(e.target.value)} placeholder="Your UPI ID (e.g. john@upi)" />
                  <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID (UTR)" />
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowRenewModal(false)}>Cancel</Button>
              {renewStep === 'select_plan'
                ? <Button onClick={() => setRenewStep('payment_details')}>Complete Payment</Button>
                : <Button onClick={handleRenewRequest} disabled={renewing || !transactionId || !paymentName || !paymentSenderUpi}>
                  {renewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Request
                </Button>}
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 p-6 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-20 right-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Teacher Portal</p>
            <h1 className="text-2xl font-black text-white">Welcome back, {institution?.name || 'Teacher'} 👋</h1>
            <p className="text-slate-400 text-sm mt-1">
              Here's your classroom overview for today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-1">
              <p className="text-xs text-slate-400">License Valid Until</p>
              <p className="text-sm font-bold text-white">
                {institution?.licenseExpiry ? new Date(institution.licenseExpiry).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
            {hasPendingRequest
              ? <Badge variant="outline" className="bg-amber-50/10 text-amber-400 border-amber-400/30">Renewal Pending</Badge>
              : <Button onClick={() => setShowRenewModal(true)} size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm">
                <CreditCard className="w-4 h-4 mr-2" /> Renew License
              </Button>}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Students', value: students.length, sub: `${onlineCount} online now`, color: 'bg-blue-50 text-blue-600', trend: onlineCount > 0 },
          { icon: CheckCircle2, label: 'Lesson Completion', value: `${completionRate}%`, sub: `${totalCompleted}/${totalAssigned} done`, color: 'bg-emerald-50 text-emerald-600', trend: completionRate >= 50 },
          { icon: BarChart2, label: 'Avg Quiz Score', value: overallAvgScore !== null ? `${overallAvgScore}%` : '–', sub: `${myTestResults.length} tests taken`, color: 'bg-purple-50 text-purple-600', trend: overallAvgScore !== null && overallAvgScore >= 60 },
          { icon: Hand, label: 'Hands Raised', value: handRaisedStudents.length, sub: handRaisedStudents.length > 0 ? handRaisedStudents[0]?.name : 'All clear', color: handRaisedStudents.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500', trend: false },
        ].map(stat => (
          <Card key={stat.label} className="border-slate-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.trend && <TrendingUp className="w-4 h-4 text-emerald-500" />}
              </div>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{stat.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hand Raised Alert */}
      {handRaisedStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Hand className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Student(s) need attention!</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {handRaisedStudents.map(s => s.name).join(', ')} raised their hand.
            </p>
          </div>
          <Button onClick={() => navigate('/students')} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs">
            View Live Lab
          </Button>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Performance Chart */}
        <Card className="col-span-2 border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Student Quiz Performance</CardTitle>
            <p className="text-xs text-slate-400">{myTestResults.length} total tests submitted</p>
          </CardHeader>
          <CardContent>
            {recentResults.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={recentResults.map(r => ({ name: r.studentName?.split(' ')[0] || 'Student', score: r.score, lesson: r.lessonName }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: any, _name: any, props: any) => [`${val}%`, props.payload.lesson]}
                    />
                    <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]} barSize={24}>
                      {recentResults.map((r, i) => (
                        <Cell key={i} fill={r.score >= 70 ? '#6366f1' : '#f87171'} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
                No quiz results yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Level Distribution */}
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Level Distribution</CardTitle>
            <p className="text-xs text-slate-400">Based on test performance</p>
          </CardHeader>
          <CardContent>
            {levelDist.length > 0 ? (
              <>
                <div className="h-32 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={levelDist} dataKey="count" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                        {levelDist.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} students`]} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {levelDist.map(l => (
                    <div key={l.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-slate-600 font-medium">{l.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{l.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm text-center">
                <GraduationCap className="w-8 h-8 text-slate-200 mb-2" />
                No data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Overview Table */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Student Overview</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Levels determined by test results</p>
          </div>
          <Button onClick={() => navigate('/students')} size="sm" variant="outline" className="text-sm font-bold">
            <MonitorPlay className="w-4 h-4 mr-2" /> Live Lab
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {studentStats.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              No students yet. Add students from the My Students panel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Level</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Score</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentStats.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0',
                            s.onlineStatus === 'online' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400')}>
                            {s.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          s.onlineStatus === 'online'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border border-slate-100')}>
                          {s.onlineStatus === 'online' ? '● Online' : '○ Offline'}
                        </span>
                        {s.handRaised && (
                          <span className="ml-1.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full animate-pulse">✋</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: LEVEL_COLORS[s.computedLevel] + '20', color: LEVEL_COLORS[s.computedLevel] }}>
                          {s.computedLevel === 'Unassessed' ? '–' : s.computedLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.avgScore !== null
                          ? <span className={cn('text-sm font-black', s.avgScore >= 70 ? 'text-emerald-600' : 'text-red-500')}>{s.avgScore}%</span>
                          : <span className="text-slate-300 text-xs">No tests</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 flex-shrink-0">
                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${s.totalCount > 0 ? (s.completedCount / s.totalCount) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{s.completedCount}/{s.totalCount}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: 'Assign Lessons', desc: 'Manage curriculum', path: '/assessments', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100' },
          { icon: Users, label: 'My Students', desc: 'Live monitoring', path: '/students', color: 'bg-blue-50 hover:bg-blue-100 border-blue-100' },
          { icon: BarChart2, label: 'Reports', desc: 'Performance data', path: '/reports', color: 'bg-purple-50 hover:bg-purple-100 border-purple-100' },
          { icon: BookOpen, label: 'My Courses', desc: 'Course management', path: '/courses', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
        ].map(action => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={cn('text-left p-4 rounded-2xl border transition-all group', action.color)}
          >
            <action.icon className="w-5 h-5 text-slate-600 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-800 text-sm">{action.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
