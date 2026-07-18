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
    <main className="min-h-screen bg-[#f4f7fb] text-[#172033] lg:grid lg:grid-cols-[minmax(460px,0.92fr)_minmax(540px,1.08fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#10243f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14" aria-label="Language Lab AI introduction">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_15%,#67d4c0_0,transparent_28%),radial-gradient(circle_at_82%_76%,#477cc1_0,transparent_32%)]" />
        <div className="absolute -right-28 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-[#78e0cc]/20" />
        <div className="absolute -right-12 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full border border-[#78e0cc]/25" />

        <motion.div {...entrance} transition={{ duration: 0.55 }} className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#78e0cc] text-[#10243f] shadow-[0_10px_30px_rgba(120,224,204,0.18)]">
            <Languages className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9eb0c6]">Digital learning suite</p>
            <p className="text-lg font-semibold tracking-tight">Language Lab AI</p>
          </div>
        </motion.div>

        <motion.div {...entrance} transition={{ duration: 0.65, delay: 0.1 }} className="relative z-10 max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b7c7d9]">
            <Sparkles className="h-3.5 w-3.5 text-[#78e0cc]" />
            Listen · speak · improve
          </div>
          <h1 className="max-w-lg text-[clamp(2.9rem,5vw,5.25rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
            Every voice has a new language in it.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#b7c7d9]">
            Step back into your courses, pronunciation practice, and instructor feedback—all in one focused workspace.
          </p>

          <div className="mt-10 max-w-md rounded-[22px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[#91a6bd]">
              <span>Live pronunciation</span>
              <span className="flex items-center gap-1.5 text-[#78e0cc]"><span className="h-1.5 w-1.5 rounded-full bg-[#78e0cc]" />Listening</span>
            </div>
            <div className="my-5 flex h-12 items-center gap-1" aria-hidden="true">
              {[18, 30, 20, 43, 28, 54, 38, 66, 32, 48, 24, 58, 36, 25, 44, 18, 32, 22, 14].map((height, index) => (
                <span key={index} className="w-1 flex-1 rounded-full bg-[#78e0cc]" style={{ height: `${height}%`, opacity: 0.35 + (index % 4) * 0.15 }} />
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-white/10 pt-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#78e0cc] text-[#10243f]"><Mic2 className="h-4 w-4" /></div>
              <p className="text-sm text-[#dce7f2]"><span className="text-[#78e0cc]">Great rhythm.</span> Try softening the final consonant.</p>
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 flex items-center gap-6 text-xs font-medium text-[#91a6bd]">
          <span className="flex items-center gap-2"><Ear className="h-4 w-4" />Listening labs</span>
          <span className="flex items-center gap-2"><Headphones className="h-4 w-4" />Guided practice</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Secure access</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
        <div className="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#10243f] text-[#78e0cc]"><Languages className="h-5 w-5" /></div>
          <span className="font-semibold tracking-tight text-[#10243f]">Language Lab AI</span>
        </div>

        <motion.div {...entrance} transition={{ duration: 0.55, delay: 0.08 }} className="w-full max-w-[450px] pt-16 lg:pt-0">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#397a70]">Welcome back</p>
          <h2 className="text-[2.35rem] font-semibold leading-tight tracking-[-0.04em] text-[#10243f] sm:text-[2.7rem]">Continue your learning.</h2>
          <p className="mt-3 text-[15px] leading-6 text-[#68758a]">Sign in with the account provided by your institution.</p>

          <form onSubmit={handleLogin} className="mt-9 space-y-5" noValidate>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert" aria-live="polite" className="flex gap-3 rounded-2xl border border-[#efb3b3] bg-[#fff3f3] p-3.5 text-sm leading-5 text-[#9a3333]">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#26364f]">Email address</label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b5] transition-colors group-focus-within:text-[#397a70]" />
                <input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@institution.edu" className="h-14 w-full rounded-2xl border border-[#ced7e3] bg-white pl-12 pr-4 text-[15px] text-[#172033] shadow-[0_1px_2px_rgba(16,36,63,0.03)] outline-none transition placeholder:text-[#a2adbd] hover:border-[#aab7c8] focus:border-[#397a70] focus:ring-4 focus:ring-[#78e0cc]/20" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-[#26364f]">Password</label>
                <button type="button" onClick={() => { setShowReset(true); setResetMessage(''); }} className="rounded-md text-sm font-semibold text-[#397a70] outline-none hover:text-[#285e56] hover:underline focus-visible:ring-2 focus-visible:ring-[#397a70] focus-visible:ring-offset-2">Forgot password?</button>
              </div>
              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b5] transition-colors group-focus-within:text-[#397a70]" />
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-14 w-full rounded-2xl border border-[#ced7e3] bg-white pl-12 pr-12 text-[15px] text-[#172033] shadow-[0_1px_2px_rgba(16,36,63,0.03)] outline-none transition placeholder:text-[#a2adbd] hover:border-[#aab7c8] focus:border-[#397a70] focus:ring-4 focus:ring-[#78e0cc]/20" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#748298] outline-none hover:bg-[#edf2f7] hover:text-[#26364f] focus-visible:ring-2 focus-visible:ring-[#397a70]">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-[#56657a]">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-[#b8c3d1] accent-[#397a70] focus:ring-[#397a70]" />
              Keep me signed in on this device
            </label>

            <button type="submit" disabled={isSubmitting} className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#10243f] px-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(16,36,63,0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-[#17304f] hover:shadow-[0_16px_34px_rgba(16,36,63,0.22)] focus-visible:ring-4 focus-visible:ring-[#78e0cc]/55 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70">
              {isSubmitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Signing in…</> : <>Sign in securely<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
            </button>
          </form>

          <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[#e9f3f1] px-3.5 py-3 text-xs leading-5 text-[#4b6965]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#397a70]" />
            Your session is encrypted. Use a trusted device when choosing to stay signed in.
          </div>

          <p className="mt-8 text-center text-xs text-[#8290a3]">Need access? Contact your institution’s language lab administrator.</p>
        </motion.div>
      </section>

      {showReset && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10243f]/55 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <motion.form onSubmit={handlePasswordReset} initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[#e9f3f1] text-[#397a70]"><Mail className="h-5 w-5" /></div>
                <h3 id="reset-title" className="text-2xl font-semibold tracking-[-0.03em] text-[#10243f]">Reset your password</h3>
                <p className="mt-2 text-sm leading-6 text-[#68758a]">We’ll email a secure reset link to the address below.</p>
              </div>
              <button type="button" onClick={() => setShowReset(false)} aria-label="Close password reset" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#748298] outline-none hover:bg-[#edf2f7] focus-visible:ring-2 focus-visible:ring-[#397a70]"><X className="h-5 w-5" /></button>
            </div>
            <label htmlFor="reset-email" className="mb-2 mt-6 block text-sm font-semibold text-[#26364f]">Email address</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-13 w-full rounded-xl border border-[#ced7e3] bg-white px-4 text-[15px] outline-none focus:border-[#397a70] focus:ring-4 focus:ring-[#78e0cc]/20" />
            {resetMessage && <div aria-live="polite" className="mt-4 flex gap-2 rounded-xl bg-[#eef5f4] p-3 text-sm leading-5 text-[#397a70]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{resetMessage}</div>}
            <button type="submit" disabled={isResetting} className="mt-5 h-12 w-full rounded-xl bg-[#10243f] text-sm font-semibold text-white outline-none hover:bg-[#17304f] focus-visible:ring-4 focus-visible:ring-[#78e0cc]/55 disabled:cursor-wait disabled:opacity-70">{isResetting ? 'Sending link…' : 'Send reset link'}</button>
          </motion.form>
        </div>
      )}
    </main>
  );
}
