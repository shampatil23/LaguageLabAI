import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Plus, Filter, FileText, PlayCircle, Pause, Square, Maximize, Trash2, Video, FileCode, CheckCircle, BookOpen, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';

type CatalogLesson = {
  id: string;
  name: string;
  type: string;
  content?: string;
  resourceUrl?: string;
  fileName?: string;
  courseId: string;
  courseTitle: string;
  className: string;
  semester: string;
  sessionId: string;
  sessionName: string;
};

type CatalogSession = {
  id: string;
  name: string;
  lessons?: Record<string, Omit<CatalogLesson, 'id' | 'courseId' | 'courseTitle' | 'className' | 'semester' | 'sessionId' | 'sessionName'>>;
};

type CatalogCourse = {
  id: string;
  title: string;
  className: string;
  semester: string;
  sessions?: Record<string, Omit<CatalogSession, 'id'>>;
};

export default function Assessments() {
  const [role, setRole] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);

  // Teacher Selection State
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [previewLesson, setPreviewLesson] = useState<string | null>(null);
  const [assignedLessons, setAssignedLessons] = useState<any[]>([]);
  
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const userRef = ref(database, 'users/' + user.uid);
        onValue(userRef, snap => {
          if (snap.exists()) {
            const data = snap.val();
            setRole(data.role);
            if (data.role === 'teacher' || data.role === 'super_admin') {
              fetchStudents(user.uid);
            } else if (data.role === 'student') {
              fetchAssignments(user.uid);
            }
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const catalogRef = ref(database, 'courseCatalog');
    const unsubCatalog = onValue(catalogRef, snap => {
      const data = snap.val();
      if (data) {
        setCourses(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setCourses([]);
      }
    });

    return () => {
      unsubAuth();
      unsubCatalog();
    };
  }, []);

  const fetchStudents = (teacherId: string) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const teacherStudents = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(u => u.role === 'student');
        setStudents(teacherStudents);
      }
    });
  };

  const fetchAssignments = (studentId: string) => {
    const assignmentsRef = ref(database, 'users/' + studentId + '/assignments');
    onValue(assignmentsRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const assignmentsList = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        setMyAssignments(assignmentsList.reverse());
      } else {
        setMyAssignments([]);
      }
    });
  };

  const selectedCourse = courses.find(course => course.id === selectedClass);
  const availableSessions = selectedCourse
    ? Object.entries(selectedCourse.sessions || {}).map(([id, session]) => ({ id, ...(session as Omit<CatalogSession, 'id'>) }))
    : [];
  const selectedCatalogSession = availableSessions.find(session => session.id === selectedSession);
  const availableLessons: CatalogLesson[] = selectedCourse && selectedCatalogSession
    ? Object.entries(selectedCatalogSession.lessons || {}).map(([lessonId, lesson]) => ({
        id: `${selectedCourse.id}:${selectedCatalogSession.id}:${lessonId}`,
        ...(lesson as Omit<CatalogLesson, 'id' | 'courseId' | 'courseTitle' | 'className' | 'semester' | 'sessionId' | 'sessionName'>),
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        className: selectedCourse.className,
        semester: selectedCourse.semester,
        sessionId: selectedCatalogSession.id,
        sessionName: selectedCatalogSession.name
      }))
    : [];

  const toggleLessonSelection = (id: string) => {
    const newSelection = new Set(selectedLessons);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedLessons(newSelection);
  };

  const handleAddSelectedToAssignQueue = () => {
    const lessonsToAdd = availableLessons.filter(l => selectedLessons.has(l.id) && !assignedLessons.find(al => al.id === l.id));
    setAssignedLessons([...assignedLessons, ...lessonsToAdd]);
    setSelectedLessons(new Set());
  };

  const removeAssignedLesson = (id: string) => {
    setAssignedLessons(assignedLessons.filter(l => l.id !== id));
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudents(next);
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleFinalAssign = async () => {
    if (assignedLessons.length === 0) {
      alert('Please add lessons to the queue first.');
      return;
    }
    if (selectedStudents.size === 0) {
      alert('Please select at least one student.');
      return;
    }
    
    try {
      const promises = [];
      for (const studentId of Array.from(selectedStudents)) {
        for (const lesson of assignedLessons) {
           const newAssignmentRef = push(ref(database, 'users/' + studentId + '/assignments'));
           promises.push(set(newAssignmentRef, {
             lessonId: lesson.id,
             name: lesson.name,
             type: lesson.type,
             courseTitle: lesson.courseTitle,
             className: lesson.className,
             semester: lesson.semester,
             sessionName: lesson.sessionName,
             content: lesson.content || '',
             resourceUrl: lesson.resourceUrl || '',
             fileName: lesson.fileName || '',
             status: 'Pending',
             assignedAt: new Date().toISOString()
           }));
        }
      }
      await Promise.all(promises);
      alert('Lessons assigned successfully!');
      setAssignedLessons([]);
      setSelectedStudents(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to assign lessons.');
    }
  };

  const handleStartAssignment = (assignmentId: string) => {
    const studentId = auth.currentUser?.uid;
    if (!studentId) return;
    set(ref(database, 'users/' + studentId + '/assignments/' + assignmentId + '/status'), 'Completed');
    alert('Assignment marked as completed!');
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Assignments</h1>
          <p className="text-slate-500 mt-1">Complete your assigned lessons and tests.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myAssignments.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
               No assignments yet. You\'re all caught up!
            </div>
          ) : (
            myAssignments.map(assignment => (
              <Card key={assignment.id} className={cn("transition-all hover:shadow-md", assignment.status === 'Completed' ? 'border-success-200 bg-success-50/30' : '')}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", assignment.status === 'Completed' ? 'bg-success-100 text-success-600' : 'bg-primary-50 text-primary-600')}>
                      {assignment.status === 'Completed' ? <CheckCircle className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <Badge variant={assignment.status === 'Completed' ? 'success' : 'default'}>{assignment.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">{assignment.name}</h3>
                  <p className="text-sm text-slate-500 mb-1">{assignment.courseTitle || 'Course'} · {assignment.className || 'Class'} {assignment.semester ? `· ${assignment.semester}` : ''}</p>
                  {assignment.sessionName && <p className="text-sm text-slate-500 mb-4">Session: {assignment.sessionName}</p>}
                  <p className="text-xs text-slate-400 mb-4">Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                  {assignment.status !== 'Completed' ? (
                    <Button onClick={() => handleStartAssignment(assignment.id)} className="w-full">
                      Start Lesson <PlayCircle className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full text-success-600 border-success-200">
                      Completed <CheckCircle className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Teacher View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Assign Lessons</h1>
          <p className="text-slate-500 mt-1">Select lessons and assign them to students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Assigned Resources & Student Selection */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex flex-col min-h-[250px] shadow-sm border-slate-200">
            <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800">Lessons to Assign Queue</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {assignedLessons.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-4">No lessons added yet.</div>
              ) : (
                <ul className="space-y-2">
                  {assignedLessons.map(lesson => (
                    <li key={lesson.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100 group">
                      <div className="flex items-center gap-2">
                         {lesson.type === 'Video' ? <Video className="w-4 h-4 text-slate-400" /> : <FileCode className="w-4 h-4 text-slate-400" />}
                         <span className="font-medium text-slate-700">{lesson.name}</span>
                      </div>
                      <button onClick={() => removeAssignedLesson(lesson.id)} className="text-slate-400 hover:text-error-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-2 bg-slate-100 border-t border-slate-200">
               <Button onClick={() => setAssignedLessons([])} variant="outline" className="w-full bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-slate-700">Clear Queue</Button>
            </div>
          </Card>

          {/* Student Selection Panel */}
          <Card className="flex flex-col flex-1 min-h-[300px] shadow-sm border-slate-200">
            <CardHeader className="py-3 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800">Select Students</CardTitle>
              <span className="text-xs font-medium text-slate-500">{selectedStudents.size} / {students.length}</span>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-12 text-center">
                       <input 
                          type="checkbox" 
                          checked={students.length > 0 && selectedStudents.size === students.length}
                          onChange={toggleAllStudents}
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                     </TableHead>
                     <TableHead>Student</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {students.map(s => (
                     <TableRow key={s.id} onClick={() => toggleStudent(s.id)} className="cursor-pointer hover:bg-slate-50">
                       <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedStudents.has(s.id)} 
                            onChange={() => toggleStudent(s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                             <User className="w-3 h-3" />
                           </div>
                           <span className="text-sm font-medium">{s.name}</span>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200">
               <Button className="w-full bg-primary-600 hover:bg-primary-700" onClick={handleFinalAssign}>
                 Assign to Selected ({selectedStudents.size})
               </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Selection Panels */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-10rem)]">
          <div className="grid grid-cols-2 gap-6 h-64 shrink-0">
            {/* Class Name Selection */}
            <Card className="flex flex-col overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="py-2 bg-primary-600 text-white rounded-t-lg">
                <CardTitle className="text-sm text-center font-medium">Class Name</CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto bg-white p-1">
                <ul className="space-y-0.5">
                  {courses.map(course => (
                    <li 
                      key={course.id}
                      onClick={() => {
                        setSelectedClass(course.id);
                        setSelectedSession(null);
                        setSelectedLessons(new Set());
                        setPreviewLesson(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-sm cursor-pointer border-l-2",
                        selectedClass === course.id ? "bg-slate-200/70 border-primary-500 font-medium text-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="block font-medium">{course.className} · {course.semester}</span>
                      <span className="block text-xs text-slate-500">{course.title}</span>
                    </li>
                  ))}
                  {courses.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No courses have been created yet.</li>}
                </ul>
              </div>
            </Card>

            {/* Session Selection */}
            <Card className="flex flex-col overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="py-2 bg-primary-600 text-white rounded-t-lg">
                <CardTitle className="text-sm text-center font-medium">Session</CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto bg-white p-1">
                <ul className="space-y-0.5">
                  {!selectedCourse && <li className="p-4 text-center text-sm text-slate-500">Select a class and semester first.</li>}
                  {availableSessions.map(session => (
                    <li 
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session.id);
                        setSelectedLessons(new Set());
                        setPreviewLesson(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-sm cursor-pointer border-l-2",
                        selectedSession === session.id ? "bg-slate-200/70 border-primary-500 font-medium text-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {session.name}
                    </li>
                  ))}
                  {selectedCourse && availableSessions.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No sessions in this course yet.</li>}
                </ul>
              </div>
            </Card>
          </div>

          {/* Lessons Table Selection */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm border-slate-200">
             <div className="flex-1 overflow-auto bg-white relative">
               <Table>
                 <TableHeader className="sticky top-0 bg-primary-600 text-white z-10 shadow-sm">
                   <TableRow className="hover:bg-primary-600 border-b-0">
                     <TableHead className="w-12 text-center text-primary-50">Select</TableHead>
                     <TableHead className="text-primary-50">Lessons</TableHead>
                     <TableHead className="text-primary-50 text-right pr-6">Type</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {!selectedCatalogSession && (
                     <TableRow>
                       <TableCell colSpan={3} className="py-10 text-center text-slate-500">Select a session to view its lessons.</TableCell>
                     </TableRow>
                   )}
                   {selectedCatalogSession && availableLessons.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={3} className="py-10 text-center text-slate-500">No lessons in this session yet.</TableCell>
                     </TableRow>
                   )}
                   {availableLessons.map(lesson => (
                     <TableRow 
                       key={lesson.id} 
                       className={cn(
                         "cursor-pointer border-b-slate-100",
                         selectedLessons.has(lesson.id) && "bg-slate-50",
                         previewLesson === lesson.id && "bg-primary-50"
                       )}
                       onClick={() => setPreviewLesson(lesson.id)}
                     >
                       <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                         <input 
                           type="checkbox" 
                           checked={selectedLessons.has(lesson.id)}
                           onChange={() => toggleLessonSelection(lesson.id)}
                           className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                         />
                       </TableCell>
                       <TableCell className={cn("font-medium", selectedLessons.has(lesson.id) ? "text-primary-700" : "text-slate-700")}>
                         {lesson.name}
                       </TableCell>
                       <TableCell className="text-right pr-6">
                         <Badge variant="outline" className="text-slate-500 bg-white">
                           {lesson.type === 'Video' ? <Video className="w-3 h-3 mr-1" /> : <FileCode className="w-3 h-3 mr-1" />}
                           {lesson.type}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
             <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-4">
                <Button onClick={handleAddSelectedToAssignQueue} className="flex-1 bg-primary-500 hover:bg-primary-600">Add Selected To Queue</Button>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
