import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  FileVideo, FileAudio, FileText, Upload, Plus, Folder, MoreVertical, Users,
  Video, Mic, Monitor, Play, Square, Save, ArrowLeft, Type, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, Link, Image as ImageIcon,
  Undo, Redo, LayoutTemplate, BookOpen, CheckCircle, Clock, Lock, ClipboardList, GraduationCap,
  PlayCircle, AlertCircle, Sparkles, ChevronRight, ChevronDown, CheckCircle2, Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';

const mockCourses = [
  { id: '1', code: 'ENG101', name: 'Conversational English', students: 42, modules: 12, status: 'Active' },
  { id: '2', code: 'FRE201', name: 'Intermediate French', students: 28, modules: 8, status: 'Active' },
  { id: '3', code: 'SPA101', name: 'Beginner Spanish', students: 35, modules: 10, status: 'Draft' },
  { id: '4', code: 'GER301', name: 'Advanced German Business', students: 15, modules: 14, status: 'Active' },
];

export default function CourseManagement() {
  const role = localStorage.getItem('userRole') || 'teacher';
  // Start teacher on list view to show their created courses
  const [view, setView] = useState<'list' | 'create_lesson' | 'create_course'>('list');
  const [savedCourses, setSavedCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);

  // Teacher course builder states
  const [courses, setCourses] = useState<any[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [assigningCourse, setAssigningCourse] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states for Course Creator
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseContent, setCourseContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  // Form states for Lesson Studio
  const [targetCourseId, setTargetCourseId] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [lessonType, setLessonType] = useState('Video');
  const [lessonUnit, setLessonUnit] = useState('Unit 1');

  // Lesson player states
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) return;

      if (role === 'student') {
        const queryRef = ref(database, `users/${user.uid}/savedCourses`);
        return onValue(queryRef, snap => {
          if (snap.exists()) {
            const list = Object.entries(snap.val()).map(([key, val]: [string, any]) => ({
              key,
              ...val,
              lessons: val.lessons ? Object.values(val.lessons) : []
            }));
            setSavedCourses(list);
          } else {
            setSavedCourses([]);
          }
        });
      } else if (role === 'teacher') {
        // Fetch courses created by this teacher
        const coursesRef = ref(database, 'courses');
        const unsubCourses = onValue(coursesRef, snap => {
          if (snap.exists()) {
            const list = Object.entries(snap.val())
              .map(([id, val]: [string, any]) => ({ id, ...val }))
              .filter(c => c.createdBy === user.uid);
            setCourses(list);
          } else {
            setCourses([]);
          }
        });

        // Fetch students of this teacher
        const usersRef = ref(database, 'users');
        const unsubStudents = onValue(usersRef, snap => {
          if (snap.exists()) {
            const allUsers = Object.entries(snap.val()).map(([id, val]: [string, any]) => ({ id, ...val }));
            const list = allUsers.filter(u => u.role === 'student' && u.teacherId === user.uid);
            setTeacherStudents(list);
          } else {
            setTeacherStudents([]);
          }
        });

        return () => {
          unsubCourses();
          unsubStudents();
        };
      }
    });
    return () => unsubAuth();
  }, [role]);

  const openLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setQuizMode(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setShowInfoOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowInfoOverlay(false), 3000);
  };

  const markLessonComplete = async () => {
    const user = auth.currentUser;
    if (!user || !selectedCourse || !activeLesson) return;
    try {
      const dbPath = `users/${user.uid}/savedCourses/${selectedCourse.key}/lessons/${activeLesson.id}/status`;
      await set(ref(database, dbPath), 'Completed');
      setActiveLesson(p => ({ ...p, status: 'Completed' }));
    } catch (err) {
      console.error(err);
    }
  };

  const submitQuiz = async () => {
    const user = auth.currentUser;
    if (!user || !selectedCourse || !activeLesson?.test) return;

    const questions = activeLesson.test.questions || [];
    let correct = 0;
    questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.a) correct++;
    });

    const score = Math.round((correct / questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    try {
      // Save test result under main testResults table
      const newResultRef = push(ref(database, 'testResults'));
      const quizResult = {
        studentId: user.uid,
        studentName: user.displayName || user.email || 'Student',
        lessonName: activeLesson.name,
        courseTitle: selectedCourse.title,
        testTitle: activeLesson.test.title || 'Lesson Quiz',
        totalQuestions: questions.length,
        correct,
        score,
        submittedAt: new Date().toISOString()
      };
      await set(newResultRef, quizResult);

      // Save score to this savedCourse's lesson record
      const scorePath = `users/${user.uid}/savedCourses/${selectedCourse.key}/lessons/${activeLesson.id}/testScore`;
      await set(ref(database, scorePath), score);

      // Save status as Completed
      const statusPath = `users/${user.uid}/savedCourses/${selectedCourse.key}/lessons/${activeLesson.id}/status`;
      await set(ref(database, statusPath), 'Completed');

      // Update active lesson local state
      setActiveLesson(p => ({ ...p, status: 'Completed', testScore: score }));
    } catch (e) {
      console.error(e);
    }
  };

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
      if (ytId) return <iframe className="w-full h-full rounded-none border-0" src={`https://www.youtube.com/embed/${ytId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
      const driveId = getDriveIdS(url);
      if (driveId) return <iframe className="w-full h-full border-0" src={`https://drive.google.com/file/d/${driveId}/preview`} allow="autoplay" />;
      return <video src={url} controls className="w-full h-full" />;
    }
    return <iframe src={url} className="w-full h-full border-0" title="Lesson Content" />;
  };

  const handlePublishCourse = async (status: 'Active' | 'Draft') => {
    const user = auth.currentUser;
    if (!user) return alert('Not authenticated.');
    if (!courseTitle.trim()) return alert('Please enter a course title.');

    setLoading(true);
    try {
      const courseId = push(ref(database, 'courses')).key || Date.now().toString();
      const newCourseObj = {
        id: courseId,
        title: courseTitle.trim(),
        code: courseCode.trim() || 'ENG101',
        content: courseContent.trim(),
        youtubeUrl: youtubeUrl.trim(),
        driveUrl: driveUrl.trim(),
        createdBy: user.uid,
        status,
        createdAt: new Date().toISOString()
      };

      await set(ref(database, `courses/${courseId}`), newCourseObj);
      alert(status === 'Active' ? 'Course published successfully!' : 'Course draft saved successfully!');

      // Reset form
      setCourseTitle('');
      setCourseCode('');
      setCourseContent('');
      setYoutubeUrl('');
      setDriveUrl('');
      setView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save course.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishLesson = async () => {
    const user = auth.currentUser;
    if (!user) return alert('Not authenticated.');
    if (!targetCourseId) return alert('Please select a course.');
    if (!lessonName.trim()) return alert('Please enter a lesson title.');

    setLoading(true);
    try {
      const lessonId = push(ref(database, `courses/${targetCourseId}/lessons`)).key || Date.now().toString();
      const newLessonObj = {
        id: lessonId,
        name: lessonName.trim(),
        type: lessonType,
        sessionName: lessonUnit.trim() || 'Unit 1',
        resourceUrl: youtubeUrl.trim() || driveUrl.trim() || '',
        content: courseContent.trim(),
        createdAt: new Date().toISOString()
      };

      await set(ref(database, `courses/${targetCourseId}/lessons/${lessonId}`), newLessonObj);
      alert('Lesson added to course successfully!');

      // Reset form
      setLessonName('');
      setLessonUnit('Unit 1');
      setCourseContent('');
      setYoutubeUrl('');
      setDriveUrl('');
      setView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save lesson.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourse = async () => {
    if (!assigningCourse || selectedStudentIds.length === 0) return;
    setLoading(true);
    try {
      const courseObj = courses.find(c => c.id === assigningCourse.id);
      if (!courseObj) return;

      const lessonsData: Record<string, any> = {};

      // Default first main lesson from the course overview
      lessonsData[courseObj.id] = {
        id: courseObj.id,
        name: 'Introduction',
        type: courseObj.youtubeUrl || courseObj.driveUrl ? 'Video' : 'HTML',
        resourceUrl: courseObj.youtubeUrl || courseObj.driveUrl || '',
        content: courseObj.content || '',
        sessionName: 'Overview',
        status: 'Not Started'
      };

      // Add sub-lessons if exists
      if (courseObj.lessons) {
        Object.entries(courseObj.lessons).forEach(([lesId, lesVal]: [string, any]) => {
          lessonsData[lesId] = {
            id: lesId,
            name: lesVal.name,
            type: lesVal.type || 'HTML',
            resourceUrl: lesVal.resourceUrl || '',
            content: lesVal.content || '',
            sessionName: lesVal.sessionName || 'Lessons',
            status: 'Not Started',
            test: lesVal.test || null
          };
        });
      }

      const promises = selectedStudentIds.map(sid => {
        return set(ref(database, `users/${sid}/savedCourses/${courseObj.id}`), {
          title: courseObj.title,
          code: courseObj.code,
          className: 'Assigned Course',
          semester: 'Self-paced',
          savedAt: new Date().toISOString(),
          lessons: lessonsData
        });
      });

      await Promise.all(promises);
      alert('Course successfully assigned list to students!');
      setAssigningCourse(null);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to assign course.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await set(ref(database, `courses/${courseId}`), null);
      alert('Course deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete course.');
    }
  };

  // ─── STUDENT VIEW ─────────────────────────────────────────────────────────
  if (role === 'student') {
    if (selectedCourse) {
      // Group lessons in the selected saved course by unit (sessionName)
      const byUnit: Record<string, any[]> = {};
      selectedCourse.lessons.forEach((l: any) => {
        const unit = l.sessionName || 'General';
        if (!byUnit[unit]) byUnit[unit] = [];
        byUnit[unit].push(l);
      });

      return (
        <div className="flex gap-0 h-[calc(100vh-5rem)] -m-6 overflow-hidden">
          {/* Left panel lesson list */}
          <div className={cn(
            "flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden transition-all duration-200",
            activeLesson ? "w-72" : "w-full md:w-80"
          )}>
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-2">
              <button
                onClick={() => { setSelectedCourse(null); setActiveLesson(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-slate-900 truncate">{selectedCourse.title}</h1>
                <p className="text-[10px] text-slate-500">{selectedCourse.lessons.length} lessons saved</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {Object.entries(byUnit).map(([unitName, lessons]) => {
                const isCollapsed = collapsedUnits.has(unitName);
                const unitDone = lessons.filter(l => l.status === 'Completed').length;
                const unitPct = Math.round((unitDone / lessons.length) * 100);
                return (
                  <div key={unitName} className="mb-1">
                    <button
                      onClick={() => setCollapsedUnits(prev => {
                        const next = new Set(prev);
                        if (next.has(unitName)) next.delete(unitName); else next.add(unitName);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                        <span className="text-xs font-bold text-slate-700 truncate">{unitName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">{unitPct}%</span>
                      </div>
                    </button>
                    {!isCollapsed && lessons.map((l: any) => (
                      <button
                        key={l.id}
                        onClick={() => openLesson(l)}
                        className={cn(
                          "w-full text-left pl-8 pr-3 py-2.5 flex items-start gap-2.5 border-b border-slate-50 transition-colors hover:bg-slate-50",
                          activeLesson?.id === l.id && "bg-indigo-50 border-l-4 border-indigo-500 pl-7"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          l.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                        )}>
                          {l.status === 'Completed' ? <CheckCircle className="w-3.5 h-3.5" /> : <BookOpen className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-semibold truncate", activeLesson?.id === l.id ? 'text-indigo-700 font-bold' : 'text-slate-850')}>{l.name}</p>
                          {l.testScore !== undefined && l.testScore !== null && l.testScore > 0 && (
                            <span className="inline-block text-[9px] font-bold text-green-700 bg-green-50 px-1 py-0.2 rounded mt-0.5">Quiz: {l.testScore}%</span>
                          )}
                        </div>
                        {l.test && <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-250 px-1 rounded font-bold">Quiz</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel lesson player */}
          {activeLesson ? (
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d1117' }}>
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => { setActiveLesson(null); setQuizMode(false); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{activeLesson.name}</p>
                    <p className="text-slate-500 text-xs truncate">{selectedCourse.title} · {activeLesson.sessionName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeLesson.status !== 'Completed' ? (
                    <Button onClick={markLessonComplete} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 h-8 rounded-lg shadow">
                      Mark Complete
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1 bg-[#161b22] rounded-lg border border-emerald-500/20">
                      Completed
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

                    {showInfoOverlay && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 pointer-events-none z-10 transition-opacity">
                        <span className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">{activeLesson.type}</span>
                        <h2 className="text-white text-xl font-black">{activeLesson.name}</h2>
                      </div>
                    )}
                  </div>

                  {/* POST-COMPLETION BANNER */}
                  {activeLesson.status === 'Completed' && (
                    <div className="flex-shrink-0 bg-[#161b22] border-t border-[#30363d] px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">Lesson Completed!</p>
                          <p className="text-slate-500 text-xs">
                            {activeLesson.testScore !== undefined && activeLesson.testScore !== null && activeLesson.testScore > 0
                              ? `Quiz score: ${activeLesson.testScore}%`
                              : activeLesson.test ? 'A quiz is available — take it below.' : 'No quiz for this lesson.'}
                          </p>
                        </div>
                      </div>
                      {activeLesson.test && (activeLesson.testScore === undefined || activeLesson.testScore === null) && (
                        <Button onClick={() => { setQuizMode(true); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null); }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 h-9 flex-shrink-0">
                          Take Quiz
                        </Button>
                      )}
                      {activeLesson.test && activeLesson.testScore !== undefined && activeLesson.testScore !== null && (
                        <span className="text-xs font-bold text-slate-400 border border-slate-750 bg-slate-800/40 px-3.5 py-1.5 rounded-lg shadow-sm">
                          Quiz Completed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* QUIZ VIEW */
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-900">
                  <div className="max-w-2xl mx-auto">
                    {!quizSubmitted ? (
                      <>
                        <div className="mb-6">
                          <p className="text-xs text-amber-400 uppercase tracking-wider font-bold">Quiz</p>
                          <h2 className="text-white text-2xl font-bold mt-1">{activeLesson.test.title || 'Assessment'}</h2>
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
                                          ? "bg-indigo-600 border-indigo-400 text-white font-semibold"
                                          : "bg-slate-850 border-slate-700 text-slate-350 hover:border-indigo-500 hover:text-white"
                                      )}>
                                      <span className="font-bold mr-2 text-slate-400 uppercase">{opt}.</span>{q[opt]}
                                    </button>
                                  )
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="mt-8 flex justify-end">
                            <Button onClick={submitQuiz}
                              disabled={Object.keys(quizAnswers).length < (activeLesson.test.questions || []).length}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-3 rounded-xl disabled:opacity-40 shadow-lg">
                              Submit Quiz
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 space-y-6 bg-slate-850 border border-slate-700 rounded-2xl p-8">
                        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-8 h-8 animate-bounce" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white">Quiz Submitted Successfully!</h2>
                          <p className="text-slate-400 text-sm mt-1">Great job finishing the evaluation check.</p>
                        </div>
                        <div className="max-w-xs mx-auto p-4 bg-slate-900 border border-slate-750 rounded-xl">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Your Score</p>
                          <p className={cn('text-4xl font-black mt-2', quizScore >= 70 ? 'text-emerald-500' : 'text-rose-500')}>{quizScore}%</p>
                          <p className="text-[10px] text-slate-500 mt-1">Passing score: 70%</p>
                        </div>
                        <Button onClick={() => setQuizMode(false)} className="bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 text-sm font-semibold py-2 px-6">
                          Back to Lesson
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8fafc] text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <h2 className="text-slate-700 font-bold">Select a Lesson</h2>
              <p className="text-slate-450 text-xs mt-1">Choose a saved lesson from the left menu to start learning.</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Saved Courses</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your lifetime accessed courses (available even offline or after assignment expiration)</p>
        </div>

        {savedCourses.length === 0 ? (
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-650 font-bold">No saved courses yet</p>
                <p className="text-slate-450 text-xs mt-1 max-w-sm mx-auto">
                  Go to "My Assessments" page and click the "Save" button next to any assigned course header to save it forever.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/assessments'} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl">
                Go to My Assessments
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedCourses.map(course => {
              const comp = course.lessons.filter((l: any) => l.status === 'Completed').length;
              const pct = Math.round((comp / course.lessons.length) * 100);
              return (
                <Card key={course.key} className="border-slate-250 hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-white">
                  <div className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-start justify-between min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-850 truncate">{course.title}</h3>
                          <p className="text-[10px] text-slate-500">{course.className} · {course.semester}</p>
                        </div>
                      </div>
                      <Badge variant={pct === 100 ? 'success' : 'default'} className="flex-shrink-0">{pct}%</Badge>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progress: {comp}/{course.lessons.length} completed</span>
                        <span>Saved: {new Date(course.savedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        onClick={() => setSelectedCourse(course)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 h-8 rounded-lg"
                      >
                        Open Course <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── TEACHER / ADMIN COURSE BUILDER VIEW ─────────────────────────────────
  if (view === 'create_course' || view === 'create_lesson') {
    return (
      <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{view === 'create_course' ? 'Course Builder' : 'Lesson Studio'}</h1>
              <p className="text-slate-500 mt-1">{view === 'create_course' ? 'Set up course details and provide YouTube or Google Drive video links.' : 'Add video link and create interactive lesson content.'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {view === 'create_course' ? (
              <>
                <Button variant="outline" onClick={() => handlePublishCourse('Draft')} disabled={loading} className="bg-white">
                  <Save className="w-4 h-4 mr-2" />Save Draft
                </Button>
                <Button onClick={() => handlePublishCourse('Active')} disabled={loading}>
                  Publish Course
                </Button>
              </>
            ) : (
              <Button onClick={handlePublishLesson} disabled={loading}>
                Publish Lesson
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex flex-col flex-1 shadow-sm border-slate-200 overflow-hidden min-h-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 shrink-0">
                <CardTitle className="text-sm">Media resource & Links</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-y-auto">
                <div className="space-y-4 shrink-0">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">YouTube Link</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => {
                          setYoutubeUrl(e.target.value);
                          if (e.target.value) setDriveUrl('');
                        }}
                        className="w-full h-10 px-3 pl-9 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 bg-white"
                      />
                      <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Google Drive Link</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="https://drive.google.com/file/d/.../preview"
                        value={driveUrl}
                        onChange={(e) => {
                          setDriveUrl(e.target.value);
                          if (e.target.value) setYoutubeUrl('');
                        }}
                        className="w-full h-10 px-3 pl-9 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 bg-white"
                      />
                      <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center mt-2 border border-slate-200 min-h-[220px]">
                  {(youtubeUrl || driveUrl) ? (
                    renderMedia(youtubeUrl || driveUrl, 'Video')
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-2 select-none">
                      <Video className="w-8 h-8 opacity-20" />
                      <span className="text-xs opacity-50 font-medium">No YouTube or Drive video preview</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col min-h-0">
            <Card className="flex flex-col flex-1 shadow-sm border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><Undo className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><Redo className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-300 mx-1"></div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 font-bold hover:bg-slate-200"><Bold className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 italic hover:bg-slate-200"><Italic className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 underline hover:bg-slate-200"><Underline className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-300 mx-1"></div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignCenter className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignRight className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-300 mx-1"></div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><Link className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><ImageIcon className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs bg-white"><LayoutTemplate className="w-3 h-3 mr-1" />Templates</Button>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 bg-white shrink-0 space-y-3">
                {view === 'create_course' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Course Title..."
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="w-full text-2xl font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Course Code (e.g. ENG101)"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className="w-full text-sm font-medium text-slate-500 placeholder:text-slate-300 focus:outline-none bg-white"
                    />
                  </>
                ) : (
                  <>
                    <select
                      value={targetCourseId}
                      onChange={(e) => setTargetCourseId(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none bg-white font-medium text-slate-700"
                    >
                      <option value="">-- Choose Course for Lesson --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Lesson Title..."
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none bg-white"
                    />
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        placeholder="Unit Name (e.g. Unit 1: Introduction)"
                        value={lessonUnit}
                        onChange={(e) => setLessonUnit(e.target.value)}
                        className="flex-1 text-sm font-medium text-slate-500 placeholder:text-slate-300 focus:outline-none bg-white"
                      />
                      <select
                        value={lessonType}
                        onChange={(e) => setLessonType(e.target.value)}
                        className="h-8 px-2 text-xs rounded-lg border border-slate-200 focus:outline-none bg-white text-slate-650"
                      >
                        <option value="Video">Video Lesson</option>
                        <option value="HTML">Text/HTML Lesson</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 bg-white p-6 overflow-y-auto">
                <textarea
                  value={courseContent}
                  onChange={(e) => setCourseContent(e.target.value)}
                  placeholder="Start typing your course information or lesson content here..."
                  className="w-full h-full min-h-[320px] text-slate-700 placeholder:text-slate-350 focus:outline-none resize-none border-none p-0 text-base leading-relaxed font-sans"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Teacher main list view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Course Management</h1>
          <p className="text-slate-500 mt-1">Create, organize, and assign curriculum contents.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setView('create_course')} className="bg-white">
            <Plus className="w-4 h-4 mr-2" /> Create Course
          </Button>
          <Button onClick={() => setView('create_lesson')}>
            <Plus className="w-4 h-4 mr-2" /> Create Lesson
          </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-650 font-bold">No courses created yet</p>
              <p className="text-slate-450 text-xs mt-1 max-w-sm mx-auto">
                Create a course to write custom lesson templates and assign them to your students list.
              </p>
            </div>
            <Button onClick={() => setView('create_course')} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2 rounded-xl">
              Create a Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map(course => (
            <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-full bg-white border-slate-200">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {course.code.substring(0, 3)}
                  </div>
                  <button onClick={() => handleDeleteCourse(course.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors">
                    <Square className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors truncate">{course.title}</h3>
                <p className="text-sm text-slate-500 mb-4 font-mono">{course.code}</p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Folder className="w-4 h-4 text-primary-500" /> {course.lessons ? Object.keys(course.lessons).length : 0} lesson{(!course.lessons || Object.keys(course.lessons).length !== 1) ? 's' : ''}</span>
                  </div>
                  <Badge variant={course.status === 'Active' ? 'success' : 'warning'}>{course.status}</Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <Button
                    onClick={() => { setAssigningCourse(course); setSelectedStudentIds([]); }}
                    className="w-full text-xs font-bold h-9 bg-primary-600 text-white hover:bg-primary-700"
                  >
                    <Users className="w-4 h-4 mr-2" /> Assign Course
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Student Modal with responsive scroll */}
      {assigningCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-bold text-slate-800">Assign Course: {assigningCourse.title}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Select students to assign this course for lifetime access.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {teacherStudents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-xl">No students assigned to you yet.</p>
              ) : (
                <div className="space-y-2">
                  {/* Select All option */}
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === teacherStudents.length && teacherStudents.length > 0}
                      ref={el => {
                        if (el) el.indeterminate = selectedStudentIds.length > 0 && selectedStudentIds.length < teacherStudents.length;
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(teacherStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded border-slate-350 focus:ring-primary-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-indigo-800">Select All Students</p>
                      <p className="text-[10px] text-indigo-600">{teacherStudents.length} students in your class</p>
                    </div>
                  </label>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {teacherStudents.map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-slate-350 focus:ring-primary-500 bg-white"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{student.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setAssigningCourse(null)}>Cancel</Button>
                <Button
                  onClick={handleAssignCourse}
                  disabled={loading || selectedStudentIds.length === 0}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-9 text-xs"
                >
                  {loading ? 'Assigning...' : `Assign to ${selectedStudentIds.length} Student${selectedStudentIds.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
