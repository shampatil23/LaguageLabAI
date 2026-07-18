import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Folder, FileVideo, FileAudio, FileText, FileSpreadsheet, Upload, Download, Loader2, BookOpen } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { auth, database } from '../lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';

const folders = [
  { id: '1', name: 'Grammar Modules', count: 24, color: 'text-blue-500 bg-blue-50' },
  { id: '2', name: 'Vocabulary Lists', count: 18, color: 'text-emerald-500 bg-emerald-50' },
  { id: '3', name: 'Speaking Practice', count: 32, color: 'text-purple-500 bg-purple-50' },
  { id: '4', name: 'Listening Audio', count: 45, color: 'text-amber-500 bg-amber-50' },
];

const getIcon = (type: string) => {
  if (type.includes('video')) return <FileVideo className="w-8 h-8 text-rose-500" />;
  if (type.includes('audio')) return <FileAudio className="w-8 h-8 text-purple-500" />;
  if (type.includes('pdf')) return <FileText className="w-8 h-8 text-blue-500" />;
  return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
};

export default function ContentLibrary() {
  const [files, setFiles] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Fetch ALL files (uploaded by super admin or anyone)
    const filesRef = ref(database, 'files');
    const unsubscribeFiles = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const fileList = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setFiles(fileList.reverse());
      } else {
        setFiles([]);
      }
    });

    // 2. Fetch ALL courses (for display — including super admin created ones)
    const allCoursesRef = ref(database, 'courses');
    const unsubAllCourses = onValue(allCoursesRef, snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }));
        setAllCourses(list);
      } else {
        setAllCourses([]);
      }
    });

    return () => {
      unsubscribeFiles();
      unsubAllCourses();
    };
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(selectedFile);
      const newFileRef = push(ref(database, 'files'));
      await set(newFileRef, {
        name: selectedFile.name,
        type: selectedFile.type,
        size: (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB',
        date: new Date().toISOString().split('T')[0],
        url: url
      });
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredFiles = searchQuery
    ? files.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  // Combined recent: recent files + recent courses sorted by date
  const recentCourseItems = allCourses.map(c => ({
    id: `course-${c.id}`,
    name: c.title,
    type: 'course',
    size: c.code || 'Course',
    date: c.createdAt ? c.createdAt.split('T')[0] : '',
    url: null,
    isCourse: true
  }));

  const combinedRecent = [
    ...filteredFiles.map(f => ({ ...f, isCourse: false })),
    ...recentCourseItems
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db2 = b.date ? new Date(b.date).getTime() : 0;
    return db2 - da;
  }).slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Content Library</h1>
          <p className="text-slate-500 mt-1">Manage shared resources, multimedia, and documents.</p>
        </div>
        <div className="flex gap-3">
          <div className="w-64">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Button onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
        </div>
      </div>

      {/* Folders section */}
      <h2 className="text-lg font-medium text-slate-800 mt-8 mb-4">Folders</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {folders.map(folder => {
          const matchedFiles = files.filter(f => {
            if (folder.name.includes('Grammar') || folder.name.includes('Vocabulary')) return f.type?.includes('pdf') || f.type?.includes('document') || f.type?.includes('text');
            if (folder.name.includes('Speaking') || folder.name.includes('Audio')) return f.type?.includes('audio') || f.type?.includes('video');
            return false;
          });
          const displayCount = matchedFiles.length > 0 ? matchedFiles.length : folder.count;
          return (
            <Card key={folder.id} className="hover:border-primary-300 transition-colors cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${folder.color}`}>
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">{folder.name}</h3>
                  <p className="text-xs text-slate-500">{displayCount} files</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All uploaded content (super admin files) */}
      {files.length > 0 && (
        <>
          <h2 className="text-lg font-medium text-slate-800 mt-8 mb-4">All Uploaded Content</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filteredFiles.slice(0, 8).map(file => (
              <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => file.url && window.open(file.url, "_blank")}>
                <CardContent className="p-5 relative">
                  {file.url && (
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex justify-center my-6">{getIcon(file.type)}</div>
                  <h3 className="font-medium text-sm text-slate-800 truncate" title={file.name}>{file.name}</h3>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{file.size}</span>
                    <span>{file.date}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Course Library — all courses (teacher + super admin created) */}
      {allCourses.length > 0 && (
        <>
          <h2 className="text-lg font-medium text-slate-800 mt-8 mb-4">Course Library</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {allCourses.map(course => (
              <Card key={course.id} className="hover:border-primary-300 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-primary-500 bg-primary-50">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">{course.title}</h3>
                    <p className="text-xs text-slate-500">{course.code || 'ENG101'} · {course.status || 'Draft'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Recent Files: combined uploaded files + recently created courses */}
      <h2 className="text-lg font-medium text-slate-800 mt-8 mb-4">Recent Files</h2>
      {combinedRecent.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files or courses yet. Upload a file or create a course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {combinedRecent.map((item: any) => (
            item.isCourse ? (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5 relative">
                  <div className="flex justify-center my-6">
                    <BookOpen className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="font-medium text-sm text-slate-800 truncate" title={item.name}>{item.name}</h3>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{item.size}</span>
                    <span>{item.date}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => item.url && window.open(item.url, "_blank")}>
                <CardContent className="p-5 relative">
                  {item.url && (
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex justify-center my-6">{getIcon(item.type)}</div>
                  <h3 className="font-medium text-sm text-slate-800 truncate" title={item.name}>{item.name}</h3>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{item.size}</span>
                    <span>{item.date}</span>
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}
    </div>
  );
}
