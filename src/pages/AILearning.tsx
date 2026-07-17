import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { auth, database } from '../lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import {
  BrainCircuit, Star, Zap, Trophy, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, RotateCcw, Play, Lock, Flame, BookOpen,
  ArrowRight, Sparkles
} from 'lucide-react';

const LEVELS = ['A1 Beginner', 'A2 Elementary', 'B1 Intermediate', 'B2 Upper Intermediate', 'C1 Advanced'];

const PLACEMENT_QUIZ = [
  { q: "Choose the correct form: She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: "goes", level: 0 },
  { q: "Which sentence is correct?", options: ["He don't like coffee.", "He doesn't likes coffee.", "He doesn't like coffee.", "He not like coffee."], answer: "He doesn't like coffee.", level: 0 },
  { q: "Complete: If I ___ rich, I would travel the world.", options: ["am", "was", "were", "be"], answer: "were", level: 1 },
  { q: "What is the passive voice of: 'They built the bridge in 1920'?", options: ["The bridge was built in 1920.", "The bridge built in 1920.", "The bridge is built in 1920.", "The bridge were built in 1920."], answer: "The bridge was built in 1920.", level: 1 },
  { q: "Choose the correct word: The report was ___ comprehensive than expected.", options: ["more", "most", "much", "many"], answer: "more", level: 2 },
  { q: "Identify the correct sentence:", options: ["I have been working here since five years.", "I have been working here for five years.", "I am working here since five years.", "I worked here since five years."], answer: "I have been working here for five years.", level: 2 },
  { q: "Which phrase means 'to handle a difficult situation'?", options: ["Face the music", "Hit the hay", "Bite the bullet", "Break a leg"], answer: "Bite the bullet", level: 3 },
  { q: "Choose the correct form: Had I known, I ___ you.", options: ["will tell", "would tell", "would have told", "had told"], answer: "would have told", level: 3 },
];

const FLASHCARD_CONTENT: Record<string, { front: string; back: string; example: string }[]> = {
  'A1 Beginner': [
    { front: "Hello", back: "A greeting used when meeting someone", example: "Hello! My name is Sara." },
    { front: "Good morning", back: "A greeting used in the morning", example: "Good morning! Did you sleep well?" },
    { front: "Thank you", back: "An expression of gratitude", example: "Thank you for your help!" },
    { front: "Please", back: "Used to make requests polite", example: "Can I have water, please?" },
    { front: "Yes / No", back: "Basic affirmative and negative answers", example: "Do you like apples? Yes, I do." },
  ],
  'A2 Elementary': [
    { front: "Could you...?", back: "Polite way to make a request", example: "Could you pass the salt, please?" },
    { front: "I would like...", back: "Polite way to express a want or desire", example: "I would like a coffee, please." },
    { front: "How often...?", back: "Question about frequency", example: "How often do you exercise?" },
    { front: "Present Continuous", back: "Used for actions happening right now (am/is/are + verb-ing)", example: "She is reading a book." },
    { front: "Going to", back: "Used for future plans or intentions", example: "I am going to visit my friend tomorrow." },
  ],
  'B1 Intermediate': [
    { front: "Nevertheless", back: "Conjunction meaning 'in spite of that'", example: "It was raining. Nevertheless, we went hiking." },
    { front: "Past Perfect", back: "Used for an action completed before another past action (had + past participle)", example: "She had already eaten when he arrived." },
    { front: "Subjunctive", back: "Expresses hypothetical or wishful situations", example: "I wish I were taller." },
    { front: "Phrasal verbs", back: "Verb + preposition combinations with special meaning", example: "I need to look up this word in a dictionary." },
    { front: "Conditional II", back: "Used for unlikely or hypothetical situations", example: "If I had more time, I would learn piano." },
  ],
  'B2 Upper Intermediate': [
    { front: "Inversion", back: "Reversing the normal word order for emphasis", example: "Never have I seen such a beautiful sunset." },
    { front: "Cleft sentences", back: "Sentence structures that emphasize specific parts", example: "It was John who broke the window." },
    { front: "Concord", back: "Agreement between subject and verb", example: "The data are being analyzed. (data is plural)" },
    { front: "Hedging language", back: "Using words to express uncertainty or tentativeness", example: "It would seem that prices are rising." },
    { front: "Nominalisation", back: "Converting verbs/adjectives into nouns", example: "The investigation → to investigate" },
  ],
  'C1 Advanced': [
    { front: "Ellipsis", back: "Omitting words that can be understood from context", example: "She loves tennis and so does he. (so does he = loves tennis too)" },
    { front: "Modal perfect", back: "Expressing past probability, regret, or criticism", example: "She must have forgotten. / You should have called." },
    { front: "Sophistry", back: "Using clever but false arguments", example: "His sophistry misled the committee." },
    { front: "Equivocate", back: "Use ambiguous language to avoid commitment", example: "The politician equivocated when asked about taxes." },
    { front: "Euphemism", back: "Indirect expression used instead of something blunt", example: "She passed away (instead of 'she died')." },
  ],
};

export default function AILearning() {
  const [screen, setScreen] = useState<'home' | 'placement' | 'roadmap' | 'lesson' | 'quiz'>('home');
  const [placementStep, setPlacementStep] = useState(0);
  const [placementAnswers, setPlacementAnswers] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { setLoading(false); return; }
      onValue(ref(database, `users/${user.uid}/aiLearning`), snap => {
        if (snap.exists()) {
          const d = snap.val();
          if (d.level) setUserLevel(d.level);
          if (d.xp) setXp(d.xp);
          if (d.streak) setStreak(d.streak);
          if (d.level) setScreen('roadmap');
        }
        setLoading(false);
      });
    });
    return () => unsub();
  }, []);

  const saveLearningData = async (level: string, newXp: number) => {
    const user = auth.currentUser;
    if (!user) return;
    await set(ref(database, `users/${user.uid}/aiLearning`), {
      level,
      xp: newXp,
      streak,
      lastActive: new Date().toISOString(),
    });
    // Also update the user's level field
    await set(ref(database, `users/${user.uid}/level`), level);
  };

  const handlePlacementAnswer = (answer: string) => {
    const newAnswers = [...placementAnswers, answer];
    setPlacementAnswers(newAnswers);
    if (placementStep < PLACEMENT_QUIZ.length - 1) {
      setPlacementStep(s => s + 1);
    } else {
      // Calculate level
      const correct = newAnswers.filter((a, i) => a === PLACEMENT_QUIZ[i].answer).length;
      const pct = (correct / PLACEMENT_QUIZ.length) * 100;
      let determinedLevel = 'A1 Beginner';
      if (pct >= 87) determinedLevel = 'C1 Advanced';
      else if (pct >= 75) determinedLevel = 'B2 Upper Intermediate';
      else if (pct >= 62) determinedLevel = 'B1 Intermediate';
      else if (pct >= 37) determinedLevel = 'A2 Elementary';
      setUserLevel(determinedLevel);
      saveLearningData(determinedLevel, xp + 50);
      setXp(p => p + 50);
      setScreen('roadmap');
    }
  };

  const handleCardComplete = (idx: number) => {
    const next = new Set(completedCards);
    next.add(idx);
    setCompletedCards(next);
    const gain = 10;
    setXp(p => { saveLearningData(userLevel!, p + gain); return p + gain; });
    setFlipped(false);
    if (idx < currentCards.length - 1) {
      setLessonIndex(idx + 1);
    } else {
      const currentIdx = LEVELS.indexOf(userLevel || 'A1 Beginner');
      let nextLevel = userLevel;
      if (currentIdx !== -1 && currentIdx < LEVELS.length - 1) {
        nextLevel = LEVELS[currentIdx + 1];
        setUserLevel(nextLevel);
        saveLearningData(nextLevel, xp + 100);
        alert(`Congratulations! You have completed all English learning lessons for ${userLevel}! You are promoted to ${nextLevel}!`);
      } else {
        saveLearningData(userLevel || 'A1 Beginner', xp + 50);
        alert(`Congratulations! You have finished all lessons on this level! Keep reviewing to stay fluent.`);
      }
      setScreen('roadmap');
      setLessonIndex(0);
      setCompletedCards(new Set());
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading AI Learning...</div>;
  }

  const currentCards = userLevel ? (FLASHCARD_CONTENT[userLevel] || FLASHCARD_CONTENT['A1 Beginner']) : [];
  const levelIndex = LEVELS.indexOf(userLevel || 'A1 Beginner');

  // ─── HOME ────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-6">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <BrainCircuit className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">AI Learning Platform</h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Discover your English level, get a personalized roadmap, and learn with AI-powered flashcards and lessons.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🧠', title: 'English Grammar & Fundamentals Test', desc: 'Find your exact English level in 8 fundamental questions' },
            { icon: '🗺️', title: 'Roadmap', desc: 'Personalized English learning path based on your level' },
            { icon: '⚡', title: 'Flashcards', desc: 'Learn grammar and vocabulary through interactive flashcards' },
          ].map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-5 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-bold text-slate-800 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setScreen('placement')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-sm"
          >
            <Sparkles className="w-5 h-5" /> Take Grammar & Fundamentals Test
          </button>
          <p className="text-xs text-slate-400">~2 minutes · 8 questions · Instant results</p>
        </div>
      </div>
    );
  }

  // ─── PLACEMENT TEST ───────────────────────────────────────────────────
  if (screen === 'placement') {
    const q = PLACEMENT_QUIZ[placementStep];
    const progress = ((placementStep) / PLACEMENT_QUIZ.length) * 100;
    return (
      <div className="max-w-xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setScreen('home')} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 mx-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-500">{placementStep + 1}/{PLACEMENT_QUIZ.length}</span>
        </div>

        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">English Grammar & Fundamentals Test</span>
          <h2 className="text-lg font-black text-slate-900 leading-snug">{q.q}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => handlePlacementAnswer(opt)}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all font-semibold text-slate-800 text-sm"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── ROADMAP ─────────────────────────────────────────────────────────
  if (screen === 'roadmap') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        {/* Level Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Your Level</p>
                <h1 className="text-2xl font-black mt-1">{userLevel}</h1>
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-xl font-black">{xp}</p>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">XP</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black flex items-center gap-1"><Flame className="w-5 h-5 text-orange-300" />{streak}</p>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">Streak</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-1">
                <span>Progress to next level</span>
                <span>{xp % 200}/200 XP</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${(xp % 200) / 2}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <h2 className="text-lg font-bold text-slate-800">Learning Roadmap</h2>
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {LEVELS.map((level, idx) => {
              const isCompleted = idx < levelIndex;
              const isCurrent = idx === levelIndex;
              const isLocked = idx > levelIndex;
              return (
                <div key={level} className={cn(
                  'relative flex items-center gap-4 p-4 rounded-2xl border transition-all',
                  isCurrent ? 'bg-indigo-50 border-indigo-300 shadow-md' :
                    isCompleted ? 'bg-emerald-50/50 border-emerald-200' :
                      'bg-white border-slate-200 opacity-60'
                )}>
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 z-10 shadow-sm',
                    isCurrent ? 'bg-indigo-600 text-white' :
                      isCompleted ? 'bg-emerald-500 text-white' :
                        'bg-slate-100 text-slate-400'
                  )}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : isLocked ? <Lock className="w-5 h-5" /> : <Star className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className={cn('font-bold text-sm', isCurrent ? 'text-indigo-800' : isCompleted ? 'text-emerald-800' : 'text-slate-500')}>{level}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isCompleted ? 'Completed ✓' : isCurrent ? `${currentCards.length} flashcards ready` : 'Complete previous levels first'}
                    </p>
                  </div>
                  {isCurrent && (
                    <button
                      onClick={() => { setScreen('lesson'); setLessonIndex(0); setFlipped(false); setCompletedCards(new Set()); }}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">Done</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => { setScreen('placement'); setPlacementStep(0); setPlacementAnswers([]); }}
          className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold py-3 rounded-2xl transition-all"
        >
          <RotateCcw className="w-4 h-4 inline mr-2" /> Retake Placement Test
        </button>
      </div>
    );
  }

  // ─── FLASHCARD LESSON ─────────────────────────────────────────────────
  if (screen === 'lesson') {
    const card = currentCards[lessonIndex];
    const progress = lessonIndex / currentCards.length;

    return (
      <div className="max-w-lg mx-auto space-y-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setScreen('roadmap')} className="text-slate-400 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 mx-4">
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-500">{lessonIndex + 1}/{currentCards.length}</span>
        </div>

        <div className="text-center">
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{userLevel} · Flashcards</span>
          <p className="text-xs text-slate-400 mt-1">Tap the card to reveal the answer</p>
        </div>

        {/* Flip Card */}
        <div
          className="cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <div style={{ transition: 'transform 0.5s', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', position: 'relative', minHeight: '220px' }}>
            {/* Front */}
            <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
              className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl"
            >
              <p className="text-4xl font-black text-center">{card.front}</p>
              <p className="text-indigo-200 text-sm mt-4">Tap to reveal</p>
            </div>
            {/* Back */}
            <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
              className="flex flex-col items-center justify-center bg-white border-2 border-indigo-200 rounded-3xl p-8 shadow-xl space-y-4"
            >
              <p className="text-lg font-bold text-slate-800 text-center">{card.back}</p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 w-full">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Example</p>
                <p className="text-sm text-slate-700 italic">"{card.example}"</p>
              </div>
            </div>
          </div>
        </div>

        {flipped && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setFlipped(false); }}
              className="py-3 rounded-2xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <XCircle className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => handleCardComplete(lessonIndex)}
              className="py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Got it! +10 XP
            </button>
          </div>
        )}

        {/* Cards remaining */}
        <div className="flex justify-center gap-1.5">
          {currentCards.map((_, i) => (
            <div key={i} className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === lessonIndex ? 'w-5 bg-indigo-600' : completedCards.has(i) ? 'bg-emerald-400' : 'bg-slate-200'
            )} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
