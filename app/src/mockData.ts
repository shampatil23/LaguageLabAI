export const currentUser = {
  id: 'u1',
  name: 'Sarah Jenkins',
  email: 's.jenkins@university.edu',
  role: 'teacher',
  department: 'Linguistics & Modern Languages'
};

export const institutionData = {
  name: 'Global States University',
  totalStudents: 14500,
  totalTeachers: 450,
  activeLabs: 24,
  licenseStatus: 'Active - Expires Dec 2026',
  softwareVersion: 'v4.2.1 Enterprise'
};

export const currentClasses = [
  { id: 'c1', name: 'ENG101 - Conversational English', time: '09:00 AM - 10:30 AM', students: 42, room: 'Lab A' },
  { id: 'c2', name: 'FRE201 - Intermediate French', time: '11:00 AM - 12:30 PM', students: 28, room: 'Lab C' },
  { id: 'c3', name: 'SPA101 - Beginner Spanish', time: '02:00 PM - 03:30 PM', students: 35, room: 'Lab B' },
];

export const recentActivities = [
  { id: 'a1', student: 'Michael Chang', action: 'completed speaking lesson', course: 'ENG101', time: '10 mins ago', score: 85 },
  { id: 'a2', student: 'Emma Watson', action: 'submitted writing assignment', course: 'FRE201', time: '1 hour ago', score: null },
  { id: 'a3', student: 'David Smith', action: 'logged in', course: 'N/A', time: '2 hours ago', score: null },
  { id: 'a4', student: 'Sophia Martinez', action: 'completed listening quiz', course: 'SPA101', time: '3 hours ago', score: 92 },
];

export const studentPerformanceData = [
  { name: 'Mon', speaking: 75, listening: 82, writing: 68 },
  { name: 'Tue', speaking: 78, listening: 84, writing: 70 },
  { name: 'Wed', speaking: 82, listening: 85, writing: 72 },
  { name: 'Thu', speaking: 80, listening: 83, writing: 75 },
  { name: 'Fri', speaking: 85, listening: 88, writing: 78 },
];

export const radarData = [
  { subject: 'Grammar', A: 85, fullMark: 100 },
  { subject: 'Vocabulary', A: 78, fullMark: 100 },
  { subject: 'Reading', A: 86, fullMark: 100 },
  { subject: 'Listening', A: 92, fullMark: 100 },
  { subject: 'Speaking', A: 74, fullMark: 100 },
  { subject: 'Writing', A: 80, fullMark: 100 },
];

export const universitylessons = [
  { id: 'p1', title: 'Airport Check-in Conversation', level: 'Intermediate', course: 'ENG101', status: 'Published', studentsCompleted: 35, totalStudents: 42 },
  { id: 'p2', title: 'Hotel Reservation Dialogue', level: 'Beginner', course: 'SPA101', status: 'Draft', studentsCompleted: 0, totalStudents: 35 },
  { id: 'p3', title: 'Job Interview Simulation', level: 'Advanced', course: 'ENG301', status: 'Published', studentsCompleted: 20, totalStudents: 25 },
  { id: 'p4', title: 'Ordering Food in Paris', level: 'Beginner', course: 'FRE201', status: 'Published', studentsCompleted: 28, totalStudents: 28 },
];
