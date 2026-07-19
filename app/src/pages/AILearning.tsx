import { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { callAgent, mdToHtml } from '../lib/aiEngine';
import {
  BrainCircuit, Star, Zap, Trophy, CheckCircle, XCircle, RotateCcw,
  Play, Lock, Flame, BookOpen, ArrowRight, Sparkles, Mic, Headphones,
  PenLine, Eye, MessageSquare, Target, TrendingUp, Award, ChevronLeft,
  ChevronRight, Heart, Volume2, FileText, Users, Lightbulb, Clock, Send, Youtube
} from 'lucide-react';

// ─── ICON / SKILL METADATA ────────────────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  BookOpen, Mic, Volume2, PenLine, MessageSquare, Users, Zap, Lightbulb,
  Target, Trophy, Eye, Headphones, Star, Award, Heart, FileText, Clock, BrainCircuit,
};

const SKILL_META: Record<string, { icon: any; color: string }> = {
  Grammar: { icon: PenLine, color: 'from-blue-500 to-blue-700' },
  Vocabulary: { icon: BookOpen, color: 'from-emerald-500 to-emerald-700' },
  Reading: { icon: Eye, color: 'from-purple-500 to-purple-700' },
  Listening: { icon: Headphones, color: 'from-amber-500 to-amber-700' },
  Writing: { icon: PenLine, color: 'from-rose-500 to-rose-700' },
  Speaking: { icon: Mic, color: 'from-indigo-500 to-indigo-700' },
  Pronunciation: { icon: Volume2, color: 'from-teal-500 to-teal-700' },
  Confidence: { icon: Heart, color: 'from-pink-500 to-pink-700' },
  Communication: { icon: Users, color: 'from-orange-500 to-orange-700' },
};

// ─── STATIC DIAGNOSTIC (offline fallback only — AI generates fresh ones) ─────

