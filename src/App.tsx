import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import PracticalLab from './pages/PracticalLab';
import CourseManagement from './pages/CourseManagement';
import ContentLibrary from './pages/ContentLibrary';
import Assessments from './pages/Assessments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SpeakingEvaluation from './pages/SpeakingEvaluation';
import ConversationPractice from './pages/ConversationPractice';
import StudentDashboard from './pages/StudentDashboard';
import StudentsList from './pages/StudentsList';
import TeachersList from './pages/TeachersList';
import Communication from './pages/Communication';
import Analytics from './pages/Analytics';
import Downloads from './pages/Downloads';
import AILearning from './pages/AILearning';

const DashboardRouter = () => {
  const role = localStorage.getItem('userRole');
  if (role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
  return <TeacherDashboard />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/institutions" element={<SuperAdminDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
                    <Route path="/courses" element={<CourseManagement />} />
          <Route path="/content-library" element={<ContentLibrary />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/speaking-evaluation" element={<SpeakingEvaluation />} />
          <Route path="/conversation-practice" element={<ConversationPractice />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/students" element={<StudentsList />} />
                    <Route path="/teachers" element={<TeachersList />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/ai-learning" element={<AILearning />} />

          {/* Fallbacks */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
