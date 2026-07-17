import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mic, MicOff, AlertCircle, Bot, User, Send, Loader2, FileText, CheckCircle, XCircle, AlertTriangle, Plus, X, ChevronRight, BarChart2, BookOpen, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'ai' | 'user' | 'system';
  text: string;
}

interface Report {
  topic: string;
  pros: string[];
  cons: string[];
  improvements: string[];
  grammarCorrections: { original: string; corrected: string; explanation: string }[];
  overallScore: number;
  summary: string;
}

const TOPICS = [
  { id: 'airport', label: '✈️ Airport Check-in', system: 'You are a helpful airline check-in agent. Keep your responses short and natural for language practice. Help the user practice conversational English at an airport check-in desk.', opener: "Hello! Welcome to Global Airlines. May I have your ticket and passport, please?" },
  { id: 'restaurant', label: '🍽️ Restaurant Order', system: 'You are a polite restaurant waiter. Guide the user through ordering a meal. Keep responses short and natural for English language practice.', opener: "Good evening! Welcome to La Bella Restaurant. My name is Marco, I'll be your server today. Can I start you off with something to drink?" },
  { id: 'job_interview', label: '💼 Job Interview', system: 'You are a professional hiring manager conducting a job interview in English. Ask relevant interview questions one at a time, keep it conversational and constructive for language practice.', opener: "Good morning! Thank you for coming in today. Let's start with a simple question — could you tell me a little bit about yourself?" },
  { id: 'hotel', label: '🏨 Hotel Check-in', system: 'You are a friendly hotel receptionist. Help the user practice checking into a hotel in English. Keep responses natural and concise.', opener: "Welcome to the Grand Park Hotel! Do you have a reservation with us today?" },
  { id: 'doctor', label: '🏥 Doctor Visit', system: 'You are a friendly general practitioner doctor. Help the user practice describing symptoms and understanding medical advice in English. Keep it simple and supportive.', opener: "Good morning! I'm Dr. Smith. What brings you in today? How are you feeling?" },
  { id: 'shopping', label: '🛍️ Shopping', system: 'You are a helpful retail store assistant. Help the user practice shopping conversations in English, including asking for sizes, prices, and recommendations.', opener: "Hi there! Welcome to StylePlus. Can I help you find something today?" },
];

