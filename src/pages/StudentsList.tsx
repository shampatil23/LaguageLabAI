import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Plus, Mic, MonitorPlay, MessageSquare, Hand, Headset, Loader2, Mail, Lock, User, Download, FileText, Trash2, Key, Users, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, remove, update } from 'firebase/database';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// For real students, we will generate dynamic status based on their data.
// In a real app this would come from a presence system (e.g. Firebase Realtime DB presence).

function getLevelFromScore(avgScore: number | null): string {
  if (avgScore === null) return '';
  if (avgScore >= 90) return 'C1 Advanced';
  if (avgScore >= 75) return 'B2 Upper Intermediate';
  if (avgScore >= 60) return 'B1 Intermediate';
  if (avgScore >= 45) return 'A2 Elementary';
  return 'A1 Beginner';
}

const LEVEL_COLOR: Record<string, string> = {
  'A1 Beginner': 'bg-slate-100 text-slate-600',
  'A2 Elementary': 'bg-blue-100 text-blue-700',
  'B1 Intermediate': 'bg-indigo-100 text-indigo-700',
  'B2 Upper Intermediate': 'bg-purple-100 text-purple-700',
  'C1 Advanced': 'bg-emerald-100 text-emerald-700',
};

export default function StudentsList() {
  const [students, setStudents] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', level: 'B1 Intermediate' });
  const [currentTeacherUid, setCurrentTeacherUid] = useState<string | null>(auth.currentUser?.uid || null);

  const [view, setView] = useState<'livelab' | 'directory' | 'add_student'>('livelab');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      setCurrentTeacherUid(user ? user.uid : null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentTeacherUid) return;

    // Fetch Teacher Data for limit
    const teacherRef = ref(database, 'users/' + currentTeacherUid);
    const unsubTeacher = onValue(teacherRef, snap => {
      if (snap.exists()) setTeacherData(snap.val());
    });

    const studentsRef = ref(database, 'users');
    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const teacherStudents = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(u => u.role === 'student' && (u.teacherId === currentTeacherUid || u.email === 'student@example.com'));
        setStudents(teacherStudents);
      } else {
        setStudents([]);
      }
    });

    const testRef = ref(database, 'testResults');
    const unsubTest = onValue(testRef, snap => {
      if (snap.exists()) {
        setTestResults(Object.entries(snap.val()).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else setTestResults([]);
    });

    return () => {
      unsubTeacher();
      unsubStudents();
      unsubTest();
    };
  }, [currentTeacherUid]);

  const getStudentAvgScore = (studentId: string) => {
    const myResults = testResults.filter(r => r.studentId === studentId);
    if (!myResults.length) return null;
    return Math.round(myResults.reduce((s, r) => s + r.score, 0) / myResults.length);
  };

  const teacherLimit = teacherData?.studentLimit || 50;
  const isLimitReached = students.length >= teacherLimit;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      alert(`You have reached the maximum limit of ${teacherLimit} students. Please upgrade your subscription to add more.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const newUserId = data.uid;

      await set(ref(database, 'users/' + newUserId), {
        name: formData.name,
        email: formData.email,
        role: 'student',
        teacherId: currentTeacherUid,
        level: formData.level,
        password: formData.password, // Storing for teacher export purposes
        createdAt: new Date().toISOString()
      });

      setFormData({ name: '', email: '', password: '', level: 'B1 Intermediate' });
      setView('directory');
    } catch (err: any) {
      alert(err.message || 'Error creating student');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await remove(ref(database, 'users/' + studentId));
    }
  };

  const handleResetDevice = async (studentId: string) => {
    if (confirm("Reset this student's device binding? This allows them to log in from a new PC.")) {
      await update(ref(database, 'users/' + studentId), { registeredDeviceId: null });
    }
  };

  const exportExcel = () => {
    const exportData = students.map(s => ({
      Name: s.name,
      Email: s.email,
      Password: s.password || 'N/A',
      Level: s.level || 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-adjust column width
    worksheet['!cols'] = [
      { wch: 35 }, // Name
      { wch: 50 }, // Email
      { wch: 30 }, // Password
      { wch: 30 }  // Level
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "Student_Accounts.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Accounts", 14, 15);

    const tableColumn = ["Name", "Email", "Password", "Level"];
    const tableRows = [];

    students.forEach(s => {
      const studentData = [
        s.name,
        s.email,
        s.password || 'N/A',
        s.level || 'N/A'
      ];
      tableRows.push(studentData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save("Student_Accounts.pdf");
  };

  const filteredStudents = students.filter(s => {
    const term = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(term) || s.email?.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Students</h1>
          <p className="text-slate-500">Monitor active sessions, add new students, and manage accounts.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setView('livelab')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", view === 'livelab' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")}
          >
            <MonitorPlay className="w-4 h-4" /> Live Lab
          </button>
          <button
            onClick={() => setView('directory')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", view === 'directory' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")}
          >
            <Users className="w-4 h-4" /> Directory
          </button>
          <button
            onClick={() => setView('add_student')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", view === 'add_student' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")}
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {view === 'livelab' && (
        <div className="space-y-5">
          {/* Status Bar */}
          <div className="flex items-center gap-6 text-sm">
            {[
              { label: 'Online', color: 'bg-emerald-500', count: students.filter(s => s.onlineStatus === 'online').length },
              { label: 'Offline', color: 'bg-slate-300', count: students.filter(s => s.onlineStatus !== 'online').length },
              { label: 'Watching', color: 'bg-blue-500', count: students.filter(s => s.currentActivity === 'watching').length },
              { label: 'Taking Test', color: 'bg-amber-500', count: students.filter(s => s.currentActivity === 'taking_test').length },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-slate-600">{item.count} {item.label}</span>
              </div>
            ))}
            <span className="ml-auto text-slate-400 text-xs">Live · updates in real-time</span>
          </div>

          {/* Live Class Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student, idx) => {
              const isOnline = student.onlineStatus === 'online';
              const isHandRaised = student.handRaised;
              const activity = student.currentActivity;

              const activityConfig: Record<string, { label: string; dot: string; badge: string }> = {
                watching: { label: 'Watching Lesson', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
                taking_test: { label: 'Taking Test', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
                completed_lesson: { label: 'Completed Lesson', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                completed_test: { label: 'Submitted Test', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
              };

              const actCfg = activity && activityConfig[activity]
                ? activityConfig[activity]
                : isOnline
                  ? { label: 'Online', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  : { label: 'Offline', dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200' };

              // Assignments for this student
              const assignedLessonsList: any[] = student.assignments
                ? Object.entries(student.assignments).map(([id, val]: [string, any]) => ({ id, ...val }))
                : [];
              const completedCount = assignedLessonsList.filter(a => a.status === 'Completed').length;
              const totalCount = assignedLessonsList.length;

              return (
                <Card
                  key={student.id}
                  className={cn(
                    'border transition-all hover:shadow-md',
                    isHandRaised && 'border-amber-300 ring-2 ring-amber-100',
                    !isOnline && 'opacity-70'
                  )}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative flex-shrink-0',
                          isOnline ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
                        )}>
                          {student.name?.charAt(0)?.toUpperCase() || '?'}
                          <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white', actCfg.dot)} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                          <p className="text-xs text-slate-400 truncate">PC-{(idx + 1).toString().padStart(2, '0')}</p>
                          {(() => { const avg = getStudentAvgScore(student.id); const lvl = getLevelFromScore(avg); return lvl ? <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block', LEVEL_COLOR[lvl] || 'bg-slate-100 text-slate-500')}>{lvl.split(' ')[0]}</span> : null; })()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', actCfg.badge)}>
                          {actCfg.label}
                        </span>
                        {isHandRaised && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse font-semibold">
                            ✋ Hand Raised
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignment Progress */}
                    {totalCount > 0 ? (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Lessons</span>
                          <span className="font-semibold text-slate-700">{completedCount}/{totalCount} done</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mb-3">No lessons assigned yet</p>
                    )}

                    {/* Assigned Lessons List */}
                    {assignedLessonsList.length > 0 && (
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {assignedLessonsList.slice(0, 4).map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-slate-50 border border-slate-100">
                            <span className="truncate text-slate-700 font-medium max-w-[140px]">{a.name || 'Lesson'}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {a.testScore !== undefined && (
                                <span className={cn('font-bold', a.testScore >= 70 ? 'text-emerald-600' : 'text-red-500')}>
                                  {a.testScore}%
                                </span>
                              )}
                              <span className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                a.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300'
                              )} />
                            </div>
                          </div>
                        ))}
                        {assignedLessonsList.length > 4 && (
                          <p className="text-[10px] text-slate-400 text-center pt-1">+{assignedLessonsList.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm">No students yet. Add students from the "Add Student" tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'add_student' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Student Account</CardTitle>
            <p className="text-sm text-slate-500">Usage: {students.length} / {teacherLimit} students</p>
          </CardHeader>
          <CardContent>
            {isLimitReached && (
              <div className="mb-6 p-4 bg-warning-50 border border-warning-200 text-warning-800 rounded-lg text-sm">
                <strong>Limit Reached!</strong> You cannot create more than {teacherLimit} student accounts on your current plan. Please renew or upgrade your subscription from the dashboard.
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Student Name</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} icon={<User className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} icon={<Mail className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input type="text" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} icon={<Lock className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Proficiency Level</label>
                <select
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:opacity-50"
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                  disabled={isLimitReached}
                >
                  <option value="A1 Beginner">A1 Beginner</option>
                  <option value="A2 Elementary">A2 Elementary</option>
                  <option value="B1 Intermediate">B1 Intermediate</option>
                  <option value="B2 Upper Intermediate">B2 Upper Intermediate</option>
                  <option value="C1 Advanced">C1 Advanced</option>
                </select>
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={loading || isLimitReached}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )
      }

      {
        view === 'directory' && (
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-1">
                <CardTitle>Registered Students</CardTitle>
                <p className="text-sm text-slate-500">Usage: {students.length} / {teacherLimit} students</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportExcel} className="text-slate-600 shrink-0">
                  <FileText className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF} className="text-slate-600 shrink-0">
                  <Download className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden md:inline">PDF</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  {searchQuery ? "No students match your search." : "No students added yet. Go to 'Add Student' to get started."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="pl-6">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium pl-6">{student.name}</TableCell>
                          <TableCell className="text-slate-500">{student.email}</TableCell>
                          <TableCell className="text-slate-500 font-mono text-sm">{student.password || '******'}</TableCell>
                          <TableCell>
                            {(() => {
                              const avg = getStudentAvgScore(student.id);
                              const computedLvl = getLevelFromScore(avg);
                              return (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{student.level || 'N/A'}</span>
                                  {computedLvl && avg !== null && (
                                    <div>
                                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', LEVEL_COLOR[computedLvl] || 'bg-slate-50 text-slate-500')}>
                                        AI: {computedLvl.split(' ')[0]} ({avg}%)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right space-x-2 pr-6">
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleResetDevice(student.id)} title="Reset device binding">
                              <Key className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleDelete(student.id)} title="Delete student">
                              <Trash2 className="w-4 h-4 text-error-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }
    </div >
  );
}
