import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

export default function TeachersList() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Teachers & Instructors</h1>
        <p className="text-slate-500 mt-1">Manage teaching staff.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Staff Directory</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Classes</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>Sarah Jenkins</TableCell><TableCell>Linguistics & Modern Languages</TableCell><TableCell>ENG101, FRE201</TableCell></TableRow>
              <TableRow><TableCell>Robert Fox</TableCell><TableCell>Modern Languages</TableCell><TableCell>SPA101, GER301</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