const DIAGNOSTIC: {
  skill: string;
  icon: any;
  color: string;
  questions: { q: string; options: string[]; answer: string; concept?: string }[];
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

// ─── ROADMAP TYPES + FALLBACK BUILDER ─────────────────────────────────────────

type SkillScore = { skill: string; score: number; total: number; pct: number };

type Milestone = {
  id: string;
  title: string;
  desc: string;
  icon?: any;
  iconName?: string;
  color: string;
  tag: string;
  activities: string[];
  focusConcepts?: string[];
  reason?: string;
};

function milestoneIcon(m: Milestone) {
  return m.icon || (m.iconName && ICON_MAP[m.iconName]) || Trophy;
}

/** Strip non-serializable fields before saving to Firebase. */
function serializeRoadmap(rm: Milestone[]) {
  return rm.map(({ icon, ...rest }) => ({ ...rest, iconName: rest.iconName || iconNameOf(icon) }));
}
function iconNameOf(icon: any): string {
  for (const [name, comp] of Object.entries(ICON_MAP)) if (comp === icon) return name;
  return 'Trophy';
}

function buildRoadmap(scores: SkillScore[]): Milestone[] {
  const weak = scores.filter(s => s.pct < 60).map(s => s.skill);
  const moderate = scores.filter(s => s.pct >= 60 && s.pct < 80).map(s => s.skill);

  const milestones: Milestone[] = [];

  if (weak.includes('Grammar') || weak.includes('Vocabulary')) {
    milestones.push({
      id: 'foundation',
      title: weak.includes('Grammar') ? 'Grammar Foundation' : 'Vocabulary Builder',
      desc: weak.includes('Grammar')
        ? 'Master sentence structure, tenses and core grammar rules'
        : 'Expand your word bank with essential English vocabulary',
      iconName: 'BookOpen',
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
      iconName: 'Volume2',
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
      iconName: 'Mic',
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
      iconName: 'PenLine',
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
      iconName: 'MessageSquare',
      color: 'from-orange-500 to-orange-600',
      tag: '💬 Communication',
      activities: ['Group Discussion Simulation', 'Active Listening Exercises', 'Email Writing', 'Meeting Vocabulary', 'AI Dialogue Practice'],
    });
  }

  if (moderate.includes('Speaking') && !weak.includes('Speaking')) {
    milestones.push({
      id: 'fluency',
      title: 'Fluency Builder',
      desc: 'Push your speaking from good to great with advanced practice',
      iconName: 'Zap',
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
      iconName: 'Lightbulb',
      color: 'from-emerald-500 to-emerald-600',
      tag: '💡 Vocabulary+',
      activities: ['Idiom Cards', 'Phrasal Verb Drills', 'Business English', 'Word-in-Context Exercises', 'Vocabulary Quiz'],
    });
  }

  const hasWeakConfOrComm = weak.includes('Confidence') || weak.includes('Communication');
  if (!hasWeakConfOrComm) {
    milestones.push({
      id: 'public_speaking',
      title: 'Public Speaking & Presentations',
      desc: 'Transform into a confident English speaker for any audience',
      iconName: 'Users',
      color: 'from-purple-500 to-purple-600',
      tag: '🎤 Public Speaking',
      activities: ['Presentation Delivery', 'Audience Q&A Practice', 'Group Discussion', 'TED-style Speech', 'AI Panel Simulation'],
    });
  }

  milestones.push({
    id: 'interview',
    title: 'Interview & Career Readiness',
    desc: 'Prepare for HR rounds, group discussions and job interviews',
    iconName: 'Trophy',
    color: 'from-amber-500 to-amber-600',
    tag: '🏆 Placement Ready',
    activities: ['HR Interview Practice', 'Group Discussion', 'Mock Interview', 'Body Language Tips', 'Final AI Assessment'],
  });

  if (weak.length === 0 && moderate.length <= 1) {
    return [
      {
        id: 'public_speaking_adv',
        title: 'Public Speaking Mastery',
        desc: 'You have strong English! Now master public speaking',
        iconName: 'Mic',
        color: 'from-indigo-500 to-indigo-700',
        tag: '🎤 Advanced',
        activities: ['Keynote Delivery', 'Impromptu Speaking', 'Debate Club', 'TED-style Presentation', 'AI Feedback Session'],
      },
      {
        id: 'group_discussion',
        title: 'Group Discussion & Debate',
        desc: 'Lead discussions and influence through language',
        iconName: 'Users',
        color: 'from-purple-500 to-purple-700',
        tag: '💬 Leadership',
        activities: ['Hot Topic Discussions', 'Counter-Argument Training', 'Mediation Skills', 'Team Communication', 'AI Group Simulation'],
      },
      {
        id: 'mock_interview_adv',
        title: 'Mock Interviews',
        desc: 'Practice real HR and technical interview scenarios',
        iconName: 'Target',
        color: 'from-rose-500 to-rose-700',
        tag: '🎯 Interview Prep',
        activities: ['Behavioral Questions', 'STAR Method Practice', 'Technical Communication', 'Salary Negotiation Language', 'Final AI Mock'],
      },
      {
        id: 'placement_ready',
        title: 'Placement Readiness',
        desc: 'Final polish: professional English for any corporate role',
        iconName: 'Trophy',
        color: 'from-amber-500 to-amber-700',
        tag: '🏆 Placement',
        activities: ['HR Interview Practice', 'Campus Placement Simulation', 'Email & Report Writing', 'Presentation', 'Placement Score Test'],
      },
    ];
  }

  return milestones;
}

// ─── TEST TYPES ───────────────────────────────────────────────────────────────

type TestQuestion = {
  question: string; options: string[]; answer: string;
  difficulty?: string; type?: string; concept?: string; explanation?: string;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function AILearning() {
  type Screen = 'home' | 'diagnostic' | 'results' | 'roadmap' | 'milestone' | 'test' | 'testResult';
  const [screen, setScreen] = useState<Screen>('home');
  const [diagSkillIdx, setDiagSkillIdx] = useState(0);
  const [diagQIdx, setDiagQIdx] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, Record<number, string>>>({});
  const [diagSections, setDiagSections] = useState(DIAGNOSTIC);
  const [diagLoading, setDiagLoading] = useState(false);
  const [skillScores, setSkillScores] = useState<SkillScore[]>([]);
  const [roadmap, setRoadmap] = useState<Milestone[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
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
  // AI Tutor state
  const [tutorMessages, setTutorMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  // Enrichment resources
  const [enrichment, setEnrichment] = useState<any>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  // Test state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testAnswers, setTestAnswers] = useState<{ answer: string; timeSec: number }[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  // Revision
  const [revisionContent, setRevisionContent] = useState<string | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const diagTimesRef = useRef<Record<string, Record<number, number>>>({});

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
          if (d.profile) setProfile(d.profile);
          if (d.completedMilestones) setCompletedMilestones(new Set(d.completedMilestones));
          if (d.skillScores && d.skillScores.length > 0) setScreen(s => (s === 'home' ? 'roadmap' : s));
        }
        setLoading(false);
      });
      onValue(ref(database, `users/${user.uid}`), snap => {
        if (snap.exists()) setUserData(snap.val());
      });
    });
    return () => unsub();
  }, []);

  const saveData = async (
    scores: SkillScore[], rm: Milestone[], newXp: number, completed: string[], prof: any = profile,
  ) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await set(ref(database, `users/${user.uid}/aiLearning`), {
        skillScores: scores,
        roadmap: serializeRoadmap(rm),
        xp: newXp,
        streak,
        profile: prof ?? null,
        completedMilestones: completed,
        lastActive: new Date().toISOString(),
      });
      const weakAreas = (prof?.weakTopics?.length ? prof.weakTopics : scores.filter(s => s.pct < 60).map(s => s.skill)).join(', ');
      await set(ref(database, `users/${user.uid}/weakAreas`), weakAreas || 'None');
      await set(ref(database, `users/${user.uid}/placementReadiness`),
        prof?.overallScore ?? (scores.length ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length) : 0));
    } catch (e) {
      console.error('Failed to save learning data', e);
    }
  };

  // ── Diagnostic: AI-generated fresh assessment (static fallback) ───────────
  const startDiagnostic = async () => {
    setDiagSkillIdx(0); setDiagQIdx(0); setDiagAnswers({});
    diagTimesRef.current = {};
    setDiagLoading(true);
    setScreen('diagnostic');
    const res = await callAgent('diagnostic-generate', { profile });
    if (res.ok && res.json?.sections) {
      const sections = res.json.sections
        .filter((s: any) => SKILL_META[s.skill] || s.skill)
        .map((s: any) => ({
          skill: s.skill,
          icon: SKILL_META[s.skill]?.icon || BrainCircuit,
          color: SKILL_META[s.skill]?.color || 'from-indigo-500 to-indigo-700',
          questions: s.questions.map((q: any) => ({
            q: q.question, options: q.options, answer: q.answer, concept: q.concept,
          })),
        }));
      if (sections.length >= 3) setDiagSections(sections);
      else setDiagSections(DIAGNOSTIC);
    } else {
      setDiagSections(DIAGNOSTIC);
      if (res.error) showToast('Using standard assessment (AI is busy).', 'info');
    }
    questionStartRef.current = Date.now();
    setDiagLoading(false);
  };

  const finishDiagnostic = async (newAnswers: Record<string, Record<number, string>>) => {
    const scores: SkillScore[] = diagSections.map(sec => {
      const ans = newAnswers[sec.skill] || {};
      const correct = sec.questions.filter((q, i) => ans[i] === q.answer).length;
      return {
        skill: sec.skill,
        score: correct,
        total: sec.questions.length,
        pct: Math.round((correct / sec.questions.length) * 100),
      };
    });
    const newXp = xp + 100;
    setSkillScores(scores);
    setXp(newXp);
    setScreen('results');

    // AI: deep evaluation → learner profile → personalized roadmap
    setRoadmapLoading(true);
    const results = diagSections.map(sec => ({
      skill: sec.skill,
      questions: sec.questions.map((q, i) => ({
        question: q.q,
        concept: (q as any).concept,
        correctAnswer: q.answer,
        studentAnswer: (newAnswers[sec.skill] || {})[i] ?? null,
        correct: (newAnswers[sec.skill] || {})[i] === q.answer,
        timeSec: diagTimesRef.current[sec.skill]?.[i] ?? null,
      })),
    }));

    let prof = profile;
    const evalRes = await callAgent('diagnostic-evaluate', { profile, results });
    if (evalRes.ok && evalRes.json?.profile) {
      prof = { ...(profile || {}), ...evalRes.json.profile };
      setProfile(prof);
    } else {
      prof = {
        ...(profile || {}),
        overallScore: Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length),
        weakTopics: scores.filter(s => s.pct < 60).map(s => s.skill),
        strongTopics: scores.filter(s => s.pct >= 80).map(s => s.skill),
      };
      setProfile(prof);
    }

    let rm: Milestone[];
    const rmRes = await callAgent('roadmap-generate', { profile: prof });
    if (rmRes.ok && rmRes.json?.milestones?.length) {
      rm = rmRes.json.milestones;
    } else {
      rm = buildRoadmap(scores);
    }
    setRoadmap(rm);
    setRoadmapLoading(false);
    await saveData(scores, rm, newXp, Array.from(completedMilestones), prof);
  };

  const handleDiagAnswer = (answer: string) => {
    const skill = diagSections[diagSkillIdx];
    const timeSec = Math.round((Date.now() - questionStartRef.current) / 1000);
    diagTimesRef.current[skill.skill] = { ...(diagTimesRef.current[skill.skill] || {}), [diagQIdx]: timeSec };
    questionStartRef.current = Date.now();

    const newAnswers = {
      ...diagAnswers,
      [skill.skill]: { ...(diagAnswers[skill.skill] || {}), [diagQIdx]: answer }
    };
    setDiagAnswers(newAnswers);

    const hasMoreQ = diagQIdx < skill.questions.length - 1;
    const hasMoreSkill = diagSkillIdx < diagSections.length - 1;

    if (hasMoreQ) {
      setDiagQIdx(q => q + 1);
    } else if (hasMoreSkill) {
      setDiagSkillIdx(s => s + 1);
      setDiagQIdx(0);
    } else {
      finishDiagnostic(newAnswers);
    }
  };

  // ── Lesson generation (Agent 4) + enrichment (Agent 5) ───────────────────
  const generateLesson = async (activity: string, milestone: Milestone) => {
    setLessonContent(null);
    setLessonLoading(true);
    setTutorMessages([]);
    const res = await callAgent('lesson-generate', { profile, milestone: { title: milestone.title, desc: milestone.desc, tag: milestone.tag, focusConcepts: milestone.focusConcepts }, activity });
    if (res.ok && res.text) {
      setLessonContent(res.text);
    } else {
      setLessonContent(`## ${activity}\n\n${res.error || 'Practice this activity carefully. Focus on the core concepts and apply them step by step.'}`);
    }
    setLessonLoading(false);
  };

  const loadEnrichment = async (milestone: Milestone) => {
    setEnrichment(null);
    setEnrichmentLoading(true);
    const res = await callAgent('enrichment-generate', { profile, milestone: { title: milestone.title, desc: milestone.desc, tag: milestone.tag } });
    if (res.ok && res.json) setEnrichment(res.json);
    setEnrichmentLoading(false);
  };

  const openMilestone = (milestone: Milestone) => {
    setActiveMilestone(milestone);
    setActiveActivityIdx(0);
    setRevisionContent(null);
    setScreen('milestone');
    generateLesson(milestone.activities[0], milestone);
    loadEnrichment(milestone);
  };

  const changeActivity = (milestone: Milestone, idx: number) => {
    setActiveActivityIdx(idx);
    generateLesson(milestone.activities[idx], milestone);
  };

  // ── Interactive tutor (Agent 4b) ──────────────────────────────────────────
  const askTutor = async (question: string) => {
    if (!question.trim() || tutorLoading || !activeMilestone) return;
    const history = tutorMessages;
    setTutorMessages(m => [...m, { role: 'user', content: question }]);
    setTutorInput('');
    setTutorLoading(true);
    const res = await callAgent('tutor-chat', {
      profile,
      milestone: { title: activeMilestone.title, desc: activeMilestone.desc },
      lessonContent: lessonContent || '',
      history,
      question,
    });
    setTutorMessages(m => [...m, {
      role: 'assistant',
      content: res.ok && res.text ? res.text : (res.error || 'Sorry, I could not answer right now. Please try again.'),
    }]);
    setTutorLoading(false);
  };

  // ── Mastery test flow (Agents 6, 7, 8) ────────────────────────────────────
  const startTest = async () => {
    if (!activeMilestone) return;
    setTestLoading(true);
    setEvaluation(null);
    const res = await callAgent('test-generate', {
      profile,
      milestone: { title: activeMilestone.title, desc: activeMilestone.desc, focusConcepts: activeMilestone.focusConcepts },
    });
    if (res.ok && res.json?.questions?.length) {
      setTestQuestions(res.json.questions);
      setTestIdx(0);
      setTestAnswers([]);
      questionStartRef.current = Date.now();
      setScreen('test');
    } else {
      showToast(res.error || 'Could not generate the test. Please try again.', 'info');
    }
    setTestLoading(false);
  };

  const handleTestAnswer = async (answer: string) => {
    const timeSec = Math.round((Date.now() - questionStartRef.current) / 1000);
    questionStartRef.current = Date.now();
    const answers = [...testAnswers, { answer, timeSec }];
    setTestAnswers(answers);

    if (testIdx < testQuestions.length - 1) {
      setTestIdx(i => i + 1);
      return;
    }

    // All answered → deep evaluation
    setEvalLoading(true);
    setScreen('testResult');
    const results = testQuestions.map((q, i) => ({
      question: q.question,
      concept: q.concept,
      difficulty: q.difficulty,
      type: q.type,
      correctAnswer: q.answer,
      studentAnswer: answers[i]?.answer ?? null,
      correct: answers[i]?.answer === q.answer,
      timeSec: answers[i]?.timeSec ?? null,
    }));
    const evalRes = await callAgent('test-evaluate', {
      profile,
      milestone: activeMilestone ? { title: activeMilestone.title } : undefined,
      results,
    });

    let ev = evalRes.ok && evalRes.json ? evalRes.json : null;
    if (!ev) {
      const correct = results.filter(r => r.correct).length;
      const score = Math.round((correct / results.length) * 100);
      ev = {
        score,
        masteryAchieved: score >= 70,
        performance: score >= 85 ? 'excellent' : score >= 60 ? 'average' : 'poor',
        feedback: score >= 70 ? 'Great work! You passed this milestone test.' : 'Keep practicing — review the lesson and try again.',
        weakConcepts: [], strongConcepts: [], mistakes: [],
      };
    }
    setEvaluation(ev);

    // Update learner profile memory
    const newProf = {
      ...(profile || {}),
      confidence: ev.confidence ?? profile?.confidence,
      weakTopics: Array.from(new Set([...(ev.weakConcepts || []), ...((profile?.weakTopics || []).filter((t: string) => !(ev.strongConcepts || []).includes(t)))])).slice(0, 12),
      strongTopics: Array.from(new Set([...(profile?.strongTopics || []), ...(ev.strongConcepts || [])])).slice(0, 12),
      mistakeHistory: [...(profile?.mistakeHistory || []), ...(ev.mistakes || [])].slice(-20),
      testHistory: [...(profile?.testHistory || []), { milestone: activeMilestone?.title || '', score: ev.score, date: new Date().toISOString() }].slice(-20),
    };
    setProfile(newProf);

    if (ev.masteryAchieved && activeMilestone) {
      // Complete milestone + adaptive roadmap update
      const next = new Set(completedMilestones);
      next.add(activeMilestone.id);
      setCompletedMilestones(next);
      const newXp = xp + 150;
      setXp(newXp);

      let rm = roadmap;
      const updRes = await callAgent('roadmap-update', {
        profile: newProf,
        roadmap: serializeRoadmap(roadmap),
        milestoneId: activeMilestone.id,
        evaluation: ev,
      });
      if (updRes.ok && updRes.json?.milestones?.length) {
        rm = updRes.json.milestones;
        setRoadmap(rm);
        if (updRes.json.summary) showToast(`🗺️ ${updRes.json.summary}`, 'info');
      }
      await saveData(skillScores, rm, newXp, Array.from(next), newProf);
    } else {
      await saveData(skillScores, roadmap, xp, Array.from(completedMilestones), newProf);
    }
    setEvalLoading(false);
  };

  // ── Revision (Agent 9) ────────────────────────────────────────────────────
  const generateRevision = async () => {
    if (!activeMilestone || revisionLoading) return;
    setRevisionLoading(true);
    const res = await callAgent('revision-generate', {
      profile,
      milestone: { title: activeMilestone.title, desc: activeMilestone.desc, focusConcepts: activeMilestone.focusConcepts },
    });
    setRevisionContent(res.ok && res.text ? res.text : (res.error || 'Revision material unavailable right now.'));
    setRevisionLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <BrainCircuit className="w-6 h-6 animate-pulse mr-2" /> Loading AI Learning...
    </div>
  );

  const totalDiagQ = diagSections.reduce((a, s) => a + s.questions.length, 0);
  const answeredQ = diagSections.slice(0, diagSkillIdx).reduce((a, s) => a + s.questions.length, 0) + diagQIdx;
  const diagProgress = totalDiagQ ? Math.round((answeredQ / totalDiagQ) * 100) : 0;

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
            onClick={startDiagnostic}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-sm w-full justify-center"
          >
            <Sparkles className="w-5 h-5" /> Start English Diagnostic Assessment
          </button>
          <p className="text-xs text-slate-400">~5 minutes · AI-generated questions · Instant personalised roadmap</p>
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
    if (diagLoading) {
      return (
        <div className="max-w-xl mx-auto py-16 px-2 text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Preparing your assessment...</h2>
          <p className="text-sm text-slate-500">Our AI teacher is writing fresh questions just for you.</p>
        </div>
      );
    }
    const section = diagSections[diagSkillIdx];
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
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Skill {diagSkillIdx + 1} of {diagSections.length}</p>
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
    const overall = profile?.overallScore ?? Math.round(skillScores.reduce((a, s) => a + s.pct, 0) / skillScores.length);

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        <div className="text-center space-y-2">
          <div className="text-5xl font-black text-indigo-600">{overall}%</div>
          <h2 className="text-xl font-black text-slate-900">Your Assessment Results</h2>
          <p className="text-slate-500 text-sm">
            {profile?.analysis || "Based on your results, we've built your personalized learning roadmap."}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 gap-2">
          {skillScores.map(s => {
            const meta = SKILL_META[s.skill] || { icon: BrainCircuit };
            const Icon = meta.icon;
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

        {(profile?.weakTopics?.length || weak.length > 0) && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Focus Areas</p>
            <p className="text-sm text-red-800">{(profile?.weakTopics?.length ? profile.weakTopics : weak.map(s => s.skill)).join(' · ')}</p>
          </div>
        )}

        <button
          onClick={() => setScreen('roadmap')}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center justify-center gap-2"
        >
          {roadmapLoading
            ? <><Sparkles className="w-5 h-5 animate-pulse" /> AI is building your roadmap...</>
            : <><ArrowRight className="w-5 h-5" /> View My Personalized Roadmap</>}
        </button>
      </div>
    );
  }

  // ── ROADMAP ───────────────────────────────────────────────────────────────
  if (screen === 'roadmap') {
    const overall = profile?.overallScore ?? (skillScores.length > 0
      ? Math.round(skillScores.reduce((a, s) => a + s.pct, 0) / skillScores.length)
      : 0);
    const weakSkills: string[] = profile?.weakTopics?.length
      ? profile.weakTopics
      : skillScores.filter(s => s.pct < 60).map(s => s.skill);

    return (
      <div className="max-w-2xl mx-auto space-y-5 py-4 px-2">
        {ToastEl}
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

        {/* AI roadmap loading */}
        {roadmapLoading && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700 font-semibold">
            <Sparkles className="w-5 h-5 animate-pulse flex-shrink-0" />
            Your AI teacher is personalizing your roadmap...
          </div>
        )}

        {/* Milestones */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Learning Journey</h2>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-200 to-slate-100" />
            <div className="space-y-4">
              {roadmap.map((milestone, idx) => {
                const Icon = milestoneIcon(milestone);
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
                          {isCurrent && milestone.reason && (
                            <p className="text-[11px] text-indigo-500 mt-1 leading-relaxed">✨ {milestone.reason}</p>
                          )}
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
                            onClick={() => openMilestone(milestone)}
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
                <p style="font-size:32px;font-weight:900;margin:4px 0">${overall}%</p>
                <p style="font-size:11px;opacity:0.75">${weakSkills.slice(0, 3).join(' · ') || 'All skills strong!'}</p>
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
          onClick={startDiagnostic}
          className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retake Diagnostic Assessment
        </button>
      </div>
    );
  }

  // ── MILESTONE DETAIL (dynamic lesson + tutor + resources) ─────────────────
  if (screen === 'milestone' && activeMilestone) {
    const Icon = milestoneIcon(activeMilestone);
    const activities = activeMilestone.activities;
    const isLast = activeActivityIdx === activities.length - 1;

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        {ToastEl}
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

          {/* AI-generated lesson */}
          {lessonLoading ? (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3 text-sm text-indigo-700 font-semibold">
              <Sparkles className="w-5 h-5 animate-pulse flex-shrink-0" />
              Your AI teacher is writing today's lesson just for you...
            </div>
          ) : lessonContent ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-[28rem] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: mdToHtml(lessonContent) }} />
          ) : (
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">How to complete:</p>
              <p className="text-sm text-indigo-900 leading-relaxed">
                ✍️ Practice "{activities[activeActivityIdx]}" with your AI teacher.
              </p>
            </div>
          )}

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

        {/* AI Tutor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" /> Ask your AI Tutor
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {['Why?', 'Explain again', 'Another example', 'Explain simpler', 'Show analogy', 'Give a hint'].map(qk => (
              <button key={qk} onClick={() => askTutor(qk)}
                disabled={tutorLoading || lessonLoading}
                className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium hover:bg-indigo-100 transition-all disabled:opacity-50">
                {qk}
              </button>
            ))}
          </div>
          {tutorMessages.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tutorMessages.map((m, i) => (
                <div key={i} className={cn('text-xs p-3 rounded-xl leading-relaxed',
                  m.role === 'user' ? 'bg-indigo-600 text-white ml-8' : 'bg-slate-50 border border-slate-100 text-slate-700 mr-4'
                )}>
                  {m.role === 'assistant'
                    ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
                    : m.content}
                </div>
              ))}
              {tutorLoading && (
                <div className="bg-slate-50 border border-slate-100 text-slate-400 text-xs p-3 rounded-xl mr-4 animate-pulse">
                  Teacher is typing...
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={tutorInput}
              onChange={e => setTutorInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') askTutor(tutorInput); }}
              placeholder="Ask anything about this lesson..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
            />
            <button onClick={() => askTutor(tutorInput)}
              disabled={tutorLoading || !tutorInput.trim()}
              className="bg-indigo-600 text-white p-2 rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recommended Resources (Agent 5) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" /> Recommended Resources
          </h3>
          {enrichmentLoading ? (
            <p className="text-xs text-slate-400 animate-pulse">Finding the best videos and resources for this lesson...</p>
          ) : enrichment ? (
            <>
              <div className="space-y-2">
                {(enrichment.videos || []).map((v: any, i: number) => (
                  <a key={i}
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.searchQuery || `${v.title} ${v.channel}`)}`}
                    target="_blank" rel="noreferrer"
                    className="block bg-slate-50 border border-slate-100 rounded-xl p-3 hover:border-red-200 hover:bg-red-50/40 transition-all">
                    <div className="flex items-start gap-2">
                      <Youtube className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{v.title}</p>
                        <p className="text-[11px] text-slate-500">{v.channel}{v.duration ? ` · ${v.duration}` : ''}</p>
                        {v.description && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{v.description}</p>}
                        {v.reason && <p className="text-[11px] text-indigo-600 mt-1">✨ {v.reason}</p>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {(enrichment.resources || []).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(enrichment.resources || []).map((r: any, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{r.type}</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{r.title}</p>
                      {r.description && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.description}</p>}
                      {r.source && <p className="text-[10px] text-slate-400 mt-1">{r.source}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Resources will appear here once the lesson loads.</p>
          )}
        </div>

        {/* Revision (Agent 9) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" /> Quick Revision
            </h3>
            <button onClick={generateRevision} disabled={revisionLoading}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all disabled:opacity-50">
              {revisionLoading ? 'Generating...' : revisionContent ? 'Regenerate' : 'Generate revision sheet'}
            </button>
          </div>
          {revisionContent && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-80 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: mdToHtml(revisionContent) }} />
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {activeActivityIdx > 0 && (
            <button onClick={() => changeActivity(activeMilestone, activeActivityIdx - 1)}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-50 transition-all text-sm">
              Previous
            </button>
          )}
          {!isLast ? (
            <button onClick={() => changeActivity(activeMilestone, activeActivityIdx + 1)}
              className={cn("flex-1 text-white font-bold py-3 rounded-2xl shadow-sm transition-all text-sm bg-gradient-to-r", activeMilestone.color)}>
              Next Activity →
            </button>
          ) : (
            <button
              onClick={startTest}
              disabled={testLoading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {testLoading
                ? <><Sparkles className="w-4 h-4 animate-pulse" /> Preparing your test...</>
                : <><Trophy className="w-4 h-4" /> Take Mastery Test</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── MASTERY TEST (Agent 6) ────────────────────────────────────────────────
  if (screen === 'test' && activeMilestone && testQuestions.length > 0) {
    const q = testQuestions[testIdx];
    const progress = Math.round((testIdx / testQuestions.length) * 100);

    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('milestone')} className="text-slate-400 hover:text-slate-700 p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{activeMilestone.title} · Mastery Test</span>
              <span>{testIdx + 1}/{testQuestions.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className={cn("flex items-center gap-3 p-4 rounded-2xl text-white bg-gradient-to-r", activeMilestone.color)}>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
              {q.difficulty ? `${q.difficulty} · ` : ''}{q.type || 'knowledge'}
            </p>
            <p className="font-black text-base">Mastery Test</p>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Question {testIdx + 1} of {testQuestions.length}</p>
          <p className="text-slate-900 font-semibold text-base leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleTestAnswer(opt)}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all font-semibold text-slate-800 text-sm active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── TEST RESULT (Agents 7 & 8) ────────────────────────────────────────────
  if (screen === 'testResult' && activeMilestone) {
    if (evalLoading || !evaluation) {
      return (
        <div className="max-w-xl mx-auto py-16 px-2 text-center space-y-4">
          {ToastEl}
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl animate-pulse">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Evaluating your understanding...</h2>
          <p className="text-sm text-slate-500">Your AI teacher is analyzing not just your score, but how you learned.</p>
        </div>
      );
    }

    const passed = !!evaluation.masteryAchieved;
    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 px-2">
        {ToastEl}
        <div className="text-center space-y-2">
          <div className={cn('text-5xl font-black', passed ? 'text-emerald-600' : 'text-amber-600')}>{evaluation.score}%</div>
          <h2 className="text-xl font-black text-slate-900">
            {passed ? `Milestone "${activeMilestone.title}" Mastered! 🏆` : 'Almost there — mastery not yet reached'}
          </h2>
          <p className="text-slate-500 text-sm">{evaluation.feedback}</p>
          {passed && <p className="text-emerald-600 font-bold text-sm">+150 XP earned!</p>}
        </div>

        {/* Analysis cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Performance', value: evaluation.performance },
            { label: 'Retention', value: evaluation.retention || '—' },
            { label: 'Confidence', value: evaluation.confidence !== undefined ? `${evaluation.confidence}%` : '—' },
            { label: 'Guessing detected', value: evaluation.guessingDetected ? 'Yes' : 'No' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-sm font-black text-slate-800 capitalize">{String(c.value)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {(evaluation.weakConcepts || []).length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Still needs work</p>
            <p className="text-sm text-red-800">{evaluation.weakConcepts.join(' · ')}</p>
          </div>
        )}
        {(evaluation.strongConcepts || []).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Mastered concepts</p>
            <p className="text-sm text-emerald-800">{evaluation.strongConcepts.join(' · ')}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!passed && (
            <button
              onClick={() => { setScreen('milestone'); generateLesson(activeMilestone.activities[0], activeMilestone); setActiveActivityIdx(0); }}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-50 transition-all text-sm flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Review lesson & retry
            </button>
          )}
          <button
            onClick={() => { setActiveMilestone(null); setLessonContent(null); setEvaluation(null); setScreen('roadmap'); }}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" /> Back to Roadmap
          </button>
        </div>
      </div>
    );
  }

  return null;
}
