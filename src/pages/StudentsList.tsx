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

export default function StudentsList() {
  const [students, setStudents] = useState<any[]>([]);
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

    return () => {
      unsubTeacher();
      unsubStudents();
    };
  }, [currentTeacherUid]);

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
        <Card className="bg-slate-50/50 border-dashed border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-primary-900 flex items-center gap-2">
                <MonitorPlay className="w-5 h-5" />
                Language Lab - Session Active
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-success-500 rounded-full"></span> 6 Online</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-300 rounded-full"></span> 2 Offline</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {students.map((student, idx) => {
                const pcName = 'PC-' + (idx + 1).toString().padStart(2, '0');
                const isOnline = student.onlineStatus === 'online';
                const isMicActive = student.micActive;
                const isHandRaised = student.handRaised;
                
                return (
                <div 
                  key={student.id} 
                  className={cn(
                    "relative flex flex-col items-center p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md cursor-pointer",
                    "border-slate-200",
                    isHandRaised && "border-amber-300 ring-2 ring-amber-100",
                    !isOnline && "opacity-60 grayscale"
                  )}
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isHandRaised && (
                       <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shadow-sm animate-bounce">
                         <Hand className="w-3.5 h-3.5" />
                       </div>
                    )}
                  </div>
                  
                  <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pcName}</div>
                  
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mt-3 mb-3 relative",
                    isOnline ? (isMicActive ? "bg-success-100 text-success-600" : "bg-primary-50 text-primary-600") : "bg-slate-100 text-slate-400"
                  )}>
                    {isMicActive ? <Mic className="w-8 h-8" /> : <Headset className="w-8 h-8" />}
                    <span className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full",
                      isOnline ? "bg-success-500" : "bg-slate-300"
                    )}></span>
                  </div>
                  
                  <div className="text-center w-full">
                    <h3 className="font-semibold text-slate-900 truncate">{student.name}</h3>
                    <div className="flex items-center justify-center gap-1 mt-1 text-xs text-slate-500">
                      {isOnline ? (
                        <>
                          <Mic className={cn("w-3.5 h-3.5", isMicActive ? "text-success-500" : "text-slate-400")} />
                          <span className={isMicActive ? "text-success-600 font-medium" : ""}>
                            {isMicActive ? 'Speaking' : 'Listening'}
                          </span>
                        </>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] rounded-xl opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="w-8 h-8 bg-white text-primary-600 rounded-full shadow flex items-center justify-center hover:bg-primary-50" title="Listen In">
                      <Headset className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 bg-white text-primary-600 rounded-full shadow flex items-center justify-center hover:bg-primary-50" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
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
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} icon={<User className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} icon={<Mail className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input type="text" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} icon={<Lock className="w-4 h-4 text-slate-400" />} disabled={isLimitReached} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Proficiency Level</label>
                <select 
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:opacity-50"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
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
      )}

      {view === 'directory' && (
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
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                            {student.level || 'N/A'}
                          </span>
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
      )}
    </div>
  );
}
