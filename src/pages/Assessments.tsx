import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Plus, Filter, FileText, PlayCircle, Pause, Square, Maximize, Trash2, Video, FileCode, CheckCircle, BookOpen, User, ClipboardList, Hand, ChevronDown, ChevronRight, Lock, CheckCircle2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';

type CatalogLesson = {
  id: string;
  name: string;
  type: string;
  content?: string;
  resourceUrl?: string;
  fileName?: string;
  hasTest?: boolean;
  test?: any;
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
  lessons?: Record<string, any>;
};

type CatalogCourse = {
  id: string;
  title: string;
  className: string;
  semester: string;
  sessions?: Record<string, any>;
};

export default function Assessments() {
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Tab State & Search Query for Assessment History
  const [teacherViewTab, setTeacherViewTab] = useState<'assign' | 'history'>('assign');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Teacher Selection State
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [previewLesson, setPreviewLesson] = useState<string | null>(null);
  const [assignedLessons, setAssignedLessons] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Student lesson player state
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Student hand raised state
  const [handRaised, setHandRaised] = useState(false);
  // Collapsed units state
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const userRef = ref(database, 'users/' + user.uid);
        onValue(userRef, snap => {
          if (snap.exists()) {
            const data = snap.val();
            setRole(data.role);
            setCurrentUser({ uid: user.uid, ...data });
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

    let catalogData: any = null;
    let curriculumData: any = null;

    const rebuildCourses = (catalog: any, curriculum: any) => {
      const courseMap: Record<string, CatalogCourse> = {};

      // Process legacy courseCatalog
      if (catalog) {
        Object.entries(catalog).forEach(([courseId, courseVal]: [string, any]) => {
          const key = `${courseVal.title}_${courseVal.className}_${courseVal.semester}`;
          if (!courseMap[key]) {
            courseMap[key] = { id: courseId, title: courseVal.title, className: courseVal.className, semester: courseVal.semester, sessions: {} };
          }
          if (courseVal.sessions) {
            Object.entries(courseVal.sessions).forEach(([sessionId, sessionVal]: [string, any]) => {
              if (!courseMap[key].sessions![sessionId]) {
                courseMap[key].sessions![sessionId] = { name: sessionVal.name, lessons: {} };
              }
              if (sessionVal.lessons) {
                Object.entries(sessionVal.lessons).forEach(([lessonId, lessonVal]: [string, any]) => {
                  courseMap[key].sessions![sessionId].lessons![lessonId] = {
                    id: lessonId, name: lessonVal.name, type: lessonVal.type || 'HTML',
                    content: lessonVal.content, resourceUrl: lessonVal.resourceUrl,
                    fileName: lessonVal.fileName, hasTest: !!lessonVal.test, test: lessonVal.test
                  };
                });
              }
            });
          }
        });
      }

      // Process curriculum (new hierarchical structure)
      if (curriculum) {
        Object.entries(curriculum).forEach(([lessonId, item]: [string, any]) => {
          const key = `${item.course}_${item.program}_${item.semester}`;
          if (!courseMap[key]) {
            courseMap[key] = { id: key, title: item.course, className: item.program, semester: item.semester, sessions: {} };
          }
          const sessionId = `${item.subject}_${item.unit}`;
          if (!courseMap[key].sessions![sessionId]) {
            courseMap[key].sessions![sessionId] = { name: `${item.subject} - ${item.unit}`, lessons: {} };
          }
          courseMap[key].sessions![sessionId].lessons![lessonId] = {
            id: lessonId, name: item.lessonName, type: item.type || 'HTML',
            content: item.content, resourceUrl: item.resourceUrl,
            fileName: item.fileName, hasTest: !!item.test, test: item.test
          };
        });
      }

      setCourses(Object.values(courseMap));
    };

    const catalogRef = ref(database, 'courseCatalog');
    const unsubCatalog = onValue(catalogRef, snap => {
      catalogData = snap.val();
      rebuildCourses(catalogData, curriculumData);
    });

    const curriculumRef = ref(database, 'curriculum');
    const unsubCurriculum = onValue(curriculumRef, snap => {
      curriculumData = snap.val();
      rebuildCourses(catalogData, curriculumData);
    });

    return () => {
      unsubAuth();
      unsubCatalog();
      unsubCurriculum();
    };
  }, []);

  const fetchStudents = (teacherId: string) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const teacherStudents = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(u => u.role === 'student' && u.teacherId === teacherId);
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
        const list = assignmentsList.reverse();
        setMyAssignments(list);

        // Auto-open logic if passed via location state
        if (location?.state?.autoOpenLessonId) {
          const found = list.find(a => a.id === location.state.autoOpenLessonId || a.lessonId === location.state.autoOpenLessonId);
          if (found) {
            // Replicate contents of openLesson inline or call it directly. 
            // openLesson is defined below, but since it is a function declaration, it's hoisted, or let's call it!
            openLesson(found);
          }
        }
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
      id: (lesson as any).id || `${selectedCourse.id}:${selectedCatalogSession.id}:${lessonId}`,
      ...(lesson as any),
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
      showToast('Please add lessons to the queue first.', 'error');
      return;
    }
    if (selectedStudents.size === 0) {
      showToast('Please select at least one student.', 'error');
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
            test: lesson.test || null,
            status: 'Pending',
            assignedAt: new Date().toISOString()
          }));
        }
      }
      await Promise.all(promises);
      showToast('Lessons assigned to matching students successfully!', 'success');
      setAssignedLessons([]);
      setSelectedStudents(new Set());
    } catch (err) {
      console.error(err);
      showToast('Failed to assign lessons.', 'error');
    }
  };

  const handleClearAllAssignments = async () => {
    if (!students.length) return;
    if (!confirm('Are you sure you want to remove all assignments from all students? Student performance and test results (testResults) will NOT be affected.')) {
      return;
    }
    try {
      const promises = students.map(s => remove(ref(database, `users/${s.id}/assignments`)));
      await Promise.all(promises);
      showToast('All students assignments cleared successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to clear assignments.', 'error');
    }
  };

  const handleRevokeSingleAssignment = async (studentId: string, assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assigned lesson from this student?')) {
      return;
    }
    try {
      await remove(ref(database, `users/${studentId}/assignments/${assignmentId}`));
      showToast('Assignment revoked successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to revoke assignment.', 'error');
    }
  };

  const openLesson = (assignment: any) => {
    setActiveLesson(assignment);
    setQuizMode(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    // Show info overlay for 3 seconds then auto-hide
    setShowInfoOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowInfoOverlay(false), 3000);

    // Realtime Activity updates
    const studentId = auth.currentUser?.uid;
    if (studentId) {
      set(ref(database, 'users/' + studentId + '/status'), 'Watching: ' + assignment.name);
      set(ref(database, 'users/' + studentId + '/currentActivity'), 'watching');
    }
  };

  const markLessonComplete = async () => {
    const studentId = auth.currentUser?.uid;
    if (!studentId || !activeLesson) return;
    await set(ref(database, 'users/' + studentId + '/assignments/' + activeLesson.id + '/status'), 'Completed');
    // Update onlineStatus to reflect activity
    await set(ref(database, 'users/' + studentId + '/currentActivity'), 'completed_lesson');
    await set(ref(database, 'users/' + studentId + '/status'), 'Online');
    setMyAssignments(prev => prev.map(a => a.id === activeLesson.id ? { ...a, status: 'Completed' } : a));
    setActiveLesson((prev: any) => prev ? { ...prev, status: 'Completed' } : prev);
  };

  const handleSubmitQuiz = async () => {
    if (!activeLesson?.test || !currentUser) return;
    const questions = activeLesson.test.questions || [];
    let correct = 0;
    questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.correct) correct++;
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setQuizScore(score);
    setQuizSubmitted(true);

    // Save result to Firebase under testResults for teacher reports
    const resultRef = push(ref(database, 'testResults'));
    await set(resultRef, {
      studentId: currentUser.uid,
      studentName: currentUser.name || currentUser.email || 'Student',
      assignmentId: activeLesson.id,
      lessonName: activeLesson.name,
      courseTitle: activeLesson.courseTitle || '',
      className: activeLesson.className || '',
      semester: activeLesson.semester || '',
      sessionName: activeLesson.sessionName || '',
      testTitle: activeLesson.test.title || 'Quiz',
      totalQuestions: questions.length,
      correct,
      score,
      submittedAt: new Date().toISOString()
    });
    // Update assignment with score
    const studentId = auth.currentUser?.uid;
    if (studentId) {
      await set(ref(database, 'users/' + studentId + '/assignments/' + activeLesson.id + '/testScore'), score);
      await set(ref(database, 'users/' + studentId + '/currentActivity'), 'completed_test');
      await set(ref(database, 'users/' + studentId + '/status'), 'Online');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (role === 'student') {
    // Group assignments by course → then by unit (sessionName)
    const byCourse: Record<string, Record<string, any[]>> = {};
    myAssignments.forEach(a => {
      const course = a.courseTitle || 'Uncategorized';
      const unit = a.sessionName || 'General';
      if (!byCourse[course]) byCourse[course] = {};
      if (!byCourse[course][unit]) byCourse[course][unit] = [];
      byCourse[course][unit].push(a);
    });

    const getYoutubeIdS = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const m = url.match(regExp);
      return (m && m[2].length === 11) ? m[2] : null;
    };
    const getDriveIdS = (url: string) => {
      const m = url.match(/\/d\/([^/]+)/);
      return m ? m[1] : null;
    };

    const renderMedia = (url: string, type: string) => {
      if (!url) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No video resource.</div>;
      if (type === 'Video') {
        const ytId = getYoutubeIdS(url);
        if (ytId) return <iframe className="w-full h-full rounded-none" src={`https://www.youtube.com/embed/${ytId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
        const driveId = getDriveIdS(url);
        if (driveId) return <iframe className="w-full h-full" src={`https://drive.google.com/file/d/${driveId}/preview`} allow="autoplay" />;
        return <video src={url} controls className="w-full h-full" />;
      }
      return <iframe src={url} className="w-full h-full" title="Lesson Content" />;
    };

    const handleHandToggle = async () => {
      const studentId = auth.currentUser?.uid;
      if (!studentId) return;
      const newVal = !handRaised;
      setHandRaised(newVal);
      await set(ref(database, 'users/' + studentId + '/handRaised'), newVal);
    };

    const handleSaveCourse = async (courseTitle: string, lessons: any[]) => {
      const studentId = auth.currentUser?.uid;
      if (!studentId) return;
      try {
        const safeKey = courseTitle.replace(/[.#$\[\]]/g, '_');
        await set(ref(database, `users/${studentId}/savedCourses/${safeKey}`), {
          title: courseTitle,
          savedAt: new Date().toISOString(),
          className: lessons[0]?.className || '',
          semester: lessons[0]?.semester || '',
          lessons: lessons.reduce((acc, l) => {
            acc[l.id] = {
              id: l.id,
              name: l.name,
              type: l.type,
              content: l.content || '',
              resourceUrl: l.resourceUrl || '',
              fileName: l.fileName || '',
              test: l.test || null,
              status: l.status || 'Pending',
              testScore: l.testScore !== undefined ? l.testScore : null,
              sessionName: l.sessionName || 'General',
            };
            return acc;
          }, {} as Record<string, any>)
        });
        showToast(`Course "${courseTitle}" saved to My Courses successfully!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to save course.', 'error');
      }
    };

    const toggleUnit = (key: string) => {
      setCollapsedUnits(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };

    return (
      <div className="flex gap-0 h-[calc(100vh-5rem)] -mx-4 -mt-4 md:-m-6 overflow-hidden">
        {/* LEFT SIDEBAR - Course / Unit / Lesson Navigator */}
        <div className={cn(
          "flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden transition-all duration-200",
          activeLesson ? "hidden md:flex md:w-72" : "w-full md:w-80"
        )}>
          {/* Sidebar header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-slate-900">My Learning</h1>
              <p className="text-xs text-slate-500">{myAssignments.length} lessons assigned</p>
            </div>
            <button
              onClick={handleHandToggle}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                handRaised
                  ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700'
              )}
            >
              <Hand className={cn('w-3.5 h-3.5', handRaised && 'rotate-12')} />
              {handRaised ? 'Lower' : 'Raise Hand'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {myAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No assignments yet.</p>
                <p className="text-slate-400 text-xs mt-1">Your teacher will assign lessons soon.</p>
              </div>
            ) : (
              Object.entries(byCourse).map(([courseTitle, units]) => (
                <div key={courseTitle} className="mb-1">
                  {/* Course header */}
                  <div className="px-4 py-2 bg-indigo-50 border-y border-indigo-100 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider truncate">{courseTitle}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const courseLessons = Object.values(units).flat();
                        handleSaveCourse(courseTitle, courseLessons);
                      }}
                      className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded shadow-sm hover:bg-indigo-50 transition-all cursor-pointer flex-shrink-0"
                    >
                      <Save className="w-2.5 h-2.5" /> Save
                    </button>
                  </div>
                  {/* Units */}
                  {Object.entries(units).map(([unitName, lessons]) => {
                    const unitKey = `${courseTitle}__${unitName}`;
                    const isCollapsed = collapsedUnits.has(unitKey);
                    const unitDone = lessons.filter(l => l.status === 'Completed').length;
                    const unitPct = Math.round((unitDone / lessons.length) * 100);
                    return (
                      <div key={unitKey}>
                        {/* Unit header - collapsible */}
                        <button
                          onClick={() => toggleUnit(unitKey)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                            <span className="text-sm font-bold text-slate-700 truncate">{unitName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-14 bg-slate-200 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${unitPct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{unitDone}/{lessons.length}</span>
                          </div>
                        </button>
                        {/* Lessons inside unit */}
                        {!isCollapsed && lessons.map((a: any) => (
                          <button
                            key={a.id}
                            onClick={() => openLesson(a)}
                            className={cn(
                              "w-full text-left pl-8 pr-3 py-2.5 flex items-start gap-2.5 border-b border-slate-50 transition-colors hover:bg-slate-50",
                              activeLesson?.id === a.id && "bg-primary-50 border-l-4 border-l-primary-500 pl-7"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                              a.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                            )}>
                              {a.status === 'Completed'
                                ? <CheckCircle className="w-3.5 h-3.5" />
                                : <BookOpen className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-semibold leading-snug", activeLesson?.id === a.id ? 'text-primary-700' : 'text-slate-800')}>{a.name}</p>
                              {a.testScore !== undefined && (
                                <span className="inline-block text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded mt-1">{a.testScore}%</span>
                              )}
                            </div>
                            {a.test && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-1 rounded font-bold flex-shrink-0">Quiz</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Lesson Player */}
        {activeLesson ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d1117' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveLesson(null);
                    setQuizMode(false);
                    const studentId = auth.currentUser?.uid;
                    if (studentId) {
                      set(ref(database, 'users/' + studentId + '/status'), 'Online');
                      set(ref(database, 'users/' + studentId + '/currentActivity'), null);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{activeLesson.name}</p>
                  <p className="text-slate-500 text-xs truncate">{activeLesson.courseTitle} · {activeLesson.sessionName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeLesson.status !== 'Completed' ? (
                  <Button onClick={markLessonComplete} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 h-8 rounded-lg shadow">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Complete
                  </Button>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                  </span>
                )}
              </div>
            </div>

            {!quizMode ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0d1117]">
                {/* VIDEO / CONTENT AREA — stacked configuration, no overlap */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                  {activeLesson.resourceUrl && (
                    <div className="h-64 sm:h-80 md:h-[400px] w-full bg-black flex-shrink-0 relative flex items-center justify-center">
                      {renderMedia(activeLesson.resourceUrl, activeLesson.type)}
                    </div>
                  )}
                  {activeLesson.content ? (
                    <div className="flex-1 overflow-y-auto border-t border-[#30363d] bg-[#0d1117]">
                      <div className="max-w-2xl mx-auto p-8 text-slate-100 text-lg md:text-xl font-medium leading-relaxed whitespace-pre-wrap select-text" dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
                    </div>
                  ) : !activeLesson.resourceUrl ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No content available.</div>
                  ) : null}

                  {/* Info Overlay */}
                  <div className={cn(
                    'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 transition-all duration-500 pointer-events-none z-10',
                    showInfoOverlay ? 'opacity-100' : 'opacity-0'
                  )}>
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">{activeLesson.type}</span>
                    <h2 className="text-white text-xl font-black">{activeLesson.name}</h2>
                    <p className="text-slate-400 text-sm">{activeLesson.courseTitle} · {activeLesson.sessionName}</p>
                  </div>
                </div>

                {/* POST-COMPLETION BANNER — always below the video, never overlapping */}
                {activeLesson.status === 'Completed' && (
                  <div className="flex-shrink-0 bg-[#161b22] border-t border-[#30363d] px-5 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">Lesson Completed!</p>
                        <p className="text-slate-500 text-xs">
                          {activeLesson.testScore !== undefined
                            ? `Quiz score: ${activeLesson.testScore}%`
                            : activeLesson.test ? 'A quiz is available — take it below.' : 'No quiz for this lesson.'}
                        </p>
                      </div>
                    </div>
                    {activeLesson.test && activeLesson.testScore === undefined && (
                      <Button onClick={() => { setQuizMode(true); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 h-9 flex-shrink-0">
                        <ClipboardList className="w-4 h-4 mr-2" /> Take Quiz
                      </Button>
                    )}
                    {activeLesson.test && activeLesson.testScore !== undefined && (
                      <span className="text-xs font-bold text-slate-400 border border-slate-750 bg-slate-800/40 px-3.5 py-1.5 rounded-lg shadow-sm">
                        Quiz Completed
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* QUIZ VIEW */
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-2xl mx-auto">
                  {!quizSubmitted ? (
                    <>
                      <div className="mb-6">
                        <p className="text-xs text-amber-400 uppercase tracking-wider font-bold">Quiz</p>
                        <h2 className="text-white text-2xl font-bold mt-1">{activeLesson.test.title || 'Assessment'}</h2>
                        <p className="text-slate-400 text-sm mt-1">{activeLesson.test.questions?.length} questions · Answer all to submit</p>
                      </div>
                      <div className="space-y-6">
                        {(activeLesson.test.questions || []).map((q: any, idx: number) => (
                          <div key={idx} className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
                            <p className="text-white font-semibold text-sm mb-4"><span className="text-amber-400 mr-2">{idx + 1}.</span>{q.q}</p>
                            <div className="grid grid-cols-1 gap-2">
                              {(['a', 'b', 'c', 'd'] as const).map(opt => (
                                q[opt] && (
                                  <button key={opt}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: opt }))}
                                    className={cn(
                                      "text-left px-4 py-3 rounded-lg text-sm border transition-all",
                                      quizAnswers[idx] === opt
                                        ? "bg-primary-600 border-primary-400 text-white font-semibold"
                                        : "bg-slate-800 border-slate-600 text-slate-300 hover:border-primary-500 hover:text-white"
                                    )}>
                                    <span className="font-bold mr-2 text-slate-400 uppercase">{opt}.</span>{q[opt]}
                                  </button>
                                )
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex gap-3">
                        <Button onClick={() => setQuizMode(false)} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-800">Back to Lesson</Button>
                        <Button onClick={handleSubmitQuiz}
                          disabled={Object.keys(quizAnswers).length < (activeLesson.test.questions?.length || 0)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8">Submit Quiz</Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className={cn("text-7xl font-black mb-4", quizScore! >= 70 ? 'text-green-400' : 'text-red-400')}>{quizScore}%</div>
                      <p className="text-white text-2xl font-bold">{quizScore! >= 70 ? 'Great Job! 🎉' : 'Keep Practicing!'}</p>
                      <p className="text-slate-400 text-sm mt-2">Your score has been saved.</p>
                      <div className="mt-8 flex gap-3 justify-center">
                        <Button onClick={() => setQuizMode(false)} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-800">Back to Lesson</Button>
                        <Button onClick={() => { setActiveLesson(null); setQuizMode(false); }} className="bg-primary-600 hover:bg-primary-700 text-white">Back to My Learning</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-600">Select a lesson to begin</h2>
              <p className="text-slate-400 text-sm mt-2">Choose a lesson from the left panel to start learning.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getDriveId = (url: string) => {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
  };

  const renderTeacherPreview = () => {
    if (!previewLesson) return null;
    const lesson = availableLessons.find(l => l.id === previewLesson);
    if (!lesson) return null;

    let mediaEl: React.ReactNode = null;

    if (lesson.type === 'Video' && lesson.resourceUrl) {
      const ytId = getYoutubeId(lesson.resourceUrl);
      if (ytId) {
        mediaEl = (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      } else {
        const driveId = getDriveId(lesson.resourceUrl);
        if (driveId) {
          mediaEl = (
            <iframe
              className="w-full h-full"
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              allow="autoplay"
            />
          );
        } else {
          mediaEl = <video src={lesson.resourceUrl} controls className="w-full h-full bg-black" />;
        }
      }
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 rounded-xl shadow-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white">
          <span className="text-xs font-semibold truncate pr-2 max-w-[180px]" title={lesson.name}>{lesson.name}</span>
          <button
            onClick={() => setPreviewLesson(null)}
            className="text-slate-300 hover:text-white text-lg leading-none flex-shrink-0"
            title="Close preview"
          >
            ×
          </button>
        </div>
        {mediaEl ? (
          <div className="w-full h-40 bg-black">{mediaEl}</div>
        ) : (
          <div className="p-3 text-xs text-slate-700 bg-slate-50 max-h-40 overflow-y-auto">
            <p className="font-semibold text-slate-800 mb-1">{lesson.name}</p>
            <p className="text-slate-600">{lesson.content || 'No text content available.'}</p>
            {lesson.hasTest && (
              <div className="mt-2 p-1.5 bg-success-50 border border-success-200 rounded text-success-800 text-xs font-medium">
                Quiz: {lesson.test?.questions?.length || 0} question(s)
              </div>
            )}
          </div>
        )}
        {lesson.hasTest && mediaEl && (
          <div className="px-3 py-1.5 bg-success-50 border-t border-success-200 text-success-700 text-xs font-medium">
            Includes {lesson.test?.questions?.length || 0}-question quiz
          </div>
        )}
      </div>
    );
  };

  // Teacher View
  return (
    <div className="space-y-6 relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-bold bg-slate-900 text-white transition-all transform animate-bounce">
          {toast.message}
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curriculum & Student Evaluation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Assign lessons and track student participation.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTeacherViewTab('assign')}
            className={cn(
              "px-4 py-2 font-bold text-xs rounded-lg transition-all",
              teacherViewTab === 'assign'
                ? "bg-white text-primary-700 shadow"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Assign Lessons
          </button>
          <button
            onClick={() => setTeacherViewTab('history')}
            className={cn(
              "px-4 py-2 font-bold text-xs rounded-lg transition-all",
              teacherViewTab === 'history'
                ? "bg-white text-primary-700 shadow"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Assessment History
          </button>
        </div>
      </div>

      {teacherViewTab === 'assign' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Assigned Resources & Student Selection */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex flex-col min-h-[250px] shadow-sm border-slate-200 rounded-2xl">
              <CardHeader className="py-3 bg-slate-50 border-b border-slate-100 rounded-t-2xl">
                <CardTitle className="text-base font-semibold text-slate-800">Lessons to Assign Queue</CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-4">
                {assignedLessons.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm mt-4">No lessons added yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {assignedLessons.map(lesson => (
                      <li key={lesson.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-xl border border-slate-200 group">
                        <div className="flex items-center gap-2 min-w-0">
                          {lesson.type === 'Video' ? <Video className="w-4 h-4 text-slate-400 shrink-0" /> : <FileCode className="w-4 h-4 text-slate-400 shrink-0" />}
                          <span className="font-semibold text-slate-700 truncate">{lesson.name}</span>
                        </div>
                        <button onClick={() => removeAssignedLesson(lesson.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                <Button onClick={() => setAssignedLessons([])} variant="outline" className="w-full text-slate-700 border-slate-200 hover:bg-slate-100">Clear Queue</Button>
              </div>
            </Card>

            {/* Student Selection Panel */}
            <Card className="flex flex-col flex-1 min-h-[300px] shadow-sm border-slate-200 rounded-2xl">
              <CardHeader className="py-3 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between rounded-t-2xl">
                <CardTitle className="text-base font-semibold text-slate-800">Select Students</CardTitle>
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">{selectedStudents.size} / {students.length}</span>
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
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-20 text-right pr-6">Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow
                        key={student.id}
                        className={cn("cursor-pointer", selectedStudents.has(student.id) && "bg-primary-50/50")}
                        onClick={() => toggleStudent(student.id)}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {student.name}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-medium">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {student.level?.split(' ')?.[0] || 'A1'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-slate-500">
                          No students found associated with your account.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                <Button onClick={handleFinalAssign} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold">
                  Assign to Selected
                </Button>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Curriculum Catalog */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Selection */}
              <Card className="flex flex-col overflow-hidden shadow-sm border-slate-200 rounded-2xl">
                <CardHeader className="py-2.5 bg-primary-600 text-white rounded-t-2xl">
                  <CardTitle className="text-sm text-center font-bold">Class & Semester</CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto bg-white p-1 max-h-56">
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
                          "px-3 py-2 text-sm cursor-pointer border-l-4 rounded-md transition-all",
                          selectedClass === course.id
                            ? "bg-primary-50 border-primary-500 font-bold text-primary-900"
                            : "border-transparent text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className="block">{course.className} · {course.semester}</span>
                        <span className="block text-xs text-slate-400 font-normal">{course.title}</span>
                      </li>
                    ))}
                    {courses.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No courses created yet.</li>}
                  </ul>
                </div>
              </Card>

              {/* Session Selection */}
              <Card className="flex flex-col overflow-hidden shadow-sm border-slate-200 rounded-2xl">
                <CardHeader className="py-2.5 bg-primary-600 text-white rounded-t-2xl">
                  <CardTitle className="text-sm text-center font-bold">Session</CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto bg-white p-1 max-h-56">
                  <ul className="space-y-0.5">
                    {!selectedCourse && <li className="p-4 text-center text-sm text-slate-400">Select a course to load sessions.</li>}
                    {availableSessions.map(session => (
                      <li
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session.id);
                          setSelectedLessons(new Set());
                          setPreviewLesson(null);
                        }}
                        className={cn(
                          "px-3 py-2 text-sm cursor-pointer border-l-4 rounded-md transition-all",
                          selectedSession === session.id
                            ? "bg-primary-50 border-primary-500 font-bold text-primary-900"
                            : "border-transparent text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {session.name}
                      </li>
                    ))}
                    {selectedCourse && availableSessions.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No sessions in this course.</li>}
                  </ul>
                </div>
              </Card>
            </div>

            {/* Lessons Selection */}
            <Card className="flex flex-col flex-1 shadow-sm border-slate-200 rounded-2xl">
              <div className="flex-1 overflow-auto bg-white relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-10 font-bold">
                    <TableRow>
                      <TableHead className="w-12 text-center text-slate-650">Select</TableHead>
                      <TableHead className="text-slate-650">Lessons</TableHead>
                      <TableHead className="text-right pr-6 text-slate-650">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!selectedCatalogSession && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-12 text-center text-slate-400 text-sm">Select a course session above to load lessons.</TableCell>
                      </TableRow>
                    )}
                    {selectedCatalogSession && availableLessons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-12 text-center text-slate-400 text-sm">No lessons in this session yet.</TableCell>
                      </TableRow>
                    )}
                    {availableLessons.map(lesson => (
                      <TableRow
                        key={lesson.id}
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/50",
                          selectedLessons.has(lesson.id) && "bg-primary-50/20",
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
                        <TableCell className={cn("font-semibold text-slate-700", selectedLessons.has(lesson.id) && "text-primary-700")}>
                          {lesson.name}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="outline" className="text-slate-500 bg-white border-slate-200">
                              {lesson.type === 'Video' ? <Video className="w-3.5 h-3.5 mr-1 text-slate-400" /> : <FileCode className="w-3.5 h-3.5 mr-1 text-slate-400" />}
                              {lesson.type}
                            </Badge>
                            {lesson.hasTest && (
                              <Badge key="test-tag" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Test included</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex gap-4">
                <Button onClick={handleAddSelectedToAssignQueue} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold">
                  Add Selected To Queue
                </Button>
              </div>
            </Card>
            {renderTeacherPreview()}
          </div>
        </div>
      ) : (
        /* ASSESSMENT HISTORY VIEW */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students in your history view..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button
              onClick={handleClearAllAssignments}
              className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold shrink-0 text-xs px-3 py-1.5 rounded-lg"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All Assignments
            </Button>
          </div>

          <div className="space-y-4">
            {students.filter(student => (
              student.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
              (student.email && student.email.toLowerCase().includes(historySearchQuery.toLowerCase()))
            )).map(student => {
              const studentAssignments: any[] = student.assignments
                ? Object.entries(student.assignments).map(([id, val]: [string, any]) => ({ id, ...val }))
                : [];
              return (
                <Card key={student.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-200/50 py-3 px-5 flex flex-row items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{student.name}</h4>
                      <p className="text-xs text-slate-500">{student.email} · Level: {student.level || 'Not Specified'}</p>
                    </div>
                    <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                      {studentAssignments.length} Assignment{studentAssignments.length !== 1 ? 's' : ''}
                    </span>
                  </CardHeader>
                  <CardContent className="p-0">
                    {studentAssignments.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">No assignments actively allocated.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white hover:bg-white border-b border-slate-200/60">
                              <TableHead className="pl-6 text-xs text-slate-500 font-bold">Lesson Name</TableHead>
                              <TableHead className="text-xs text-slate-500 font-bold">Course / Class</TableHead>
                              <TableHead className="text-xs text-slate-500 font-bold">Session/Subject</TableHead>
                              <TableHead className="text-xs text-slate-500 text-center font-bold">Status</TableHead>
                              <TableHead className="text-xs text-slate-500 text-center font-bold">Test Score</TableHead>
                              <TableHead className="text-right pr-6 text-xs text-slate-500 font-bold">Revoke</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentAssignments.map((a) => (
                              <TableRow key={a.id} className="hover:bg-slate-50/30 text-xs border-b border-slate-100 last:border-b-0">
                                <TableCell className="font-bold text-slate-800 pl-6">{a.name}</TableCell>
                                <TableCell className="text-slate-650">{a.courseTitle} <span className="text-[10px] text-slate-400">· {a.className}</span></TableCell>
                                <TableCell className="text-slate-600">{a.sessionName}</TableCell>
                                <TableCell className="text-center font-medium">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                    a.status === 'Completed' ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-100 border-slate-200 text-slate-600"
                                  )}>
                                    {a.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center font-bold text-sm">
                                  {a.testScore !== undefined ? (
                                    <span className={a.testScore >= 70 ? 'text-green-600' : 'text-red-550'}>{a.testScore}%</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <button
                                    onClick={() => handleRevokeSingleAssignment(student.id, a.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                    title="Revoke Assignment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
