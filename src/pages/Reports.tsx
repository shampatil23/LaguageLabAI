import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, Printer, Filter } from 'lucide-react';
import { studentPerformanceData } from '../mockData';

export default function Reports() {
  const role = localStorage.getItem('userRole') || 'teacher';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{role === 'student' ? 'My Progress' : 'Analytics & Reports'}</h1>
          <p className="text-slate-500 mt-1">{role === 'student' ? 'Track your language learning journey.' : 'Generate comprehensive reports for students and departments.'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Printer className="w-4 h-4 mr-2"/> Print</Button>
          <Button variant="outline"><FileDown className="w-4 h-4 mr-2"/> Export Excel</Button>
          <Button><FileDown className="w-4 h-4 mr-2"/> Export PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{role === 'student' ? 'My Skill Progress' : 'Department Overall Performance'}</CardTitle>
            <Button variant="ghost" size="sm"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={studentPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="speaking" name="Speaking" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="listening" name="Listening" fill="#10b981" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {role !== 'student' && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Students</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 1, name: 'Emma Watson', course: 'FRE201', score: 94 },
                    { id: 2, name: 'David Smith', course: 'ENG101', score: 92 },
                    { id: 3, name: 'Sophia Martinez', course: 'SPA101', score: 91 },
                    { id: 4, name: 'Michael Chang', course: 'ENG101', score: 88 },
                    { id: 5, name: 'Olivia Johnson', course: 'GER301', score: 87 },
                  ].map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-slate-500">{student.course}</TableCell>
                      <TableCell className="text-right font-semibold text-success-600">{student.score}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
