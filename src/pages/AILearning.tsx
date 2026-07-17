import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import {
  BrainCircuit, Star, Zap, Trophy, CheckCircle, XCircle, RotateCcw,
  Play, Lock, Flame, BookOpen, ArrowRight, Sparkles, Mic, Headphones,
  PenLine, Eye, MessageSquare, Target, TrendingUp, Award, ChevronLeft,
  ChevronRight, Heart, Volume2, FileText, Users, Lightbulb, Clock
} from 'lucide-react';

// ─── DIAGNOSTIC QUESTIONS ─────────────────────────────────────────────────────

const DIAGNOSTIC: {
  skill: string;
  icon: any;
  color: string;
  questions: { q: string; options: string[]; answer: string }[];
}[] = [
    {
      skill: 'Grammar',
      icon: PenLine,
      color: 'from-blue-500 to-blue-700',
      questions: [
        { q: "Choose the correct form: She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: "goes" },
        { q: "Which sentence is correct?", options: ["He don't like coffee.", "He doesn't likes coffee.", "He doesn't like coffee.", "He not like coffee."], answer: "He doesn't like coffee." },
        { q: "Complete: If I ___ rich, I would travel the world.", options: ["am", "was", "were", "be"], answer: "were" },
      ]
    },
    {
      skill: 'Vocabulary',
      icon: BookOpen,
      color: 'from-emerald-500 to-emerald-700',
      questions: [
        { q: "What does 'eloquent' mean?", options: ["Loud and angry", "Well-spoken and expressive", "Shy and quiet", "Confused"], answer: "Well-spoken and expressive" },
        { q: "Choose the correct word: The report was ___ comprehensive than expected.", options: ["more", "most", "much", "many"], answer: "more" },
        { q: "Which word means 'to handle a difficult situation bravely'?", options: ["Procrastinate", "Hesitate", "Persevere", "Retreat"], answer: "Persevere" },
      ]
    },
    {
      skill: 'Reading',
      icon: Eye,
      color: 'from-purple-500 to-purple-700',
      questions: [
        { q: "Read: 'Despite the heavy rain, the match continued.' What does 'despite' mean?", options: ["Because of", "In addition to", "Even though there was", "Without"], answer: "Even though there was" },
        { q: "Which best summarizes: 'She studied hard but failed the exam due to nervousness'?", options: ["She failed because she didn't study.", "She passed after being nervous.", "She studied well but anxiety caused failure.", "Nervousness helped her study."], answer: "She studied well but anxiety caused failure." },
      ]
    },
    {
      skill: 'Listening',
      icon: Headphones,
      color: 'from-amber-500 to-amber-700',
      questions: [
        { q: "In conversations, when someone says 'That's not my cup of tea', they mean:", options: ["They don't like tea.", "They don't have a cup.", "They don't like something.", "They want to drink tea."], answer: "They don't like something." },
        { q: "If someone says 'Could you say that again?', they are asking you to:", options: ["Stop talking", "Speak louder", "Repeat what you said", "Change the topic"], answer: "Repeat what you said" },
      ]
    },
    {
      skill: 'Writing',
      icon: PenLine,
      color: 'from-rose-500 to-rose-700',
      questions: [
        { q: "Which opening is best for a formal email?", options: ["Hey! What's up?", "Dear Sir/Madam, I am writing to...", "Yo, just wanted to say...", "Hi friend!"], answer: "Dear Sir/Madam, I am writing to..." },
        { q: "Which sentence uses punctuation correctly?", options: ["I love; apples bananas and oranges.", "I love apples, bananas, and oranges.", "I love, apples bananas and oranges.", "I love apples bananas, and, oranges."], answer: "I love apples, bananas, and oranges." },
      ]
    },
    {
      skill: 'Speaking',
      icon: Mic,
      color: 'from-indigo-500 to-indigo-700',
      questions: [
        { q: "When introducing yourself in an interview, you should:", options: ["Talk very fast to save time", "Speak clearly, make eye contact, and smile", "Use slang to sound casual", "Read from a paper"], answer: "Speak clearly, make eye contact, and smile" },
        { q: "To express disagreement politely you say:", options: ["You're totally wrong!", "I respect your view, however I think...", "That's a dumb idea.", "No way!"], answer: "I respect your view, however I think..." },
      ]
    },
    {
      skill: 'Pronunciation',
      icon: Volume2,
      color: 'from-teal-500 to-teal-700',
      questions: [
        { q: "Which word has a silent letter?", options: ["cat", "knife", "ball", "run"], answer: "knife" },
        { q: "In English, stress in a word means:", options: ["Speaking very loudly", "Emphasizing the right syllable", "Speaking slowly", "Using hand gestures"], answer: "Emphasizing the right syllable" },
      ]
    },
    {
      skill: 'Confidence',
      icon: Heart,
      color: 'from-pink-500 to-pink-700',
      questions: [
        { q: "When speaking English in a group, you typically:", options: ["Stay silent to avoid mistakes", "Speak up and try even if you make mistakes", "Only speak when asked", "Translate in your head first, then speak slowly"], answer: "Speak up and try even if you make mistakes" },
        { q: "If you don't understand something in English, you:", options: ["Pretend to understand and move on", "Ask for clarification politely", "Stop the conversation", "Make up an answer"], answer: "Ask for clarification politely" },
      ]
    },
    {
      skill: 'Communication',
      icon: Users,
      color: 'from-orange-500 to-orange-700',
      questions: [
        { q: "Active listening means:", options: ["Listening while doing other tasks", "Just hearing the words", "Fully concentrating and responding thoughtfully", "Nodding without understanding"], answer: "Fully concentrating and responding thoughtfully" },
        { q: "In a professional setting, communication should be:", options: ["Casual and full of slang", "Clear, concise, and respectful", "Lengthy and detailed always", "Loud and assertive"], answer: "Clear, concise, and respectful" },
      ]
    },
  ];

// ─── ROADMAP BUILDER ──────────────────────────────────────────────────────────

type SkillScore = { skill: string; score: number; total: number; pct: number };

type Milestone = {
  id: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  tag: string;
  activities: string[];
};

function buildRoadmap(scores: SkillScore[]): Milestone[] {
  const weak = scores.filter(s => s.pct < 60).map(s => s.skill);
  const moderate = scores.filter(s => s.pct >= 60 && s.pct < 80).map(s => s.skill);
  const strong = scores.filter(s => s.pct >= 80).map(s => s.skill);

  const milestones: Milestone[] = [];

  // Always start with foundation if there are weak areas
  if (weak.includes('Grammar') || weak.includes('Vocabulary')) {
    milestones.push({
      id: 'foundation',
      title: weak.includes('Grammar') ? 'Grammar Foundation' : 'Vocabulary Builder',
      desc: weak.includes('Grammar')
        ? 'Master sentence structure, tenses and core grammar rules'
        : 'Expand your word bank with essential English vocabulary',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      tag: '🏗️ Foundation',
      activities: ['Grammar Drills', 'Flashcard Sets', 'Fill-in-the-blank Exercises', 'Mini Quiz', 'AI Practice Session'],
    });
  }

  if (weak.includes('Pronunciation') || weak.includes('Listening')) {
    milestones.push({
      id: 'pronunciation',
      title: weak.includes('Pronunciation') ? 'Pronunciation Clinic' : 'Listening Mastery',
      desc: weak.includes('Pronunciation')
        ? 'Learn correct stress, intonation and sound formation'
        : 'Train your ear to understand natural English speech',
      icon: Volume2,
      color: 'from-teal-500 to-teal-600',
      tag: '🎙️ Sound Skills',
      activities: ['Pronunciation Drills', 'Listening Exercises', 'Shadowing Practice', 'Dictation Tasks', 'AI Speaking Session'],
    });
  }

  if (weak.includes('Speaking') || weak.includes('Confidence')) {
    milestones.push({
      id: 'speaking',
      title: weak.includes('Confidence') ? 'Confidence Building' : 'Speaking Practice',
      desc: weak.includes('Confidence')
        ? 'Build the courage to speak English in any situation'
        : 'Develop fluency and naturalness in spoken English',
      icon: Mic,
      color: 'from-indigo-500 to-indigo-600',
      tag: '🗣️ Speaking',
      activities: ['Daily Speaking Tasks', 'Role Play Scenarios', 'Self-introduction Practice', 'Feedback Sessions', 'AI Conversation'],
    });
  }

  if (weak.includes('Reading') || weak.includes('Writing')) {
    milestones.push({
      id: 'readwrite',
      title: weak.includes('Writing') ? 'Writing Workshop' : 'Reading Comprehension',
      desc: weak.includes('Writing')
        ? 'Learn to write clearly from emails to essays'
        : 'Improve speed and understanding of English texts',
      icon: PenLine,
      color: 'from-rose-500 to-rose-600',
      tag: '✍️ Literacy',
      activities: ['Reading Passages', 'Summary Writing', 'Email Drafting', 'Paragraph Practice', 'Comprehension Quiz'],
    });
  }

  if (weak.includes('Communication')) {
    milestones.push({
      id: 'communication',
      title: 'Communication Skills',
      desc: 'Master professional and social communication in English',
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600',
      tag: '💬 Communication',
      activities: ['Group Discussion Simulation', 'Active Listening Exercises', 'Email Writing', 'Meeting Vocabulary', 'AI Dialogue Practice'],
    });
  }

  // Moderate areas — improvement modules
  if (moderate.includes('Speaking') && !weak.includes('Speaking')) {
    milestones.push({
      id: 'fluency',
      title: 'Fluency Builder',
      desc: 'Push your speaking from good to great with advanced practice',
      icon: Zap,
      color: 'from-yellow-500 to-yellow-600',
      tag: '⚡ Fluency',
      activities: ['Timed Speaking Challenges', 'Story Narration', 'Debate Practice', 'Presentation Skills', 'AI Interview Mock'],
    });
  }

  if (moderate.includes('Vocabulary') && !weak.includes('Vocabulary')) {
    milestones.push({
      id: 'vocab_adv',
      title: 'Advanced Vocabulary',
      desc: 'Learn idioms, phrasal verbs and professional vocabulary',
      icon: Lightbulb,
      color: 'from-emerald-500 to-emerald-600',
      tag: '💡 Vocabulary+',
      activities: ['Idiom Cards', 'Phrasal Verb Drills', 'Business English', 'Word-in-Context Exercises', 'Vocabulary Quiz'],
    });
  }

  // Always end with professional readiness if confidence/communication are not weak
  const hasWeakConfOrComm = weak.includes('Confidence') || weak.includes('Communication');
  if (!hasWeakConfOrComm) {
    milestones.push({
      id: 'public_speaking',
      title: 'Public Speaking & Presentations',
      desc: 'Transform into a confident English speaker for any audience',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      tag: '🎤 Public Speaking',
      activities: ['Presentation Delivery', 'Audience Q&A Practice', 'Group Discussion', 'TED-style Speech', 'AI Panel Simulation'],
    });
  }

  milestones.push({
    id: 'interview',
    title: 'Interview & Career Readiness',
    desc: 'Prepare for HR rounds, group discussions and job interviews',
    icon: Trophy,
    color: 'from-amber-500 to-amber-600',
    tag: '🏆 Placement Ready',
    activities: ['HR Interview Practice', 'Group Discussion', 'Mock Interview', 'Body Language Tips', 'Final AI Assessment'],
  });

  // If all strong — premium track
  if (weak.length === 0 && moderate.length <= 1) {
    return [
      {
        id: 'public_speaking_adv',
        title: 'Public Speaking Mastery',
        desc: 'You have strong English! Now master public speaking',
        icon: Mic,
        color: 'from-indigo-500 to-indigo-700',
        tag: '🎤 Advanced',
        activities: ['Keynote Delivery', 'Impromptu Speaking', 'Debate Club', 'TED-style Presentation', 'AI Feedback Session'],
      },
      {
        id: 'group_discussion',
        title: 'Group Discussion & Debate',
        desc: 'Lead discussions and influence through language',
        icon: Users,
        color: 'from-purple-500 to-purple-700',
        tag: '💬 Leadership',
        activities: ['Hot Topic Discussions', 'Counter-Argument Training', 'Mediation Skills', 'Team Communication', 'AI Group Simulation'],
      },
      {
        id: 'mock_interview_adv',
        title: 'Mock Interviews',
        desc: 'Practice real HR and technical interview scenarios',
        icon: Target,
        color: 'from-rose-500 to-rose-700',
        tag: '🎯 Interview Prep',
        activities: ['Behavioral Questions', 'STAR Method Practice', 'Technical Communication', 'Salary Negotiation Language', 'Final AI Mock'],
      },
      {
        id: 'placement_ready',
        title: 'Placement Readiness',
        desc: 'Final polish: professional English for any corporate role',
        icon: Trophy,
        color: 'from-amber-500 to-amber-700',
        tag: '🏆 Placement',
        activities: ['HR Interview Practice', 'Campus Placement Simulation', 'Email & Report Writing', 'Presentation', 'Placement Score Test'],
      },
    ];
  }

  return milestones;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function AILearning() {
  type Screen = 'home' | 'diagnostic' | 'results' | 'roadmap' | 'milestone';
  const [screen, setScreen] = useState<Screen>('home');
  const [diagSkillIdx, setDiagSkillIdx] = useState(0);
  const [diagQIdx, setDiagQIdx] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, Record<number, string>>>({});
  const [skillScores, setSkillScores] = useState<SkillScore[]>([]);
  const [roadmap, setRoadmap] = useState<Milestone[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [activeActivityIdx, setActiveActivityIdx] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  // AI Lesson state
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { setLoading(false); return; }
      onValue(ref(database, `users/${user.uid}/aiLearning`), snap => {
        if (snap.exists()) {
          const d = snap.val();
          if (d.xp) setXp(d.xp);
          if (d.streak) setStreak(d.streak);
          if (d.skillScores) setSkillScores(d.skillScores);
          if (d.roadmap) setRoadmap(d.roadmap);
          if (d.completedMilestones) setCompletedMilestones(new Set(d.completedMilestones));
          if (d.skillScores && d.skillScores.length > 0) setScreen('roadmap');
        }
        setLoading(false);
      });
      onValue(ref(database, `users/${user.uid}`), snap => {
        if (snap.exists()) setUserData(snap.val());
      });
    });
    return () => unsub();
  }, []);

  const saveData = async (scores: SkillScore[], rm: Milestone[], newXp: number, completed: string[]) => {
    const user = auth.currentUser;
    if (!user) return;
    await set(ref(database, `users/${user.uid}/aiLearning`), {
      skillScores: scores,
      roadmap: rm,
      xp: newXp,
      streak,
      completedMilestones: completed,
      lastActive: new Date().toISOString(),
    });
    // Save weak skills summary to user profile
    const weakAreas = scores.filter(s => s.pct < 60).map(s => s.skill).join(', ');
    await set(ref(database, `users/${user.uid}/weakAreas`), weakAreas || 'None');
    await set(ref(database, `users/${user.uid}/placementReadiness`),
      Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length));
  };

  const handleDiagAnswer = (answer: string) => {
    const skill = DIAGNOSTIC[diagSkillIdx];
    const newAnswers = {
      ...diagAnswers,
      [skill.skill]: { ...(diagAnswers[skill.skill] || {}), [diagQIdx]: answer }
    };
    setDiagAnswers(newAnswers);

    const hasMoreQ = diagQIdx < skill.questions.length - 1;
    const hasMoreSkill = diagSkillIdx < DIAGNOSTIC.length - 1;

    if (hasMoreQ) {
      setDiagQIdx(q => q + 1);
    } else if (hasMoreSkill) {
      setDiagSkillIdx(s => s + 1);
      setDiagQIdx(0);
    } else {
      // Calculate scores
      const scores: SkillScore[] = DIAGNOSTIC.map(sec => {
        const ans = newAnswers[sec.skill] || {};
        const correct = sec.questions.filter((q, i) => ans[i] === q.answer).length;
        return {
          skill: sec.skill,
          score: correct,
          total: sec.questions.length,
          pct: Math.round((correct / sec.questions.length) * 100),
        };
      });
      const rm = buildRoadmap(scores);
      const newXp = xp + 100;
      setSkillScores(scores);
      setRoadmap(rm);
      setXp(newXp);
      saveData(scores, rm, newXp, Array.from(completedMilestones));
      setScreen('results');
    }
  };

  const handleCompleteMilestone = async (milestone: Milestone) => {
    const next = new Set(completedMilestones);
    next.add(milestone.id);
    setCompletedMilestones(next);
    const newXp = xp + 150;
    setXp(newXp);
    await saveData(skillScores, roadmap, newXp, Array.from(next));
    setActiveMilestone(null);
    setLessonContent(null);
    showToast(`🏆 Milestone "${milestone.title}" Completed! +150 XP earned!`, 'success');
    setScreen('roadmap');
  };

  const generateLesson = async (activity: string, milestone: Milestone) => {
    setLessonContent(null);
    setLessonLoading(true);
    try {
      const prompt = `You are an expert English language teacher. Generate a short, engaging lesson for a student working on "${milestone.title}" (skill area: ${milestone.tag}). 

The lesson is about: "${activity}"

Generate a structured lesson with:
1. A brief concept explanation (2-3 sentences)
2. 2-3 worked examples
3. A quick practice exercise (1-2 items with answers)

Keep it concise, educational, and motivating. Use markdown formatting with ## for sections, **bold** for key terms, and bullet points.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an expert English language teacher generating concise, educational lessons.' },
            { role: 'user', content: prompt }
          ]
        }),
      });
      const data = await response.json();
      if (response.ok && data.result) {
        setLessonContent(data.result);
      } else {
        setLessonContent(`## ${activity}\n\nPractice this activity carefully. Focus on the core concepts and apply them step by step. Review your teacher's materials and try the exercises in your curriculum.`);
      }
    } catch {
      setLessonContent(`## ${activity}\n\nPractice this activity with your teacher's guidance. Focus on understanding the core concepts and applying them regularly.`);
    } finally {
      setLessonLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <BrainCircuit className="w-6 h-6 animate-pulse mr-2" /> Loading AI Learning...
    </div>
  );

  const totalDiagQ = DIAGNOSTIC.reduce((a, s) => a + s.questions.length, 0);
  const answeredQ = DIAGNOSTIC.slice(0, diagSkillIdx).reduce((a, s) => a + s.questions.length, 0) + diagQIdx;
  const diagProgress = Math.round((answeredQ / totalDiagQ) * 100);

  // Global toast
  const ToastEl = toast ? (
    <div className={cn(
      'fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold transition-all animate-bounce',
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
    )}>
      {toast.type === 'success' ? '🏆' : '📚'} {toast.message}
    </div>
  ) : null;

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-6 px-2">
        {ToastEl}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <BrainCircuit className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">AI Personalised Learning</h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
            Take a comprehensive English diagnostic. Get a <strong>unique learning roadmap</strong> built just for your strengths and weak areas.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🔍', title: 'Diagnostic', desc: '9 skills assessed' },
            { icon: '🗺️', title: 'Roadmap', desc: 'Unique to you' },
            { icon: '🏆', title: 'Placement Ready', desc: 'Track progress' },
          ].map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">{f.icon}</div>
              <h3 className="font-bold text-slate-800 text-xs">{f.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> What's assessed:
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {DIAGNOSTIC.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.skill} className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {s.skill}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => { setScreen('diagnostic'); setDiagSkillIdx(0); setDiagQIdx(0); setDiagAnswers({}); }}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-sm w-full justify-center"
          >
            <Sparkles className="w-5 h-5" /> Start English Diagnostic Assessment
          </button>
          <p className="text-xs text-slate-400">~5 minutes · {totalDiagQ} questions · Instant personalised roadmap</p>
          {skillScores.length > 0 && (
            <button
              onClick={() => setScreen('roadmap')}
              className="text-indigo-600 font-semibold text-xs underline"
            >
              View my existing roadmap →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── DIAGNOSTIC ────────────────────────────────────────────────────────────
  if (screen === 'diagnostic') {
    const section = DIAGNOSTIC[diagSkillIdx];
    const q = section.questions[diagQIdx];
    const Icon = section.icon;

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="text-slate-400 hover:text-slate-700 p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{section.skill} Assessment</span>
              <span>{answeredQ + 1}/{totalDiagQ}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${diagProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Skill Badge */}
        <div className={cn("flex items-center gap-3 p-4 rounded-2xl text-white bg-gradient-to-r", section.color)}>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Skill {diagSkillIdx + 1} of {DIAGNOSTIC.length}</p>
            <p className="font-black text-base">{section.skill}</p>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Question {diagQIdx + 1} of {section.questions.length}</p>
          <p className="text-slate-900 font-semibold text-base leading-snug">{q.q}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleDiagAnswer(opt)}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all font-semibold text-slate-800 text-sm active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (screen === 'results') {
    const weak = skillScores.filter(s => s.pct < 60);
    const moderate = skillScores.filter(s => s.pct >= 60 && s.pct < 80);
    const strong = skillScores.filter(s => s.pct >= 80);
    const overall = Math.round(skillScores.reduce((a, s) => a + s.pct, 0) / skillScores.length);

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        <div className="text-center space-y-2">
          <div className="text-5xl font-black text-indigo-600">{overall}%</div>
          <h2 className="text-xl font-black text-slate-900">Your Assessment Results</h2>
          <p className="text-slate-500 text-sm">Based on your results, we've built your personalized learning roadmap.</p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 gap-2">
          {skillScores.map(s => {
            const sec = DIAGNOSTIC.find(d => d.skill === s.skill)!;
            const Icon = sec.icon;
            const status = s.pct >= 80 ? 'strong' : s.pct >= 60 ? 'moderate' : 'weak';
            return (
              <div key={s.skill} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  status === 'strong' ? 'bg-emerald-100 text-emerald-600' :
                    status === 'moderate' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800">{s.skill}</span>
                    <span className={cn("text-xs font-bold",
                      status === 'strong' ? 'text-emerald-600' : status === 'moderate' ? 'text-amber-600' : 'text-red-600'
                    )}>{s.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={cn("h-1.5 rounded-full transition-all",
                      status === 'strong' ? 'bg-emerald-500' : status === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
                    )} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0",
                  status === 'strong' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                )}>{status}</span>
              </div>
            );
          })}
        </div>

        {weak.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Focus Areas</p>
            <p className="text-sm text-red-800">{weak.map(s => s.skill).join(' · ')}</p>
          </div>
        )}

        <button
          onClick={() => setScreen('roadmap')}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-5 h-5" /> View My Personalized Roadmap
        </button>
      </div>
    );
  }

  // ── ROADMAP ───────────────────────────────────────────────────────────────
  if (screen === 'roadmap') {
    const overall = skillScores.length > 0
      ? Math.round(skillScores.reduce((a, s) => a + s.pct, 0) / skillScores.length)
      : 0;
    const weakSkills = skillScores.filter(s => s.pct < 60).map(s => s.skill);
    const completedCount = completedMilestones.size;

    return (
      <div className="max-w-2xl mx-auto space-y-5 py-4 px-2">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 sm:p-6 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Your Learning Journey</p>
                <h1 className="text-xl sm:text-2xl font-black mt-1">Personalized Roadmap</h1>
                {weakSkills.length > 0 && (
                  <p className="text-indigo-200 text-xs mt-1">Focus: {weakSkills.slice(0, 3).join(' · ')}</p>
                )}
              </div>
              <div className="flex gap-4 flex-shrink-0">
                <div className="text-center">
                  <p className="text-xl font-black">{xp}</p>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">XP</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black flex items-center gap-1"><Flame className="w-4 h-4 text-orange-300" />{streak}</p>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">Streak</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-indigo-200 mb-1">
                <span>Placement Readiness</span>
                <span>{overall}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${overall}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Learning Journey</h2>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-200 to-slate-100" />
            <div className="space-y-4">
              {roadmap.map((milestone, idx) => {
                const Icon = milestone.icon || Trophy;
                const isCompleted = completedMilestones.has(milestone.id);
                const prevDone = idx === 0 || completedMilestones.has(roadmap[idx - 1].id);
                const isCurrent = !isCompleted && prevDone;
                const isLocked = !isCompleted && !prevDone;

                return (
                  <div key={milestone.id} className={cn(
                    'relative flex items-start gap-4 p-4 rounded-2xl border transition-all',
                    isCompleted ? 'bg-emerald-50 border-emerald-200' :
                      isCurrent ? 'bg-white border-indigo-300 shadow-md' :
                        'bg-white border-slate-200 opacity-50'
                  )}>
                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 z-10 shadow-sm bg-gradient-to-br text-white',
                      isCompleted ? 'from-emerald-400 to-emerald-600' :
                        isCurrent ? milestone.color :
                          'from-slate-300 to-slate-400'
                    )}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> :
                        isLocked ? <Lock className="w-5 h-5" /> :
                          <Icon className="w-6 h-6" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{milestone.tag}</span>
                          <p className={cn('font-bold text-sm mt-0.5',
                            isCompleted ? 'text-emerald-800' : isCurrent ? 'text-indigo-900' : 'text-slate-500'
                          )}>{milestone.title}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{milestone.desc}</p>
                        </div>
                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full flex-shrink-0">Done ✓</span>
                        )}
                      </div>

                      {isCurrent && (
                        <>
                          {/* Activities */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {milestone.activities.slice(0, 4).map(act => (
                              <span key={act} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                                {act}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => { setActiveMilestone(milestone); setActiveActivityIdx(0); setScreen('milestone'); }}
                            className={cn(
                              "mt-3 flex items-center gap-1.5 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm bg-gradient-to-r",
                              milestone.color
                            )}
                          >
                            <Play className="w-3.5 h-3.5" /> Start Milestone
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skill Snapshot */}
        {skillScores.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Skill Snapshot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {skillScores.map(s => (
                <div key={s.skill} className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className={cn("text-lg font-black",
                    s.pct >= 80 ? 'text-emerald-600' : s.pct >= 60 ? 'text-amber-600' : 'text-red-600'
                  )}>{s.pct}%</p>
                  <p className="text-[11px] text-slate-500 font-medium">{s.skill}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roadmap PDF Export button */}
        <button
          onClick={() => {
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>My Learning Roadmap</title><style>
              body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1e293b}
              h1{font-size:22px;font-weight:900;color:#4338ca;margin-bottom:4px}
              .subtitle{font-size:12px;color:#64748b;margin-bottom:20px}
              .header-card{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:20px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
              .stats{display:flex;gap:24px}
              .stat{text-align:center}
              .stat-val{font-size:24px;font-weight:900}
              .stat-label{font-size:10px;opacity:0.8;text-transform:uppercase;letter-spacing:1px}
              .milestone{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:10px 0;display:flex;gap:12px;align-items:flex-start}
              .milestone.done{background:#f0fdf4;border-color:#86efac}
              .milestone.current{background:#eef2ff;border-color:#818cf8;border-width:2px}
              .milestone.locked{opacity:0.5}
              .tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b}
              .title{font-size:15px;font-weight:700;color:#1e293b;margin:2px 0}
              .desc{font-size:12px;color:#64748b}
              .badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#d1fae5;color:#065f46}
              .skills{margin-top:16px}
              .skill-row{display:flex;justify-content:space-between;align-items:center;margin:4px 0;font-size:12px}
              .bar-bg{height:6px;background:#e2e8f0;border-radius:3px;flex:1;margin:0 8px}
              .bar{height:6px;border-radius:3px;background:#6366f1}
              .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px}
              @media print{body{margin:0}}
            </style></head><body>
            <h1>My Learning Roadmap</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleDateString()} &bull; LinguaLab AI Personalized Learning</p>
            <div class="header-card">
              <div>
                <p style="font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:1px">Placement Readiness</p>
                <p style="font-size:32px;font-weight:900;margin:4px 0">${skillScores.length > 0 ? Math.round(skillScores.reduce((a, s) => a + s.pct, 0) / skillScores.length) : 0}%</p>
                <p style="font-size:11px;opacity:0.75">${skillScores.filter(s => s.pct < 60).map(s => s.skill).slice(0, 3).join(' · ') || 'All skills strong!'}</p>
              </div>
              <div class="stats">
                <div class="stat"><div class="stat-val">${xp}</div><div class="stat-label">XP</div></div>
                <div class="stat"><div class="stat-val">${completedMilestones.size}/${roadmap.length}</div><div class="stat-label">Done</div></div>
              </div>
            </div>
            <h2 style="font-size:15px;font-weight:700;color:#374151;margin-bottom:8px">Learning Journey</h2>
            ${roadmap.map((m, idx) => {
              const isCompleted = completedMilestones.has(m.id);
              const prevDone = idx === 0 || completedMilestones.has(roadmap[idx - 1].id);
              const isCurrent = !isCompleted && prevDone;
              const isLocked = !isCompleted && !prevDone;
              return `<div class="milestone ${isCompleted ? 'done' : isCurrent ? 'current' : 'locked'}">
                <div style="flex-shrink:0">
                  <div style="width:36px;height:36px;border-radius:10px;background:${isCompleted ? '#22c55e' : isCurrent ? '#6366f1' : '#94a3b8'};display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px">${idx + 1}</div>
                </div>
                <div style="flex:1">
                  <div class="tag">${m.tag}</div>
                  <div class="title">${m.title} ${isCompleted ? '<span class="badge">Done ✓</span>' : isCurrent ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#e0e7ff;color:#3730a3">▶ Current</span>' : ''}</div>
                  <div class="desc">${m.desc}</div>
                  <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${m.activities.map(a => `<span style="font-size:10px;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:10px">${a}</span>`).join('')}</div>
                </div>
              </div>`;
            }).join('')}
            ${skillScores.length > 0 ? `
            <div class="skills">
              <h2 style="font-size:15px;font-weight:700;color:#374151;margin:16px 0 8px">Skill Snapshot</h2>
              ${skillScores.map(s => `<div class="skill-row"><span style="width:90px;font-weight:600">${s.skill}</span><div class="bar-bg"><div class="bar" style="width:${s.pct}%;background:${s.pct >= 80 ? '#22c55e' : s.pct >= 60 ? '#f59e0b' : '#ef4444'}"></div></div><span style="width:36px;text-align:right;font-weight:700;color:${s.pct >= 80 ? '#15803d' : s.pct >= 60 ? '#b45309' : '#dc2626'}">${s.pct}%</span></div>`).join('')}
            </div>` : ''}
            <div class="footer">LinguaLab AI &bull; ${new Date().toLocaleString()}</div>
            </body></html>`;
            const win = window.open('', '_blank');
            if (!win) { alert('Please allow popups to export PDF.'); return; }
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
          }}
          className="w-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-sm font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          📄 Export Roadmap as PDF
        </button>
        <button
          onClick={() => { setScreen('diagnostic'); setDiagSkillIdx(0); setDiagQIdx(0); setDiagAnswers({}); }}
          className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retake Diagnostic Assessment
        </button>
      </div>
    );
  }

  // ── MILESTONE DETAIL ──────────────────────────────────────────────────────
  if (screen === 'milestone' && activeMilestone) {
    const Icon = activeMilestone.icon || Trophy;
    const activities = activeMilestone.activities;
    const isLast = activeActivityIdx === activities.length - 1;

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('roadmap')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{activeMilestone.title}</span>
              <span>{activeActivityIdx + 1}/{activities.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={cn("h-2 rounded-full transition-all bg-gradient-to-r", activeMilestone.color)}
                style={{ width: `${((activeActivityIdx + 1) / activities.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Milestone Card */}
        <div className={cn("rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl", activeMilestone.color)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{activeMilestone.tag}</span>
              <p className="font-black text-sm">{activeMilestone.title}</p>
            </div>
          </div>
          <p className="text-white/80 text-xs leading-relaxed">{activeMilestone.desc}</p>
        </div>

        {/* Current Activity */}
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg">
              {activeActivityIdx + 1}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Activity</p>
              <p className="font-bold text-slate-900 text-base">{activities[activeActivityIdx]}</p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">How to complete:</p>
            <p className="text-sm text-indigo-900 leading-relaxed">
              {activities[activeActivityIdx].includes('AI') || activities[activeActivityIdx].includes('Session')
                ? '🤖 Visit AI Conversation Practice to complete this activity with your AI tutor.'
                : activities[activeActivityIdx].includes('Quiz') || activities[activeActivityIdx].includes('Test')
                  ? '📝 Complete the quiz in your My Assessments section to mark this done.'
                  : activities[activeActivityIdx].includes('Reading') || activities[activeActivityIdx].includes('Listening')
                    ? '🎧 Practice using the resources assigned by your teacher or the AI Conversation module.'
                    : `✍️ Practice "${activities[activeActivityIdx]}" with your teacher or through the AI Practice module.`}
            </p>
          </div>

          {/* All activities list */}
          <div className="space-y-1.5">
            {activities.map((act, i) => (
              <div key={act} className={cn("flex items-center gap-2 text-sm p-2 rounded-lg",
                i < activeActivityIdx ? 'text-emerald-700 bg-emerald-50' :
                  i === activeActivityIdx ? 'text-indigo-800 bg-indigo-50 font-bold' :
                    'text-slate-400'
              )}>
                {i < activeActivityIdx ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" /> :
                  i === activeActivityIdx ? <Zap className="w-4 h-4 flex-shrink-0 text-indigo-500" /> :
                    <div className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-slate-200" />}
                {act}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {activeActivityIdx > 0 && (
            <button onClick={() => setActiveActivityIdx(i => i - 1)}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-50 transition-all text-sm">
              Previous
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setActiveActivityIdx(i => i + 1)}
              className={cn("flex-1 text-white font-bold py-3 rounded-2xl shadow-sm transition-all text-sm bg-gradient-to-r", activeMilestone.color)}>
              Next Activity →
            </button>
          ) : (
            <button
              onClick={async () => {
                await handleCompleteMilestone(activeMilestone);
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4" /> Complete Milestone +150 XP
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
