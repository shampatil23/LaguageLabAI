import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Play, Pause, SkipBack, SkipForward, Mic, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SpeakingEvaluation() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Speaking Evaluation: Airport Check-in</h1>
          <p className="text-slate-500 mt-1">Student: <strong className="text-slate-700">Michael Chang</strong> (ENG101) • Submitted: Today, 10:45 AM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Audio Recording</CardTitle>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2"/> Download</Button>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 flex flex-col items-center justify-center mb-6">
                <div className="w-full flex items-center justify-center gap-1 h-24 mb-6">
                  {/* Mock Waveform */}
                  {Array.from({length: 40}).map((_, i) => (
                    <div key={i} className="w-1.5 bg-primary-300 rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-2 text-slate-500 hover:text-slate-900"><SkipBack className="w-5 h-5"/></button>
                  <button className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 shadow-md">
                    <Play className="w-5 h-5 ml-1"/>
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-900"><SkipForward className="w-5 h-5"/></button>
                </div>
                <div className="w-full max-w-md mt-4">
                  <div className="flex justify-between text-xs text-slate-400 font-medium mb-1">
                    <span>0:14</span>
                    <span>1:42</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 w-1/4 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-slate-800">Automated AI Transcript</h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed text-sm">
                  <p><span className="font-semibold text-slate-900">Agent:</span> Good morning. Can I have your ticket and passport, please?</p>
                  <p className="mt-2"><span className="font-semibold text-primary-700">Michael:</span> Good morning. Yes, here <span className="bg-warning-100 border-b-2 border-warning-400 text-warning-900 px-1 rounded">they is</span>. I mean, here they are.</p>
                  <p className="mt-2"><span className="font-semibold text-slate-900">Agent:</span> Thank you. Are you checking any bags?</p>
                  <p className="mt-2"><span className="font-semibold text-primary-700">Michael:</span> Yes, I have one suitcase to check and one carry-on bag.</p>
                  <p className="mt-2"><span className="font-semibold text-slate-900">Agent:</span> Did you pack your bags yourself?</p>
                  <p className="mt-2"><span className="font-semibold text-primary-700">Michael:</span> Yes, I did. Nobody <span className="bg-danger-100 border-b-2 border-danger-400 text-danger-900 px-1 rounded">don't touch</span> them.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>AI Evaluation Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-600 font-medium">Overall Score</span>
                <span className="text-3xl font-bold text-primary-600">78<span className="text-lg text-slate-400">/100</span></span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-slate-700">Pronunciation</span>
                    <span className="text-slate-900">85%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-success-500 w-[85%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-slate-700">Grammar</span>
                    <span className="text-slate-900">65%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-warning-500 w-[65%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-slate-700">Fluency</span>
                    <span className="text-slate-900">80%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 w-[80%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-slate-700">Vocabulary</span>
                    <span className="text-slate-900">75%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-400 w-[75%] rounded-full"></div></div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-warning-50 border border-warning-200 rounded-md flex gap-3 text-sm text-warning-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Grammar issues detected with subject-verb agreement and double negatives.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teacher Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Final Score</label>
                  <input type="number" defaultValue={78} className="w-full rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks / Feedback</label>
                  <textarea rows={4} className="w-full rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500" defaultValue={"Good pronunciation, Michael! However, please review the rules for double negatives and basic subject-verb agreement. Keep practicing!"}></textarea>
                </div>
                <Button className="w-full">Submit Final Evaluation</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
