import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Communication() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages & Announcements</h1>
        <p className="text-slate-500 mt-1">Communicate with your classes and students.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-10">No new messages.</div>
        </CardContent>
      </Card>
    </div>
  );
}
