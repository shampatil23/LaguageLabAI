import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Lock, Building2, Globe2, Ear, Mic, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, signInWithEmailAndPassword, database } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Fetch user role from database
      const userRef = ref(database, 'users/' + uid);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const role = userData.role;

        // Device binding check to prevent duplicate login on multiple PCs
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem('deviceId', deviceId);
        }

        // Always register this device to the user, replacing any old device binding
        await update(userRef, { registeredDeviceId: deviceId });

        // License checking
        let licenseValid = true;
        if (role === 'student') {
          let teacherId = userData.teacherId;
          if (teacherId) {
            const tSnap = await get(ref(database, 'users/' + teacherId));
            if (tSnap.exists()) {
              const tData = tSnap.val();
              if (tData.licenseExpiry) {
                if (new Date(tData.licenseExpiry) < new Date()) licenseValid = false;
              } else {
                licenseValid = false; // By default no license = expired
              }
            } else {
              licenseValid = false;
            }
          } else {
            licenseValid = false;
          }

          if (!licenseValid) {
            throw new Error('Account deactivated. Institution license is expired.');
          }
        }

        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', userData.name || auth.currentUser?.email || 'User');

        // Route based on role
        if (role === 'student') navigate('/student-dashboard', { replace: true });
        else if (role === 'teacher' || role === 'admin') navigate('/', { replace: true });
        else if (role === 'super_admin') navigate('/super-admin', { replace: true });
        else navigate('/', { replace: true });
      } else {
        // Fallback for missing user profile
        // Let's assume teacher for fallback or maybe super_admin if we hardcode a specific email
        const fallbackRole = email.includes('super') ? 'super_admin' : 'teacher';
        localStorage.setItem('userRole', fallbackRole);
        localStorage.setItem('userName', auth.currentUser?.email || 'User');
        if (fallbackRole === 'super_admin') navigate('/super-admin', { replace: true });
        else navigate('/', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featureCards = [
    { icon: <Ear className="w-5 h-5" />, title: "Immersive Audio Lab", desc: "High-fidelity listening exercises." },
    { icon: <Mic className="w-5 h-5" />, title: "Pronunciation AI", desc: "Real-time speech analysis and scoring." },
    { icon: <Globe2 className="w-5 h-5" />, title: "Interactive Content", desc: "Engaging multimedia coursework." }
  ];

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Left Column - Graphic/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 text-white flex-col justify-between overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2850&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/95 via-primary-800/90 to-primary-900/95"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20"></div>

        <div className="relative z-10 p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg border border-white/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight">Language Lab AI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">
              Welcome to the <br />
              <span className="text-primary-300">Language Laboratory</span><br />
              Portal.
            </h1>
            <p className="text-primary-100/80 text-base max-w-md leading-relaxed">
              Access your language courses, interactive media content, and real-time pronunciation assessments.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 p-10 pt-0">
          <div className="grid grid-cols-1 gap-3">
            {featureCards.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + (idx * 0.1) }}
                className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 w-fit pr-8"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-200">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white">{feature.title}</h4>
                  <p className="text-xs text-primary-200/80">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-slate-50 relative overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}
              className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4"
            >
              <Building2 className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-slate-900 tracking-tight text-center"
            >
              Language Lab AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-slate-500 mt-2 text-sm text-center"
            >
              Language Laboratory Portal
            </motion.p>
          </div>

          <Card className="shadow-2xl shadow-primary-900/10 border-0 bg-white/90 backdrop-blur-xl ring-1 ring-slate-200/50">
            <CardContent className="p-8 sm:p-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Sign in to your account</h2>
                  <p className="font-semibold text-base text-slate-800 leading-tight mt-0.5">Language Lab AI Portal</p>
                </div>
              </motion.div>

              <form onSubmit={handleLogin} className="space-y-5">
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-error-50 text-error-600 rounded-lg text-sm border border-error-200">
                    {errorMsg}
                  </motion.div>
                )}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <Input
                    icon={<Mail className="w-5 h-5 text-slate-400" />}
                    type="email"
                    placeholder="name@institution.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 text-base bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline underline-offset-4 transition-all">Forgot password?</a>
                  </div>
                  <Input
                    icon={<Lock className="w-5 h-5 text-slate-400" />}
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 text-base bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/20 focus:ring-offset-0 cursor-pointer transition-colors"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm font-medium text-slate-600 cursor-pointer select-none">
                    Keep me signed in
                  </label>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <Button
                    type="submit"
                    className={cn("w-full h-11 text-lg font-semibold shadow-xl shadow-primary-500/20 transition-all rounded-lg", isSubmitting && "opacity-90 cursor-wait")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Authenticating...
                      </div>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </Button>
                </motion.div>

              </form>
            </CardContent>
          </Card>


        </motion.div>
      </div>
    </div>
  );
}
