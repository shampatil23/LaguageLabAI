import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Advanced Analytics</h1>
        <p className="text-slate-500 mt-1">Deep dive into institution-wide performance.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Institution Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-10">Advanced analytics charts will load here.</div>
        </CardContent>
      </Card>
    </div>
  );
}
