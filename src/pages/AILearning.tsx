import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BrainCircuit } from 'lucide-react';

export default function AILearning() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Learning Models</h1>
        <p className="text-slate-500 mt-1">Manage AI evaluation criteria and practice scenarios.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5"/> AI Status</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-10">AI Evaluation Engine is fully operational.</div>
        </CardContent>
      </Card>
    </div>
  );
}
