import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  FileVideo, FileAudio, FileText, Upload, Plus, Folder, MoreVertical, Users,
  Video, Mic, Monitor, Play, Square, Save, ArrowLeft, Type, Bold, Italic, 
  Underline, AlignLeft, AlignCenter, AlignRight, Link, Image as ImageIcon,
  Undo, Redo, LayoutTemplate
} from 'lucide-react';
import { cn } from '../lib/utils';

const courses = [
  { id: '1', code: 'ENG101', name: 'Conversational English', students: 42, modules: 12, status: 'Active' },
  { id: '2', code: 'FRE201', name: 'Intermediate French', students: 28, modules: 8, status: 'Active' },
  { id: '3', code: 'SPA101', name: 'Beginner Spanish', students: 35, modules: 10, status: 'Draft' },
  { id: '4', code: 'GER301', name: 'Advanced German Business', students: 15, modules: 14, status: 'Active' },
];

export default function CourseManagement() {
  const role = localStorage.getItem('userRole') || 'teacher';
  const [view, setView] = useState<'list' | 'create_lesson' | 'create_course'>(role === 'teacher' ? 'create_course' : 'list');

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
               <Button variant="outline" className="bg-white"><Save className="w-4 h-4 mr-2"/> Save Draft</Button>
               <Button>Publish {view === 'create_course' ? 'Course' : 'Lesson'}</Button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
             {/* LEFT COLUMN: Media Recording */}
             <div className="lg:col-span-4 flex flex-col gap-6">
                <Card className="flex flex-col flex-1 shadow-sm border-slate-200 overflow-hidden min-h-0">
                   <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 shrink-0">
                     <CardTitle className="text-sm">Media Recording & Preview</CardTitle>
                   </CardHeader>
                   <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-y-auto">
                      {/* Recording Tools */}
                      <div className="grid grid-cols-2 gap-3 shrink-0">
                         <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                           <Video className="w-5 h-5"/>
                           <span className="text-xs">Video & Audio</span>
                         </Button>
                         <Button variant="outline" className="h-16 flex flex-col gap-1 items-center justify-center bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                           <Mic className="w-5 h-5"/>
                           <span className="text-xs">Audio Only</span>
                         </Button>
                         <Button variant="outline" className="col-span-2 h-12 flex items-center justify-center gap-2 bg-slate-50 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                           <Monitor className="w-4 h-4"/> Screen Capture
                         </Button>
                      </div>

                      {/* Video Player / Preview Area */}
                      <div className="flex-1 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center mt-2 border border-slate-200 min-h-[200px]">
                         <div className="text-slate-500 flex flex-col items-center gap-2">
                            <Video className="w-8 h-8 opacity-20"/>
                            <span className="text-xs opacity-50 font-medium">Camera Offline</span>
                         </div>
                         <div className="absolute top-2 right-2 flex gap-2">
                           <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-mono">00:00:00</span>
                         </div>
                      </div>

                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-4 bg-slate-100 p-2 rounded-lg shrink-0">
                         <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm hover:bg-primary-50 transition-colors">
                           <Play className="w-5 h-5 ml-1"/>
                         </button>
                         <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-error-600 shadow-sm hover:bg-error-50 transition-colors">
                           <Square className="w-4 h-4"/>
                         </button>
                      </div>
                   </CardContent>
                </Card>
             </div>

             {/* RIGHT COLUMN: Rich Text Editor */}
             <div className="lg:col-span-8 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 shadow-sm border-slate-200 overflow-hidden">
                   <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><Undo className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><Redo className="w-4 h-4"/></Button>
                         <div className="w-px h-5 bg-slate-300 mx-1"></div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 font-bold hover:bg-slate-200"><Bold className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 italic hover:bg-slate-200"><Italic className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 underline hover:bg-slate-200"><Underline className="w-4 h-4"/></Button>
                         <div className="w-px h-5 bg-slate-300 mx-1"></div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignLeft className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignCenter className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><AlignRight className="w-4 h-4"/></Button>
                         <div className="w-px h-5 bg-slate-300 mx-1"></div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><Link className="w-4 h-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-200"><ImageIcon className="w-4 h-4"/></Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-white"><LayoutTemplate className="w-3 h-3 mr-1"/> Templates</Button>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{role === 'student' ? 'My Courses' : 'Course Management'}</h1>
          <p className="text-slate-500 mt-1">{role === 'student' ? 'Access your enrolled courses and materials.' : 'Create, organize, and assign curriculum contents.'}</p>
        </div>
        {role !== 'student' && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setView('create_course')}>
              <Plus className="w-4 h-4 mr-2" /> Create Course
            </Button>
            <Button onClick={() => setView('create_lesson')}>
              <Plus className="w-4 h-4 mr-2" /> Create Lesson
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.map(course => (
          <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                  {course.code.substring(0,3)}
                </div>
                <button className="text-slate-400 hover:text-slate-700">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-1 group-hover:text-primary-600 transition-colors">{course.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{course.code}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5" title="Course Modules">
                    <Folder className="w-4 h-4" /> {course.modules}
                  </span>
                  <span className="flex items-center gap-1.5" title="Enrolled Students">
                    <Users className="w-4 h-4" /> {course.students}
                  </span>
                </div>
                <Badge variant={course.status === 'Active' ? 'success' : 'warning'}>{course.status}</Badge>
              </div>
              {role !== 'student' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="w-full">Manage Course</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {role !== 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                   <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded flex items-center justify-center"><FileText className="w-5 h-5"/></div>
                   <div>
                     <p className="text-sm font-medium text-slate-800">Grammar_Rules.pdf</p>
                     <p className="text-xs text-slate-500">2.4 MB • ENG101</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                   <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded flex items-center justify-center"><FileAudio className="w-5 h-5"/></div>
                   <div>
                     <p className="text-sm font-medium text-slate-800">Dialogue_Track_01.mp3</p>
                     <p className="text-xs text-slate-500">4.1 MB • FRE201</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                   <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded flex items-center justify-center"><FileVideo className="w-5 h-5"/></div>
                   <div>
                     <p className="text-sm font-medium text-slate-800">Pronunciation_Guide.mp4</p>
                     <p className="text-xs text-slate-500">24.5 MB • SPA101</p>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
