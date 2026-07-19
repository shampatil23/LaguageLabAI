import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Ear,
  Eye,
  EyeOff,
  Headphones,
  Languages,
  LockKeyhole,
  Mail,
  Mic2,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  auth,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  database,
} from '../lib/firebase';
import { get, ref, update } from 'firebase/database';

const friendlyAuthError = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'That email and password combination was not recognized.';
  }
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a moment, then try again.';
  if (code.includes('network-request-failed')) return 'We could not reach the server. Check your connection and try again.';
  return error instanceof Error ? error.message : 'We could not sign you in. Please try again.';
};

export default function Login() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const role = userData.role;
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem('deviceId', deviceId);
        }

        await update(userRef, { registeredDeviceId: deviceId });

        if (role === 'student') {
          let licenseValid = true;
          const teacherId = userData.teacherId;
          if (!teacherId) {
            licenseValid = false;
          } else {
            const teacherSnapshot = await get(ref(database, `users/${teacherId}`));
            if (!teacherSnapshot.exists()) {
              licenseValid = false;
            } else {
              const teacherData = teacherSnapshot.val();
              licenseValid = Boolean(
                teacherData.licenseExpiry && new Date(teacherData.licenseExpiry) >= new Date(),
              );
            }
          }
          if (!licenseValid) throw new Error('Account deactivated. Your institution license has expired.');
        }

        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', userData.name || auth.currentUser?.email || 'User');

        if (role === 'student') navigate('/student-dashboard', { replace: true });
        else if (role === 'super_admin') navigate('/super-admin', { replace: true });
        else navigate('/', { replace: true });
      } else {
        const fallbackRole = email.includes('super') ? 'super_admin' : 'teacher';
        localStorage.setItem('userRole', fallbackRole);
        localStorage.setItem('userName', auth.currentUser?.email || 'User');
        navigate(fallbackRole === 'super_admin' ? '/super-admin' : '/', { replace: true });
      }
    } catch (error) {
      setErrorMsg(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setResetMessage('Enter your email address first, then request a reset link.');
      return;
    }
    setIsResetting(true);
    setResetMessage('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage('Reset link sent. Check your inbox and spam folder.');
    } catch (error) {
      setResetMessage(friendlyAuthError(error));
    } finally {
      setIsResetting(false);
    }
  };

  const entrance = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="min-h-screen w-full bg-[#eef1f8] text-[#1a2340] lg:grid lg:grid-cols-[minmax(420px,0.95fr)_minmax(480px,1.05fr)]">
      {/* Left brand panel */}
      <section
        className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1b45] via-[#16277a] to-[#2b48c9] px-8 py-10 text-white sm:px-12 sm:py-12 lg:min-h-screen lg:px-16 lg:py-16"
        aria-label="Language Lab AI introduction"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_10%_10%,rgba(120,160,255,0.35)_0,transparent_35%),radial-gradient(circle_at_90%_85%,rgba(60,90,220,0.4)_0,transparent_40%)]" />

        <motion.div {...entrance} transition={{ duration: 0.55 }} className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
            <Languages className="h-6 w-6" strokeWidth={2.2} />
          </div>
        </motion.div>

        <motion.div {...entrance} transition={{ duration: 0.65, delay: 0.1 }} className="relative z-10 max-w-lg">
          <h1 className="text-[clamp(2.1rem,4.2vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
            Welcome to the{' '}
            <span className="text-[#8fb2ff]">Language Laboratory Portal.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-[#c7d2f5]">
            Access your language courses, interactive media content, and real-time pronunciation assessments.
          </p>
        </motion.div>

        <motion.div
          {...entrance}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="relative z-10 mt-10 flex flex-col gap-3 sm:max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur-sm">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
              <Ear className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Immersive Audio Lab</p>
              <p className="text-xs text-[#b9c6f0]">High-fidelity listening exercises.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur-sm">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
              <Mic2 className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pronunciation AI</p>
              <p className="text-xs text-[#b9c6f0]">Real-time speech analysis and scoring.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur-sm">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
              <Sparkles className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Interactive Content</p>
              <p className="text-xs text-[#b9c6f0]">Engaging multimedia coursework.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Right form panel */}
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          {...entrance}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="w-full max-w-[440px] rounded-[22px] border border-[#e2e6f0] bg-white p-7 shadow-[0_20px_50px_rgba(20,30,70,0.08)] sm:p-9"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef1fb] text-[#2b48c9]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-[#6b7690]">Sign in to your account</p>
            </div>
          </div>

          <div className="mb-6 border-t border-[#eceff5]" />

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                aria-live="polite"
                className="flex gap-3 rounded-xl border border-[#f3c2c2] bg-[#fdf2f2] p-3.5 text-sm leading-5 text-[#9a3333]"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#2a3350]">
                Email address
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2ba] transition-colors group-focus-within:text-[#2b48c9]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g. name@institution.edu"
                  className="h-13 h-[52px] w-full rounded-xl border border-[#d7dced] bg-white pl-12 pr-4 text-[15px] text-[#1a2340] outline-none transition placeholder:text-[#a5adc4] hover:border-[#b7c0dd] focus:border-[#2b48c9] focus:ring-4 focus:ring-[#2b48c9]/15"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-[#2a3350]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(true);
                    setResetMessage('');
                  }}
                  className="rounded-md text-sm font-semibold text-[#2b48c9] outline-none hover:text-[#1e35a3] hover:underline focus-visible:ring-2 focus-visible:ring-[#2b48c9] focus-visible:ring-offset-2"
                >
                  Forgot password?
                </button>
              </div>
              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2ba] transition-colors group-focus-within:text-[#2b48c9]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-13 h-[52px] w-full rounded-xl border border-[#d7dced] bg-white pl-12 pr-12 text-[15px] text-[#1a2340] outline-none transition placeholder:text-[#a5adc4] hover:border-[#b7c0dd] focus:border-[#2b48c9] focus:ring-4 focus:ring-[#2b48c9]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#7b869e] outline-none hover:bg-[#f1f3fa] hover:text-[#2a3350] focus-visible:ring-2 focus-visible:ring-[#2b48c9]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-[#5b6480]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-[#c3caE0] accent-[#2b48c9] focus:ring-[#2b48c9]"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex h-13 h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2b48c9] px-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(43,72,201,0.28)] outline-none transition hover:-translate-y-0.5 hover:bg-[#233ea8] hover:shadow-[0_16px_34px_rgba(43,72,201,0.32)] focus-visible:ring-4 focus-visible:ring-[#2b48c9]/40 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing inâ€¦
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[#eef1fb] px-3.5 py-3 text-xs leading-5 text-[#3d4a7a]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2b48c9]" />
            Your session is encrypted. Use a trusted device when choosing to stay signed in.
          </div>

          <p className="mt-6 text-center text-xs text-[#8a93ab]">
            Need access? Contact your institution's language lab administrator.
          </p>
        </motion.div>
      </section>

      {showReset && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0b1b45]/55 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
        >
          <motion.form
            onSubmit={handlePasswordReset}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[#eef1fb] text-[#2b48c9]">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 id="reset-title" className="text-2xl font-semibold tracking-tight text-[#1a2340]">
                  Reset your password
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#6b7690]">
                  We'll email a secure reset link to the address below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                aria-label="Close password reset"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#7b869e] outline-none hover:bg-[#f1f3fa] focus-visible:ring-2 focus-visible:ring-[#2b48c9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label htmlFor="reset-email" className="mb-2 mt-6 block text-sm font-semibold text-[#2a3350]">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#d7dced] bg-white px-4 text-[15px] outline-none focus:border-[#2b48c9] focus:ring-4 focus:ring-[#2b48c9]/15"
            />
            {resetMessage && (
              <div
                aria-live="polite"
                className="mt-4 flex gap-2 rounded-xl bg-[#eef1fb] p-3 text-sm leading-5 text-[#2b48c9]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {resetMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={isResetting}
              className="mt-5 h-12 w-full rounded-xl bg-[#2b48c9] text-sm font-semibold text-white outline-none hover:bg-[#233ea8] focus-visible:ring-4 focus-visible:ring-[#2b48c9]/40 disabled:cursor-wait disabled:opacity-70"
            >
              {isResetting ? 'Sending linkâ€¦' : 'Send reset link'}
            </button>
          </motion.form>
        </div>
      )}
    </main>
  );
}
