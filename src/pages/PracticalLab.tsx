import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Search, Filter, Play, Plus, BookOpen, Mic, CheckCircle } from 'lucide-react';
import { universitylessons as universityPracticals } from '../mockData';
import { useNavigate } from 'react-router-dom';

export default function PracticalLab() {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'teacher';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{role === 'student' ? 'My Practicals' : 'Practical Laboratory'}</h1>
          <p className="text-slate-500 mt-1">{role === 'student' ? 'Complete your assigned practical speaking sessions.' : 'Manage and evaluate speaking, listening, and reading laboratory sessions.'}</p>
        </div>
        {role !== 'student' && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Practical
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
          <CardTitle>University Practicals</CardTitle>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search practicals..." 
                className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universityPracticals.map(practical => (
                <TableRow key={practical.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-primary-50 text-primary-600 flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      {practical.title}
                    </div>
                  </TableCell>
                  <TableCell>{practical.course}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{practical.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={practical.status === 'Published' ? 'success' : 'warning'}>
                      {practical.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">{practical.studentsCompleted} / {practical.totalStudents}</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-success-500 rounded-full" 
                          style={{ width: `${(practical.studentsCompleted / practical.totalStudents) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {role !== 'student' && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/speaking-evaluation')}>
                        Evaluate
                      </Button>
                    )}
                    <Button variant="primary" size="sm" className={role !== 'student' ? "ml-2" : ""} onClick={() => navigate('/conversation-practice')}>
                      <Play className="w-4 h-4 mr-1" /> Start
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