export default function ConversationPractice() {
  const [phase, setPhase] = useState<'select' | 'chat' | 'report'>('select');
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [conversation, setConversation] = useState<Message[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const startSession = (topic: typeof TOPICS[0]) => {
    setSelectedTopic(topic);
    setConversation([
      { role: 'system', text: topic.system },
      { role: 'ai', text: topic.opener },
    ]);
    setPhase('chat');
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: inputText.trim() };
    const updatedConv = [...conversation, userMessage];
    setConversation(updatedConv);
    setInputText('');
    setIsLoading(true);

    try {
      const messagesForApi = updatedConv.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.text,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi }),
      });

      const data = await response.json();
      if (response.ok) {
        setConversation(prev => [...prev, { role: 'ai', text: data.result }]);
      } else {
        setConversation(prev => [...prev, { role: 'ai', text: '⚠️ Could not connect to AI. Please try again.' }]);
      }
    } catch {
      setConversation(prev => [...prev, { role: 'ai', text: '⚠️ Network error. Please check your connection.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    const userMessages = conversation.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      setPhase('select');
      setSelectedTopic(null);
      return;
    }

    setIsGeneratingReport(true);
    setPhase('report');

    const conversationText = conversation
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'ai' ? 'AI' : 'Student'}: ${m.text}`)
      .join('\n');

    const reportPrompt = `You are an expert English language teacher. Analyze the following English conversation practice session and generate a detailed report in strict JSON format.

Topic: ${selectedTopic?.label}
Conversation:
${conversationText}

Generate a JSON report with EXACTLY this structure:
{
  "topic": "Topic name",
  "pros": ["strength 1", "strength 2", "strength 3"],
  "cons": ["weakness 1", "weakness 2"],
  "improvements": ["improvement tip 1", "improvement tip 2", "improvement tip 3"],
  "grammarCorrections": [
    { "original": "incorrect sentence from student", "corrected": "correct version", "explanation": "why this is wrong" }
  ],
  "overallScore": 75,
  "summary": "2-3 sentence overall assessment"
}

Base the analysis on the student's actual messages. If no grammar errors exist, return empty array for grammarCorrections. Return ONLY the JSON object, nothing else.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an expert English language teacher who generates detailed conversation analysis reports in JSON format.' },
            { role: 'user', content: reportPrompt }
          ]
        }),
      });

      const data = await response.json();
      if (response.ok && data.result) {
        try {
          // Extract JSON from the response
          const jsonMatch = data.result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setReport(parsed);
          } else {
            throw new Error('No JSON found');
          }
        } catch {
          setReport({
            topic: selectedTopic?.label || 'Practice Session',
            pros: ['You engaged in conversation practice', 'You attempted to communicate in English'],
            cons: ['Report generation encountered an issue'],
            improvements: ['Continue practicing regularly', 'Focus on vocabulary expansion'],
            grammarCorrections: [],
            overallScore: 60,
            summary: 'Session completed. Keep practicing to improve your English communication skills.'
          });
        }
      }
    } catch {
      setReport({
        topic: selectedTopic?.label || 'Practice Session',
        pros: ['Session completed'],
        cons: ['Could not generate detailed report'],
        improvements: ['Try again with a stable connection'],
        grammarCorrections: [],
        overallScore: 50,
        summary: 'Session ended. Please try again for a detailed report.'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewSession = () => {
    setPhase('select');
    setSelectedTopic(null);
    setConversation([]);
    setReport(null);
    setInputText('');
  };

  // ─── TOPIC SELECTION PHASE ─────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">AI Conversation Practice</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Choose a topic to practice real-world English conversations with AI. A detailed report will be generated at the end.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Choose a Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPICS.map(topic => (
              <button
                key={topic.id}
                onClick={() => startSession(topic)}
                className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{topic.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{topic.opener}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <h3 className="font-bold text-indigo-800 text-sm mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" /> How it works
          </h3>
          <ul className="text-xs text-indigo-700 space-y-1.5">
            <li className="flex items-start gap-2"><span className="font-bold text-indigo-500 mt-0.5">1.</span> Select a real-world scenario to practice</li>
            <li className="flex items-start gap-2"><span className="font-bold text-indigo-500 mt-0.5">2.</span> Chat with the AI in English — it will respond naturally</li>
            <li className="flex items-start gap-2"><span className="font-bold text-indigo-500 mt-0.5">3.</span> End the session to receive a full report with pros, cons, grammar corrections, and improvement tips</li>
          </ul>
        </div>
      </div>
    );
  }

  // ─── REPORT PHASE ─────────────────────────────────────────────────────────
  if (phase === 'report') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Session Report</h1>
            <p className="text-slate-500 text-sm">{selectedTopic?.label}</p>
          </div>
          <Button onClick={handleNewSession} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            <Plus className="w-4 h-4 mr-2" /> New Session
          </Button>
        </div>

        {isGeneratingReport || !report ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center animate-pulse">
              <BarChart2 className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-slate-600 font-semibold">Generating your detailed report...</p>
            <p className="text-slate-400 text-sm">Analyzing grammar, vocabulary, and communication skills</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Score Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-xl">
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-indigo-200 text-sm font-medium">Overall Score</p>
                  <p className="text-5xl font-black mt-1">{report.overallScore}<span className="text-2xl text-indigo-300">/100</span></p>
                  <p className="text-indigo-200 text-xs mt-3 max-w-xs">{report.summary}</p>
                </div>
                <div className="w-24 h-24 flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - report.overallScore / 100)}`}
                      strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <h3 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Strengths
                </h3>
                <ul className="space-y-2">
                  {report.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="text-emerald-500 font-bold mt-0.5">✓</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <h3 className="font-bold text-red-800 text-sm mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {report.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="text-red-400 font-bold mt-0.5">✗</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Improvement Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Improvement Suggestions
              </h3>
              <ul className="space-y-2">
                {report.improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-blue-700">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Grammar Corrections */}
            {report.grammarCorrections && report.grammarCorrections.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-bold text-amber-800 text-sm mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Grammar Corrections ({report.grammarCorrections.length})
                </h3>
                <div className="space-y-4">
                  {report.grammarCorrections.map((gc, i) => (
                    <div key={i} className="bg-white border border-amber-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 text-xs font-bold flex-shrink-0 mt-0.5 bg-red-50 px-1.5 py-0.5 rounded">✗</span>
                        <p className="text-sm text-slate-700 line-through opacity-60">{gc.original}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 text-xs font-bold flex-shrink-0 mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">✓</span>
                        <p className="text-sm text-slate-800 font-semibold">{gc.corrected}</p>
                      </div>
                      <p className="text-xs text-amber-700 mt-1 pl-7">{gc.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.grammarCorrections && report.grammarCorrections.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-semibold">No significant grammar errors detected! Great job!</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── CHAT PHASE ────────────────────────────────────────────────────────────
  const chatMessages = conversation.filter(m => m.role !== 'system');

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewSession}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{selectedTopic?.label}</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-slate-400 text-xs">AI Agent is active</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleEndSession}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 font-bold"
        >
          <FileText className="w-4 h-4 mr-2" /> End & Get Report
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fcfdfd]">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={cn('flex max-w-xl gap-3', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                msg.role === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-white')}>
                {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={cn('px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed max-w-[85%]',
                msg.role === 'ai'
                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  : 'bg-indigo-600 text-white rounded-tr-sm')}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex max-w-xl gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 resize-none"
                placeholder="Type your response... (Enter to send)"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center mt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
