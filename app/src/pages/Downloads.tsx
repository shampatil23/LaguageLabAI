import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Downloads() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Downloads Center</h1>
        <p className="text-slate-500 mt-1">Access offline resources and software tools.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Available Software</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-10">Language Lab AI Offline Client - v4.2.1</div>
        </CardContent>
      </Card>
    </div>
  );
}
