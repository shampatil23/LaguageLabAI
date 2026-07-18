import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, Plus, Upload, FileText, Trash2, Layers } from 'lucide-react';
import { database, storage } from '../lib/firebase';
import { ref, push, set, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

type CourseSession = {
    name: string;
    lessons?: Record<string, any>;
};

type CourseCatalog = {
    id: string;
    title: string;
    className: string;
    semester: string;
    sessions?: Record<string, CourseSession>;
};

interface TempLesson {
    id: string;
    lessonName: string;
    lessonType: string;
    content: string;
    resourceUrl: string;
    uploadFile: File | null;
    includeTest: boolean;
    testForm: any;
}

export default function CreateCourse() {
    const [loading, setLoading] = useState(false);
    const [courseMode, setCourseMode] = useState<'create' | 'upload'>('create');
    const [courseUpload, setCourseUpload] = useState<File | null>(null);
    const [courses, setCourses] = useState<CourseCatalog[]>([]);
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

    // Editing states
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editingOriginalLesson, setEditingOriginalLesson] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        courseName: '', // e.g., English Communication
        program: '',    // e.g., BCA
        semester: '',   // e.g., Semester 1
        subject: '',    // e.g., Literature
        unit: '',       // e.g., Unit 1
        lessonName: '', // e.g., Chapter 1
        lessonType: 'HTML',
        content: '',
        resourceUrl: ''
    });

    const [includeTest, setIncludeTest] = useState(false);
    const [testForm, setTestForm] = useState({
        level: 'lessonwise', // subjectwise | unitwise | lessonwise
        title: '',
        questions: [{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]
    });

    const [tempLessons, setTempLessons] = useState<TempLesson[]>([]);

    useEffect(() => {
        let catalogData: any = null;
        let curriculumData: any = null;

        const rebuildCatalog = (catalog: any, curriculum: any) => {
            const courseMap: Record<string, CourseCatalog> = {};

            // 1. Process legacy Course Catalog
            if (catalog) {
                Object.entries(catalog).forEach(([courseId, courseVal]: [string, any]) => {
                    const courseKey = `${courseVal.title}_${courseVal.className}_${courseVal.semester}`;
                    if (!courseMap[courseKey]) {
                        courseMap[courseKey] = {
                            id: courseId,
                            title: courseVal.title,
                            className: courseVal.className,
                            semester: courseVal.semester,
                            sessions: {}
                        };
                    }

                    if (courseVal.sessions) {
                        Object.entries(courseVal.sessions).forEach(([sessionId, sessionVal]: [string, any]) => {
                            const sessionKey = sessionId;
                            if (!courseMap[courseKey].sessions) courseMap[courseKey].sessions = {};
                            if (!courseMap[courseKey].sessions![sessionKey]) {
                                courseMap[courseKey].sessions![sessionKey] = {
                                    name: sessionVal.name,
                                    lessons: {}
                                };
                            }

                            if (sessionVal.lessons) {
                                Object.entries(sessionVal.lessons).forEach(([lessonId, lessonVal]: [string, any]) => {
                                    if (!courseMap[courseKey].sessions![sessionKey].lessons) {
                                        courseMap[courseKey].sessions![sessionKey].lessons = {};
                                    }
                                    courseMap[courseKey].sessions![sessionKey].lessons![lessonId] = {
                                        id: lessonId,
                                        name: lessonVal.name,
                                        type: lessonVal.type || 'HTML',
                                        content: lessonVal.content || '',
                                        resourceUrl: lessonVal.resourceUrl || '',
                                        fileName: lessonVal.fileName || '',
                                        test: lessonVal.test || null,
                                        course: courseVal.title,
                                        program: courseVal.className,
                                        semester: courseVal.semester,
                                        subject: sessionVal.name || '',
                                        unit: 'Legacy Session',
                                        dbPath: `courseCatalog/${courseId}/sessions/${sessionId}/lessons/${lessonId}`
                                    };
                                });
                            }
                        });
                    }
                });
            }

            // 2. Process Curriculum
            if (curriculum) {
                Object.entries(curriculum).forEach(([lessonId, lessonVal]: [string, any]) => {
                    const courseKey = `${lessonVal.course}_${lessonVal.program}_${lessonVal.semester}`;
                    if (!courseMap[courseKey]) {
                        courseMap[courseKey] = {
                            id: courseKey,
                            title: lessonVal.course,
                            className: lessonVal.program,
                            semester: lessonVal.semester,
                            sessions: {}
                        };
                    }

                    const sessionKey = `${lessonVal.subject}_${lessonVal.unit}`;
                    if (!courseMap[courseKey].sessions) courseMap[courseKey].sessions = {};
                    if (!courseMap[courseKey].sessions![sessionKey]) {
                        courseMap[courseKey].sessions![sessionKey] = {
                            name: `${lessonVal.subject} - ${lessonVal.unit}`,
                            lessons: {}
                        };
                    }

                    if (!courseMap[courseKey].sessions![sessionKey].lessons) {
                        courseMap[courseKey].sessions![sessionKey].lessons = {};
                    }
                    courseMap[courseKey].sessions![sessionKey].lessons![lessonId] = {
                        id: lessonId,
                        name: lessonVal.lessonName,
                        type: lessonVal.type || 'HTML',
                        content: lessonVal.content || '',
                        resourceUrl: lessonVal.resourceUrl || '',
                        fileName: lessonVal.fileName || '',
                        test: lessonVal.test || null,
                        course: lessonVal.course,
                        program: lessonVal.program,
                        semester: lessonVal.semester,
                        subject: lessonVal.subject,
                        unit: lessonVal.unit,
                        dbPath: `curriculum/${lessonId}`
                    };
                });
            }

            setCourses(Object.values(courseMap));
        };

        const courseCatalogRef = ref(database, 'courseCatalog');
        const unsubCourses = onValue(courseCatalogRef, (snapshot) => {
            catalogData = snapshot.val();
            rebuildCatalog(catalogData, curriculumData);
        });

        const curriculumRef = ref(database, 'curriculum');
        const unsubCurriculum = onValue(curriculumRef, snap => {
            curriculumData = snap.val();
            rebuildCatalog(catalogData, curriculumData);
        });

        return () => {
            unsubCourses();
            unsubCurriculum();
        };
    }, []);

    // Get Auto-suggest distinct values
    const distinctCourses = Array.from(new Set(courses.map(c => c.title).filter(Boolean)));
    const distinctPrograms = Array.from(new Set(courses.map(c => c.className).filter(Boolean)));
    const distinctSemesters = Array.from(new Set(courses.map(c => c.semester).filter(Boolean)));
    const distinctSubjects = Array.from(new Set(courses.flatMap(c =>
        Object.values(c.sessions || {}).map(s => {
            const idx = s.name.indexOf(' - ');
            return idx !== -1 ? s.name.substring(0, idx) : s.name;
        })
    ).filter(Boolean)));
    const distinctUnits = Array.from(new Set(courses.flatMap(c =>
        Object.values(c.sessions || {}).map(s => {
            const idx = s.name.indexOf(' - ');
            return idx !== -1 ? s.name.substring(idx + 3) : s.name;
        })
    ).filter(Boolean)));

    const resetForm = () => {
        setFormData({
            courseName: '', program: '', semester: '', subject: '', unit: '', lessonName: '',
            lessonType: 'HTML', content: '', resourceUrl: ''
        });
        setCourseUpload(null);
        setCourseMode('create');
        setIncludeTest(false);
        setTestForm({
            level: 'lessonwise',
            title: '',
            questions: [{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]
        });
        setTempLessons([]);
        setEditingLessonId(null);
        setEditingOriginalLesson(null);
    };

    const addQuestion = () => {
        setTestForm(prev => ({
            ...prev,
            questions: [...prev.questions, { q: '', a: '', b: '', c: '', d: '', correct: 'a' }]
        }));
    };

    const addLessonToList = () => {
        if (!formData.lessonName.trim()) {
            alert('Please enter a Lesson Name first.');
            return;
        }
        if (courseMode === 'create' && !formData.content.trim() && !formData.resourceUrl.trim()) {
            alert('Please add lesson content or a resource URL.');
            return;
        }
        if (courseMode === 'upload' && !courseUpload) {
            alert('Please select a lesson file to upload.');
            return;
        }

        const newLesson: TempLesson = {
            id: Math.random().toString(36).substring(2, 9),
            lessonName: formData.lessonName.trim(),
            lessonType: formData.lessonType,
            content: courseMode === 'create' ? formData.content.trim() : '',
            resourceUrl: courseMode === 'create' ? formData.resourceUrl.trim() : '',
            uploadFile: courseMode === 'upload' ? courseUpload : null,
            includeTest,
            testForm: includeTest ? JSON.parse(JSON.stringify(testForm)) : null
        };

        setTempLessons(prev => [...prev, newLesson]);

        // Reset lesson specific form fields
        setFormData(prev => ({
            ...prev,
            lessonName: '',
            content: '',
            resourceUrl: ''
        }));
        setCourseUpload(null);
        setIncludeTest(false);
        setTestForm({
            level: 'lessonwise',
            title: '',
            questions: [{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]
        });
    };

    const removeLessonFromList = (id: string) => {
        setTempLessons(prev => prev.filter(lesson => lesson.id !== id));
    };

    const handleEditLesson = (lesson: any) => {
        setEditingLessonId(lesson.id);
        setEditingOriginalLesson(lesson);

        setFormData({
            courseName: lesson.course || '',
            program: lesson.program || '',
            semester: lesson.semester || '',
            subject: lesson.subject || '',
            unit: lesson.unit || '',
            lessonName: lesson.name || '',
            lessonType: lesson.type || 'HTML',
            content: lesson.content || '',
            resourceUrl: lesson.resourceUrl || ''
        });

        setIncludeTest(!!lesson.test);
        if (lesson.test) {
            setTestForm(lesson.test);
        } else {
            setTestForm({
                level: 'lessonwise',
                title: '',
                questions: [{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]
            });
        }

        setCourseMode(lesson.fileName ? 'upload' : 'create');
        setTempLessons([]);

        // Scroll to form view
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteLesson = async (lesson: any) => {
        if (!window.confirm(`Are you sure you want to delete the lesson "${lesson.name}"?`)) {
            return;
        }

        setLoading(true);
        try {
            await set(ref(database, lesson.dbPath), null);
            alert('Lesson deleted successfully.');
        } catch (err) {
            console.error(err);
            alert('Could not delete the lesson. Check database permissions.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. UPDATE MODE FLOW
        if (editingLessonId && editingOriginalLesson) {
            setLoading(true);
            try {
                let fileUrl = formData.resourceUrl;
                let fileName = editingOriginalLesson.fileName || '';

                if (courseMode === 'upload' && courseUpload) {
                    const safeFileName = courseUpload.name.replace(/[^a-zA-Z0-9._-]/g, '-');
                    const uploadRef = storageRef(storage, `course-lessons/${editingLessonId}/${Date.now()}-${safeFileName}`);
                    await uploadBytes(uploadRef, courseUpload);
                    fileUrl = await getDownloadURL(uploadRef);
                    fileName = courseUpload.name;
                }

                const updatedData: any = {
                    course: formData.courseName.trim(),
                    program: formData.program.trim(),
                    semester: formData.semester.trim(),
                    subject: formData.subject.trim(),
                    unit: formData.unit.trim(),
                    lessonName: formData.lessonName.trim(),
                    type: formData.lessonType,
                    content: courseMode === 'create' ? formData.content.trim() : '',
                    resourceUrl: fileUrl,
                    fileName,
                    updatedAt: new Date().toISOString(),
                    test: includeTest ? testForm : null
                };

                await set(ref(database, editingOriginalLesson.dbPath), updatedData);

                alert('Lesson updated successfully.');
                resetForm();
            } catch (err) {
                console.error(err);
                alert('Failed to update the lesson.');
            } finally {
                setLoading(false);
            }
            return;
        }

        // 2. CREATE MODE FLOW
        let lessonsToSave = [...tempLessons];

        if (lessonsToSave.length === 0 && formData.lessonName.trim()) {
            if (courseMode === 'create' && !formData.content.trim() && !formData.resourceUrl.trim()) {
                alert('Add lesson content or a resource URL.');
                return;
            }
            if (courseMode === 'upload' && !courseUpload) {
                alert('Select a lesson file to upload.');
                return;
            }

            lessonsToSave.push({
                id: 'draft',
                lessonName: formData.lessonName.trim(),
                lessonType: formData.lessonType,
                content: courseMode === 'create' ? formData.content.trim() : '',
                resourceUrl: courseMode === 'create' ? formData.resourceUrl.trim() : '',
                uploadFile: courseMode === 'upload' ? courseUpload : null,
                includeTest,
                testForm: includeTest ? testForm : null
            });
        }

        if (lessonsToSave.length === 0) {
            alert('Please add at least one lesson before saving.');
            return;
        }

        setLoading(true);
        try {
            for (const lesson of lessonsToSave) {
                const lessonRef = push(ref(database, `curriculum`));
                let fileUrl = lesson.resourceUrl;
                let fileName = '';

                if (lesson.uploadFile) {
                    const safeFileName = lesson.uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
                    const uploadRef = storageRef(storage, `course-lessons/${lessonRef.key}/${Date.now()}-${safeFileName}`);
                    await uploadBytes(uploadRef, lesson.uploadFile);
                    fileUrl = await getDownloadURL(uploadRef);
                    fileName = lesson.uploadFile.name;
                }

                await set(lessonRef, {
                    course: formData.courseName.trim(),
                    program: formData.program.trim(),
                    semester: formData.semester.trim(),
                    subject: formData.subject.trim(),
                    unit: formData.unit.trim(),
                    lessonName: lesson.lessonName,
                    type: lesson.lessonType,
                    content: lesson.content,
                    resourceUrl: fileUrl,
                    fileName,
                    createdAt: new Date().toISOString(),
                    test: lesson.includeTest ? lesson.testForm : null
                });
            }

            alert('Course curriculum successfully saved.');
            resetForm();
        } catch (err) {
            console.error(err);
            alert('Could not save curriculum. Check Firebase Storage and Database rules.');
        } finally {
            setLoading(false);
        }
    };

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getDriveId = (url: string) => {
        const match = url.match(/\/d\/([^/]+)/);
        return match ? match[1] : null;
    };

    const renderVideoPreview = () => {
        if (formData.lessonType !== 'Video' && courseMode !== 'upload') return null;

        if (courseMode === 'create' && formData.resourceUrl) {
            const ytId = getYoutubeId(formData.resourceUrl);
            if (ytId) {
                return (
                    <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden relative">
                        <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${ytId}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );
            }

            const driveId = getDriveId(formData.resourceUrl);
            if (driveId) {
                return (
                    <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden relative">
                        <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://drive.google.com/file/d/${driveId}/preview`}
                            allow="autoplay"
                        />
                    </div>
                );
            }

            return (
                <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden">
                    <video src={formData.resourceUrl} controls className="w-full h-full" />
                </div>
            );
        }

        if (courseMode === 'upload' && courseUpload && courseUpload.type.includes('video')) {
            const objUrl = URL.createObjectURL(courseUpload);
            return (
                <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden">
                    <video src={objUrl} controls className="w-full h-full" />
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {editingLessonId ? 'Modify Lesson & Curriculum' : 'Create Course & Curriculum'}
                    </h1>
                    <p className="text-slate-500 mt-1">Define the course hierarchy and upload lesson contents or video links.</p>
                </div>
            </div>

            <Card className="border-primary-200 bg-primary-50/30">
                <CardHeader>
                    <CardTitle>{editingLessonId ? 'Edit Lesson Mode' : 'Course Builder'}</CardTitle>
                    <p className="text-sm text-slate-500">Create or modify structural details: Course → Program → Semester → Subject → Unit → Lesson.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateCourse} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Course Name</label>
                                <Input required value={formData.courseName} onChange={e => setFormData({ ...formData, courseName: e.target.value })} placeholder="e.g. English Communication" list="courses-list" />
                                <datalist id="courses-list">
                                    {distinctCourses.map(item => <option key={item} value={item} />)}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Program / Class</label>
                                <Input required value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })} placeholder="e.g. BCA" list="programs-list" />
                                <datalist id="programs-list">
                                    {distinctPrograms.map(item => <option key={item} value={item} />)}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Semester</label>
                                <Input required value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} placeholder="e.g. Semester 1" list="semesters-list" />
                                <datalist id="semesters-list">
                                    {distinctSemesters.map(item => <option key={item} value={item} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Subject</label>
                                <Input required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Grammar" list="subjects-list" />
                                <datalist id="subjects-list">
                                    {distinctSubjects.map(item => <option key={item} value={item} />)}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Unit Name</label>
                                <Input required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g. Unit 1: Present Tense" list="units-list" />
                                <datalist id="units-list">
                                    {distinctUnits.map(item => <option key={item} value={item} />)}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Lesson Name</label>
                                <Input value={formData.lessonName} onChange={e => setFormData({ ...formData, lessonName: e.target.value })} placeholder="e.g. Intro to Verbs" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Lesson Type</label>
                            <select value={formData.lessonType} onChange={e => setFormData({ ...formData, lessonType: e.target.value })} className="h-10 w-full md:w-1/3 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                                <option value="HTML">Interactive / HTML</option>
                                <option value="Video">Video</option>
                                <option value="Document">Document / PDF</option>
                                <option value="Audio">Audio</option>
                                <option value="Link">External link</option>
                            </select>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" size="sm" variant={courseMode === 'create' ? 'primary' : 'outline'} onClick={() => setCourseMode('create')}>
                                    <FileText className="w-4 h-4 mr-2" /> Provide Resource URL
                                </Button>
                                <Button type="button" size="sm" variant={courseMode === 'upload' ? 'primary' : 'outline'} onClick={() => setCourseMode('upload')}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload lesson file
                                </Button>
                            </div>

                            {courseMode === 'create' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Resource URL (Youtube, Drive, Direct Link)</label>
                                        <Input type="url" value={formData.resourceUrl} onChange={e => setFormData({ ...formData, resourceUrl: e.target.value })} placeholder="https://..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Lesson Content (Optional)</label>
                                        <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} rows={5} placeholder="Write the instructions, lesson text, or HTML content for this lesson..." className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Lesson File</label>
                                    <input required={courseMode === 'upload' && !tempLessons.length && !editingLessonId} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mp3,.wav,.html,.htm" onChange={e => setCourseUpload(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100" />
                                    <p className="text-xs text-slate-500">Upload a resource. For videos, you will see a preview below if supported.</p>
                                </div>
                            )}

                            {renderVideoPreview()}
                        </div>

                        {/* Assessment / Test Section */}
                        <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-4 space-y-4">
                            <label className="flex items-center gap-2 font-medium text-slate-900 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-primary-600" checked={includeTest} onChange={e => setIncludeTest(e.target.checked)} />
                                Do you want to include a test?
                            </label>

                            {includeTest && (
                                <div className="pl-6 space-y-5 border-l-2 border-primary-200 mt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-wrap">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Test Level Type</label>
                                            <select value={testForm.level} onChange={e => setTestForm({ ...testForm, level: e.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                                                <option value="subjectwise">Subject-wise Test</option>
                                                <option value="unitwise">Unit-wise Test</option>
                                                <option value="lessonwise">Lesson-wise Test</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Test Title</label>
                                            <Input required={includeTest} value={testForm.title} onChange={e => setTestForm({ ...testForm, title: e.target.value })} placeholder="e.g. Vowels Quiz" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Questions</h3>
                                        {testForm.questions.map((q, qIndex) => (
                                            <div key={qIndex} className="p-4 bg-white border border-slate-200 rounded-lg relative">
                                                {testForm.questions.length > 1 && (
                                                    <button type="button" onClick={() => {
                                                        const newQ = [...testForm.questions];
                                                        newQ.splice(qIndex, 1);
                                                        setTestForm({ ...testForm, questions: newQ });
                                                    }} className="absolute top-3 right-3 text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500">Question {qIndex + 1}</label>
                                                        <Input required={includeTest} value={q.q} onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].q = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} placeholder="Enter the question text" className="mt-1" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input value={q.a} placeholder="Option A" onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].a = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} />
                                                        <Input value={q.b} placeholder="Option B" onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].b = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} />
                                                        <Input value={q.c} placeholder="Option C" onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].c = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} />
                                                        <Input value={q.d} placeholder="Option D" onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].d = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
                                                        <select value={q.correct} onChange={e => {
                                                            const newQ = [...testForm.questions];
                                                            newQ[qIndex].correct = e.target.value;
                                                            setTestForm({ ...testForm, questions: newQ });
                                                        }} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                                                            <option value="a">Option A</option>
                                                            <option value="b">Option B</option>
                                                            <option value="c">Option C</option>
                                                            <option value="d">Option D</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                                            <Plus className="w-4 h-4 mr-1" /> Add Question
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Lesson to list button */}
                        {!editingLessonId && (
                            <div className="flex justify-end border-t pt-4">
                                <Button type="button" onClick={addLessonToList} className="bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" /> Add Lesson to list ({tempLessons.length} added)
                                </Button>
                            </div>
                        )}

                        {/* Temp Lessons Drafted List */}
                        {tempLessons.length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-inner">
                                <h3 className="text-sm font-semibold text-slate-800">Lessons Drafted in this Unit ({tempLessons.length})</h3>
                                <div className="space-y-2">
                                    {tempLessons.map((lesson, idx) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">{idx + 1}. {lesson.lessonName}</span>
                                                <span className="text-xs text-slate-500">
                                                    Type: {lesson.lessonType}{' '}
                                                    {lesson.resourceUrl ? `· URL: ${lesson.resourceUrl}` : ''}{' '}
                                                    {lesson.uploadFile ? `· File: ${lesson.uploadFile.name}` : ''}{' '}
                                                    {lesson.includeTest ? `· Includes Test (${lesson.testForm?.questions?.length || 0} Qs)` : ''}
                                                </span>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={() => removeLessonFromList(lesson.id)} className="text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 border-t pt-4">
                            {editingLessonId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel Edit
                                </Button>
                            )}
                            {!editingLessonId && (
                                <Button type="button" variant="outline" onClick={resetForm}>Clear Form</Button>
                            )}
                            <Button type="submit" disabled={loading} className="bg-success-600 hover:bg-success-700 text-white font-semibold">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingLessonId ? 'Update Lesson' : 'Save Course Content'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Course Catalog Card */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Course Catalog</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Hover over any lesson inside structure to edit or delete it.</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {courses.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">No courses cataloged yet. Build curriculum to see them here.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {courses.map(course => {
                                const sessionCount = Object.keys(course.sessions || {}).length;
                                const lessonCount = Object.values(course.sessions || {}).reduce((total, session) => total + Object.keys(session.lessons || {}).length, 0);
                                const isExpanded = expandedCourse === course.id;
                                return (
                                    <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between">
                                                <h3 className="font-semibold text-slate-900 leading-tight">{course.title}</h3>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                    {course.className}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{course.semester}</p>

                                            {isExpanded && course.sessions && (
                                                <div className="mt-4 border-t pt-3 space-y-3 max-h-60 overflow-y-auto">
                                                    {Object.entries(course.sessions).map(([sessId, session]) => (
                                                        <div key={sessId} className="pl-2 border-l-2 border-primary-400">
                                                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                                <Layers className="w-3.5 h-3.5 text-primary-500" />
                                                                {session.name}
                                                            </p>
                                                            <ul className="mt-1.5 pl-1 space-y-1">
                                                                {Object.values(session.lessons || {}).map((les: any, lesIdx) => (
                                                                    <li key={lesIdx} className="flex justify-between items-center text-[11px] text-slate-600 hover:bg-slate-50 p-1.5 rounded transition-colors group">
                                                                        <span className="truncate pr-2 font-medium">{les.name}</span>
                                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleEditLesson(les)}
                                                                                className="text-primary-600 hover:text-primary-800 font-semibold"
                                                                                title="Edit Lesson"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <span className="text-slate-300">|</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteLesson(les)}
                                                                                className="text-error-600 hover:text-error-800 font-semibold"
                                                                                title="Delete Lesson"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-primary-600">
                                                {sessionCount} sessions · {lessonCount} lessons
                                            </span>
                                            <button
                                                onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                                className="text-xs text-slate-600 hover:text-primary-600 font-medium transition-colors"
                                            >
                                                {isExpanded ? 'Hide Details' : 'View Structure'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
