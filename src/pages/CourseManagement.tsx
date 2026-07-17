import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  FileVideo, FileAudio, FileText, Upload, Plus, Folder, MoreVertical, Users,
  Video, Mic, Monitor, Play, Square, Save, ArrowLeft, Type, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, Link, Image as ImageIcon,
  Undo, Redo, LayoutTemplate, BookOpen, CheckCircle, Clock, Lock, ClipboardList, GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

const mockCourses = [
  { id: '1', code: 'ENG101', name: 'Conversational English', students: 42, modules: 12, status: 'Active' },
  { id: '2', code: 'FRE201', name: 'Intermediate French', students: 28, modules: 8, status: 'Active' },
  { id: '3', code: 'SPA101', name: 'Beginner Spanish', students: 35, modules: 10, status: 'Draft' },
  { id: '4', code: 'GER301', name: 'Advanced German Business', students: 15, modules: 14, status: 'Active' },
];

export default function CourseManagement() {
  const role = localStorage.getItem('userRole') || 'teacher';
  const [view, setView] = useState<'list' | 'create_lesson' | 'create_course'>(role === 'teacher' ? 'create_course' : 'list');
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    if (role !== 'student') return;
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) return;
      onValue(ref(database, 'users/' + user.uid + '/assignments'), snap => {
        if (snap.exists()) {
          const data = snap.val();
          setMyAssignments(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
        } else {
          setMyAssignments([]);
        }
      });
      onValue(ref(database, 'testResults'), snap => {
        if (snap.exists()) {
          const all = Object.entries(snap.val()).map(([id, val]: [string, any]) => ({ id, ...val }));
          setTestResults(all.filter(r => r.studentId === user.uid));
        }
      });
    });
    return () => unsubAuth();
  }, [role]);

  // ─── STUDENT VIEW ─────────────────────────────────────────────────────────
  if (role === 'student') {
    // Group by course
    const byCourse: Record<string, any[]> = {};
    myAssignments.forEach(a => {
      const key = a.courseTitle || 'Uncategorized';
      if (!byCourse[key]) byCourse[key] = [];
      byCourse[key].push(a);
    });

    const totalCompleted = myAssignments.filter(a => a.status === 'Completed').length;
    const totalPending = myAssignments.filter(a => a.status !== 'Completed').length;
    const testsGiven = testResults.length;
    const avgScore = testsGiven
      ? Math.round(testResults.reduce((s, r) => s + r.score, 0) / testsGiven)
      : null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Courses</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your enrolled courses and progress — read-only view</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: 'Total Lessons', value: myAssignments.length, color: 'bg-blue-50 text-blue-600' },
            { icon: CheckCircle, label: 'Completed', value: totalCompleted, color: 'bg-emerald-50 text-emerald-600' },
            { icon: Clock, label: 'Pending', value: totalPending, color: 'bg-orange-50 text-orange-600' },
            { icon: ClipboardList, label: 'Tests Taken', value: testsGiven, color: 'bg-purple-50 text-purple-600' },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {myAssignments.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No courses assigned yet.</p>
            <p className="text-slate-400 text-sm mt-1">Your teacher will assign lessons soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCourse).map(([courseTitle, lessons]) => {
              const done = lessons.filter(l => l.status === 'Completed').length;
              const pct = Math.round((done / lessons.length) * 100);
              const courseTests = lessons.filter(l => l.testScore !== undefined);

              return (
                <Card key={courseTitle} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  {/* Course Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{courseTitle}</h3>
                          <p className="text-xs text-slate-500">{lessons[0]?.className} · {lessons[0]?.semester}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {courseTests.length > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Avg Score</p>
                            <p className={cn('text-sm font-black', courseTests.reduce((s, l) => s + l.testScore, 0) / courseTests.length >= 70 ? 'text-emerald-600' : 'text-red-500')}>
                              {Math.round(courseTests.reduce((s, l) => s + l.testScore, 0) / courseTests.length)}%
                            </p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Progress</p>
                          <p className="text-sm font-black text-indigo-700">{done}/{lessons.length}</p>
                        </div>
                        <Badge variant={pct === 100 ? 'success' : 'default'}>{pct}%</Badge>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Lesson List - read only */}
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {lessons.map((lesson, idx) => {
                        const isCompleted = lesson.status === 'Completed';
                        const hasTest = !!lesson.test;
                        const testTaken = lesson.testScore !== undefined;
                        const score = lesson.testScore;

                        return (
                          <div key={lesson.id} className={cn(
                            'flex items-center gap-4 px-5 py-3',
                            isCompleted ? 'bg-white' : 'bg-slate-50/50'
                          )}>
                            {/* Status icon */}
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
                              isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                              {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{idx + 1}</span>}
                            </div>

                            {/* Lesson info */}
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-semibold truncate', isCompleted ? 'text-slate-800' : 'text-slate-600')}>
                                {lesson.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{lesson.sessionName}</p>
                            </div>

                            {/* Status badges - read only */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Completion status */}
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200')}>
                                {isCompleted ? '✓ Done' : 'Pending'}
                              </span>

                              {/* Test status */}
                              {hasTest && (
                                testTaken ? (
                                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                    score >= 70
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-red-50 text-red-600 border-red-200')}>
                                    Quiz: {score}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                                    Quiz Available
                                  </span>
                                )
                              )}

                              {/* Access indicator - locked = access removed */}
                              {!isCompleted && idx > 0 && lessons[idx - 1]?.status !== 'Completed' && (
                                <span title="Complete previous lesson first"><Lock className="w-3.5 h-3.5 text-slate-300" /></span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Test Results Summary */}
            {testResults.length > 0 && (
              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-500" /> Quiz History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                    {[...testResults].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(r => (
                      <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0',
                          r.score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                          {r.score}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.lessonName}</p>
                          <p className="text-xs text-slate-400">{r.correct}/{r.totalQuestions} correct · {new Date(r.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                          r.score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                          {r.score >= 70 ? 'Passed' : 'Needs Work'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
              <p className="text-slate-500 mt-1">{view === 'create_course' ? 'Set up course details and record multimedia content.' : 'Record media and create interactive lesson content.'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white"><Save className="w-4 h-4 mr-2" />Save Draft</Button>
            <Button>Publish {view === 'create_course' ? 'Course' : 'Lesson'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex flex-col flex-1 shadow-sm border-slate-200 overflow-hidden min-h-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 shrink-0">
                <CardTitle className="text-sm">Media Recording & Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                    <Video className="w-5 h-5" /><span className="text-xs">Video & Audio</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                    <Mic className="w-5 h-5" /><span className="text-xs">Audio Only</span>
                  </Button>
                  <Button variant="outline" className="col-span-2 h-12 flex items-center justify-center gap-2 bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                    <Monitor className="w-4 h-4" /> Screen Capture
                  </Button>
                </div>
                <div className="flex-1 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center mt-2 border border-slate-200 min-h-[200px]">
                  <div className="text-slate-500 flex flex-col items-center gap-2">
                    <Video className="w-8 h-8 opacity-20" />
                    <span className="text-xs opacity-50 font-medium">Camera Offline</span>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-mono">00:00:00</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 bg-slate-100 p-2 rounded-lg shrink-0">
                  <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm hover:bg-primary-50 transition-colors">
                    <Play className="w-5 h-5 ml-1" />
                  </button>
                  <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-error-600 shadow-sm hover:bg-error-50 transition-colors">
                    <Square className="w-4 h-4" />
                  </button>
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
              <div className="p-4 border-b border-slate-100 bg-white shrink-0">
                <input type="text" placeholder={view === 'create_course' ? "Course Title..." : "Lesson Title..."} className="w-full text-2xl font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none" />
                {view === 'create_course' && (
                  <input type="text" placeholder="Course Code (e.g. ENG101)" className="mt-2 w-full text-sm font-medium text-slate-500 placeholder:text-slate-300 focus:outline-none" />
                )}
              </div>
              <div className="flex-1 bg-white p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto min-h-full outline-none text-slate-700 leading-relaxed" contentEditable={true} suppressContentEditableWarning={true}>
                  <p className="text-slate-400">Start typing your {view === 'create_course' ? 'course description and initial' : 'lesson'} content here...</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Teacher list view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Course Management</h1>
          <p className="text-slate-500 mt-1">Create, organize, and assign curriculum contents.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setView('create_course')}>
            <Plus className="w-4 h-4 mr-2" /> Create Course
          </Button>
          <Button onClick={() => setView('create_lesson')}>
            <Plus className="w-4 h-4 mr-2" /> Create Lesson
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockCourses.map(course => (
          <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                  {course.code.substring(0, 3)}
                </div>
                <button className="text-slate-400 hover:text-slate-700"><MoreVertical className="w-5 h-5" /></button>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">{course.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{course.code}</p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><Folder className="w-4 h-4" /> {course.modules}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {course.students}</span>
                </div>
                <Badge variant={course.status === 'Active' ? 'success' : 'warning'}>{course.status}</Badge>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Button variant="outline" className="w-full">Manage Course</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
