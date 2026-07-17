import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Building2, Plus, Mail, Lock, Loader2, CheckCircle2, XCircle, Calendar, BookPlus, Upload, FileText } from 'lucide-react';
import { database, storage } from '../lib/firebase';
import { ref, onValue, set, update, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';

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

export default function SuperAdminDashboard() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zapPayUpi, setZapPayUpi] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentRejectReq, setCurrentRejectReq] = useState<any>(null);
  const [courses, setCourses] = useState<CourseCatalog[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseMode, setCourseMode] = useState<'create' | 'upload'>('create');
  const [courseUpload, setCourseUpload] = useState<File | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    className: '',
    semester: '',
    sessionName: '',
    lessonName: '',
    lessonType: 'HTML',
    content: '',
    resourceUrl: ''
  });

  
  // Default to 1 year from now
  const defaultExpiry = new Date();
  defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: defaultExpiry.toISOString().split('T')[0]
  });

  useEffect(() => {
    const settingsRef = ref(database, 'settings/zapPayUpi');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      setZapPayUpi(snapshot.val() || '');
    });

    const institutionsRef = ref(database, 'users');
    const unsubscribe = onValue(institutionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const instList = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter(user => user.role === 'teacher'); // Using teacher role for Institute Admins
        setInstitutions(instList);
      } else {
        setInstitutions([]);
      }
    });

    const requestsRef = ref(database, 'licenseRequests');
    const unsubReq = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reqList = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setRequests(reqList.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
      } else {
        setRequests([]);
      }
    });

    const courseCatalogRef = ref(database, 'courseCatalog');
    const unsubCourses = onValue(courseCatalogRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCourses(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setCourses([]);
      }
    });

    return () => {
      unsubSettings();
      unsubscribe();
      unsubReq();
      unsubCourses();
    };
  }, []);

  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
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
        role: 'teacher', // Mapping to teacher dashboard
        createdAt: new Date().toISOString(),
        licenseStartDate: new Date(formData.startDate).toISOString(),
        licenseExpiry: new Date(formData.expiryDate).toISOString()
      });
      
      setShowAddForm(false);
      setFormData({ 
        name: '', 
        email: '', 
        password: '',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: defaultExpiry.toISOString().split('T')[0]
      });
    } catch (err: any) {
      alert(err.message || 'Error creating institution');
    } finally {
      setLoading(false);
    }
  };


  const handleSaveUpi = async () => {
    try {
      await set(ref(database, 'settings/zapPayUpi'), zapPayUpi);
      alert('Zap Pay UPI updated');
    } catch (err) {
      console.error(err);
      alert('Error updating UPI');
    }
  };

  const handleApproveRequest = async (req: any) => {
    try {
      // Find current expiry
      const inst = institutions.find(i => i.id === req.institutionId);
      let currentExpiry = inst?.licenseExpiry ? new Date(inst.licenseExpiry) : new Date();
      if (currentExpiry < new Date()) {
        currentExpiry = new Date();
      }
      
      if (req.duration && req.duration.includes('1_month')) {
        currentExpiry.setMonth(currentExpiry.getMonth() + 1);
      } else if (req.duration && req.duration.includes('3_months')) {
        currentExpiry.setMonth(currentExpiry.getMonth() + 3);
      } else if (req.duration && req.duration.includes('6_months')) {
        currentExpiry.setMonth(currentExpiry.getMonth() + 6);
      } else {
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      }

      // Update institution expiry and limits
      const updates: any = {
        licenseExpiry: currentExpiry.toISOString()
      };
      if (req.studentLimit) {
        updates.studentLimit = req.studentLimit;
      }
      
      await update(ref(database, 'users/' + req.institutionId), updates);

      // Update request status
      await update(ref(database, 'licenseRequests/' + req.id), {
        status: 'approved',
        processedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      alert('Error approving request');
    }
  };

  const handleRejectRequest = (req: any) => {
    setCurrentRejectReq(req);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitRejectRequest = async () => {
    if (!currentRejectReq) return;
    try {
      await update(ref(database, 'licenseRequests/' + currentRejectReq.id), {
        status: 'rejected',
        reason: rejectReason,
        processedAt: new Date().toISOString()
      });
      setShowRejectModal(false);
      setCurrentRejectReq(null);
    } catch (err) {
      console.error(err);
      alert('Error rejecting request');
    }
  };

  const resetCourseForm = () => {
    setCourseForm({
      title: '',
      className: '',
      semester: '',
      sessionName: '',
      lessonName: '',
      lessonType: 'HTML',
      content: '',
      resourceUrl: ''
    });
    setCourseUpload(null);
    setCourseMode('create');
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (courseMode === 'create' && !courseForm.content.trim() && !courseForm.resourceUrl.trim()) {
      alert('Add lesson content or a resource URL.');
      return;
    }
    if (courseMode === 'upload' && !courseUpload) {
      alert('Select a lesson file to upload.');
      return;
    }

    setCourseSaving(true);
    try {
      const normalise = (value: string) => value.trim().toLowerCase();
      const existingCourse = courses.find(course =>
        normalise(course.title) === normalise(courseForm.title) &&
        normalise(course.className) === normalise(courseForm.className) &&
        normalise(course.semester) === normalise(courseForm.semester)
      );
      const courseId = existingCourse?.id || push(ref(database, 'courseCatalog')).key;
      if (!courseId) throw new Error('Could not create the course. Please try again.');

      if (!existingCourse) {
        await set(ref(database, `courseCatalog/${courseId}`), {
          title: courseForm.title.trim(),
          className: courseForm.className.trim(),
          semester: courseForm.semester.trim(),
          createdAt: new Date().toISOString()
        });
      }

      const existingSession = Object.entries(existingCourse?.sessions || {}).find(([, session]) =>
        normalise((session as CourseSession).name) === normalise(courseForm.sessionName)
      );
      const sessionId = existingSession?.[0] || push(ref(database, `courseCatalog/${courseId}/sessions`)).key;
      if (!sessionId) throw new Error('Could not create the session. Please try again.');

      if (!existingSession) {
        await set(ref(database, `courseCatalog/${courseId}/sessions/${sessionId}`), {
          name: courseForm.sessionName.trim(),
          createdAt: new Date().toISOString()
        });
      }

      const lessonRef = push(ref(database, `courseCatalog/${courseId}/sessions/${sessionId}/lessons`));
      let fileUrl = '';
      let fileName = '';
      if (courseUpload) {
        const safeFileName = courseUpload.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const uploadRef = storageRef(storage, `course-lessons/${courseId}/${Date.now()}-${safeFileName}`);
        await uploadBytes(uploadRef, courseUpload);
        fileUrl = await getDownloadURL(uploadRef);
        fileName = courseUpload.name;
      }

      await set(lessonRef, {
        name: courseForm.lessonName.trim(),
        type: courseForm.lessonType,
        content: courseMode === 'create' ? courseForm.content.trim() : '',
        resourceUrl: courseMode === 'create' ? courseForm.resourceUrl.trim() : fileUrl,
        fileName,
        className: courseForm.className.trim(),
        semester: courseForm.semester.trim(),
        sessionName: courseForm.sessionName.trim(),
        createdAt: new Date().toISOString()
      });

      alert('Lesson added to the course catalog. Teachers can now assign it from Assessments.');
      resetCourseForm();
      setShowCourseForm(false);
    } catch (err) {
      console.error(err);
      alert('Could not save the lesson. Check Firebase Database and Storage permissions, then try again.');
    } finally {
      setCourseSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="flex-1 max-w-md space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Zap Pay UPI ID</label>
            <Input value={zapPayUpi} onChange={e => setZapPayUpi(e.target.value)} placeholder="e.g. admin@upi" />
          </div>
          <Button onClick={handleSaveUpi}>Save UPI ID</Button>
        </CardContent>
      </Card>

      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Reason for Rejection</label>
                <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." required />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                <Button onClick={submitRejectRequest} className="bg-error-600 hover:bg-error-700 text-white">Reject</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage Institute Admins (Teachers) and Licenses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setShowCourseForm(true)}>
            <BookPlus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Institute Admin
          </Button>
        </div>
      </div>

      {showCourseForm && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle>Create Course & Add Lesson</CardTitle>
            <p className="text-sm text-slate-500">Create the course structure in order: class/semester, session, then lesson. Existing class, semester, and session values are reused when adding another lesson.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourse} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Course / Subject</label>
                  <Input required value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. English Communication" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Class / Programme</label>
                  <Input required value={courseForm.className} onChange={e => setCourseForm({ ...courseForm, className: e.target.value })} placeholder="e.g. BCA" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Semester</label>
                  <Input required value={courseForm.semester} onChange={e => setCourseForm({ ...courseForm, semester: e.target.value })} placeholder="e.g. Semester 1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Session / Unit</label>
                  <Input required value={courseForm.sessionName} onChange={e => setCourseForm({ ...courseForm, sessionName: e.target.value })} placeholder="e.g. Phonetics: Consonants" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Lesson Name</label>
                  <Input required value={courseForm.lessonName} onChange={e => setCourseForm({ ...courseForm, lessonName: e.target.value })} placeholder="e.g. Vowel and diphthong practice" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Lesson Type</label>
                  <select value={courseForm.lessonType} onChange={e => setCourseForm({ ...courseForm, lessonType: e.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="HTML">Interactive / HTML</option>
                    <option value="Video">Video</option>
                    <option value="Document">Document / PDF</option>
                    <option value="Audio">Audio</option>
                    <option value="Link">External link</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={courseMode === 'create' ? 'primary' : 'outline'} onClick={() => setCourseMode('create')}>
                    <FileText className="w-4 h-4 mr-2" /> Create lesson
                  </Button>
                  <Button type="button" size="sm" variant={courseMode === 'upload' ? 'primary' : 'outline'} onClick={() => setCourseMode('upload')}>
                    <Upload className="w-4 h-4 mr-2" /> Upload lesson file
                  </Button>
                </div>

                {courseMode === 'create' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Lesson Content</label>
                      <textarea value={courseForm.content} onChange={e => setCourseForm({ ...courseForm, content: e.target.value })} rows={5} placeholder="Write the instructions, lesson text, or HTML content for this lesson..." className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Resource URL <span className="text-slate-400">(optional)</span></label>
                      <Input type="url" value={courseForm.resourceUrl} onChange={e => setCourseForm({ ...courseForm, resourceUrl: e.target.value })} placeholder="https://..." />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Lesson File</label>
                    <input required type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mp3,.wav,.html,.htm" onChange={e => setCourseUpload(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100" />
                    <p className="text-xs text-slate-500">Upload a document, audio, video, or HTML lesson. The file is saved in Firebase Storage.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { resetCourseForm(); setShowCourseForm(false); }}>Cancel</Button>
                <Button type="submit" disabled={courseSaving}>
                  {courseSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Lesson to Catalog
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Course Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-slate-500">No courses yet. Create a course to make lessons available in the teacher Assessments page.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map(course => {
                const sessionCount = Object.keys(course.sessions || {}).length;
                const lessonCount = Object.values(course.sessions || {}).reduce((total, session) => total + Object.keys(session.lessons || {}).length, 0);
                return (
                  <div key={course.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{course.className} · {course.semester}</p>
                    <p className="mt-3 text-xs font-medium text-primary-700">{sessionCount} session{sessionCount === 1 ? '' : 's'} · {lessonCount} lesson{lessonCount === 1 ? '' : 's'}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="border-primary-100 bg-primary-50/30">
          <CardHeader>
            <CardTitle>Add New Institute Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddInstitution} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Admin/Institute Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} icon={<Building2 className="w-4 h-4 text-slate-400" />} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email (Login)</label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} icon={<Mail className="w-4 h-4 text-slate-400" />} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} icon={<Lock className="w-4 h-4 text-slate-400" />} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">License Start Date</label>
                  <Input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} icon={<Calendar className="w-4 h-4 text-slate-400" />} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">License Expiry Date</label>
                  <Input type="date" required value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} icon={<Calendar className="w-4 h-4 text-slate-400" />} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>License Renewal Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">No requests found.</TableCell>
                </TableRow>
              ) : (
                requests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium text-slate-900">{req.institutionName}</TableCell>
                    <TableCell className="text-slate-600 capitalize">{(req.duration || '1_year').replace('_', ' ')}</TableCell>
                    <TableCell className="text-slate-600">₹{req.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-500">{new Date(req.requestDate).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      <div><span className="font-medium text-slate-700">UTR:</span> {req.transactionId || 'N/A'}</div>
                      {req.paymentName && <div><span className="font-medium text-slate-700">Name:</span> {req.paymentName}</div>}
                      {req.paymentSenderUpi && <div><span className="font-medium text-slate-700">UPI:</span> {req.paymentSenderUpi}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        req.status === 'pending' ? "bg-amber-50 text-amber-700 ring-amber-600/20" : 
                        req.status === 'approved' ? "bg-success-50 text-success-700 ring-success-600/20" : 
                        "bg-error-50 text-error-700 ring-error-600/20"
                      )}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-success-600 hover:bg-success-700 text-white"><CheckCircle2 className="w-4 h-4 mr-1"/> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectRequest(req)} className="text-error-600 hover:text-error-700 hover:bg-error-50"><XCircle className="w-4 h-4 mr-1"/> Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Institutions (Teachers)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution Name</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-8">No institutions found.</TableCell>
                </TableRow>
              ) : (
                institutions.map(inst => {
                  const isExpired = inst.licenseExpiry ? new Date(inst.licenseExpiry) < new Date() : true;
                  return (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium text-slate-900">{inst.name}</TableCell>
                      <TableCell className="text-slate-600">{inst.email}</TableCell>
                      <TableCell className="text-slate-500">{inst.licenseExpiry ? new Date(inst.licenseExpiry).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                          isExpired ? "bg-error-50 text-error-700 ring-error-600/20" : "bg-success-50 text-success-700 ring-success-600/20"
                        )}>
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
