import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { 
  Users, 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  FileText, 
  PlayCircle, 
  Plus, 
  Mic,
  AlertTriangle,
  CreditCard,
  Loader2,
  Calendar
} from 'lucide-react';
import { currentClasses, recentActivities, studentPerformanceData } from '../mockData';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { auth, database } from '../lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { cn } from '../lib/utils';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<any>(null);
  const [renewing, setRenewing] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewStep, setRenewStep] = useState<'select_plan' | 'payment_details'>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState('50_students_1_year');
  const [transactionId, setTransactionId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentSenderUpi, setPaymentSenderUpi] = useState('');
  const [zapPayUpi, setZapPayUpi] = useState('');

  const plans = {
    '50_students_1_month': { name: 'Up to 50 Students (1 Month)', price: 1500, limit: 50 },
    '50_students_3_months': { name: 'Up to 50 Students (3 Months)', price: 4000, limit: 50 },
    '50_students_6_months': { name: 'Up to 50 Students (6 Months)', price: 8000, limit: 50 },
    '50_students_1_year': { name: 'Up to 50 Students (1 Year)', price: 15000, limit: 50 },
    '100_students_1_month': { name: 'Up to 100 Students (1 Month)', price: 2500, limit: 100 },
    '100_students_3_months': { name: 'Up to 100 Students (3 Months)', price: 7000, limit: 100 },
    '100_students_6_months': { name: 'Up to 100 Students (6 Months)', price: 13500, limit: 100 },
    '100_students_1_year': { name: 'Up to 100 Students (1 Year)', price: 25000, limit: 100 },
    '200_students_1_month': { name: 'Up to 200 Students (1 Month)', price: 4500, limit: 200 },
    '200_students_3_months': { name: 'Up to 200 Students (3 Months)', price: 12500, limit: 200 },
    '200_students_6_months': { name: 'Up to 200 Students (6 Months)', price: 24000, limit: 200 },
    '200_students_1_year': { name: 'Up to 200 Students (1 Year)', price: 45000, limit: 200 },
    '500_students_1_month': { name: 'Up to 500 Students (1 Month)', price: 8000, limit: 500 },
    '500_students_3_months': { name: 'Up to 500 Students (3 Months)', price: 22000, limit: 500 },
    '500_students_6_months': { name: 'Up to 500 Students (6 Months)', price: 42000, limit: 500 },
    '500_students_1_year': { name: 'Up to 500 Students (1 Year)', price: 80000, limit: 500 }
  };

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [currentUid, setCurrentUid] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUid(user.uid);
      } else {
        setCurrentUid(null);
      }
    });

    const settingsRef = ref(database, 'settings/zapPayUpi');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      setZapPayUpi(snapshot.val() || 'admin@upi');
    });

    return () => {
      unsubAuth();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!currentUid) return;
    
    // Fetch user/institution info
    const instRef = ref(database, 'users/' + currentUid);
    const unsubInst = onValue(instRef, (snapshot) => {
      setInstitution(snapshot.val());
    });

    // Fetch payment history (requests)
    const requestsRef = ref(database, 'licenseRequests');
    const unsubReq = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reqList = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter(req => req.institutionId === currentUid)
          .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        setPaymentHistory(reqList);
      } else {
        setPaymentHistory([]);
      }
    });

    return () => {
      unsubInst();
      unsubReq();
    };
  }, [currentUid]);

  const handleRenewRequest = async () => {
    if (!currentUid || !transactionId || !paymentName || !paymentSenderUpi) {
      alert('Please fill all the details (Name, Sender UPI ID, and UTR)');
      return;
    }
    setRenewing(true);
    try {
      const newReqRef = push(ref(database, 'licenseRequests'));
      await set(newReqRef, {
        institutionId: currentUid,
        institutionName: institution?.name || 'Unknown',
        amount: plans[selectedPlan as keyof typeof plans].price,
        duration: selectedPlan,
        studentLimit: plans[selectedPlan as keyof typeof plans].limit,
        transactionId: transactionId,
        paymentName: paymentName,
        paymentSenderUpi: paymentSenderUpi,
        status: 'pending',
        requestDate: new Date().toISOString()
      });
      alert('Renewal request submitted successfully! Waiting for Super Admin approval.');
      setShowRenewModal(false);
      setTransactionId('');
      setPaymentName('');
      setPaymentSenderUpi('');
      setRenewStep('select_plan');
    } catch (err) {
      console.error(err);
      alert('Error submitting request');
    } finally {
      setRenewing(false);
    }
  };

  const isExpired = false; // Bypass license check
  
  // Pending request check
  const hasPendingRequest = paymentHistory.some(req => req.status === 'pending');

  if (institution && isExpired) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto mt-12">
        <div className="bg-error-50 border border-error-200 text-error-800 px-6 py-5 rounded-lg flex flex-col items-center text-center gap-4">
          <AlertTriangle className="w-12 h-12 text-error-600" />
          <div>
            <h2 className="text-xl font-bold mb-2">Institution License Expired</h2>
            <p className="text-sm">
              Your institution's license has expired. Your dashboard and all associated student accounts are currently deactivated. 
              Please renew your license to restore access.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Renew License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-slate-600">
              1 Year Enterprise License extension. Cost: <span className="font-semibold text-slate-900">₹15,000</span>
            </p>
            {hasPendingRequest ? (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm border border-amber-200">
                You have a pending renewal request. Please wait for Super Admin approval.
              </div>
            ) : (
              <Button onClick={() => { { setShowRenewModal(true); setRenewStep('select_plan'); }; setRenewStep('select_plan'); }} size="lg" className="w-full sm:w-auto">
                {renewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CreditCard className="w-4 h-4 mr-2" />
                Request Renewal
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {showRenewModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <CardTitle>Renew License</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-6">
              
              {renewStep === 'select_plan' ? (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-800">Select Plan Duration</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2">
                      {Object.entries(plans).map(([key, plan]) => (
                        <div 
                          key={key}
                          onClick={() => setSelectedPlan(key)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPlan === key ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="font-medium text-slate-900">{plan.name}</div>
                          <div className="text-sm text-slate-500">₹{plan.price.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <h4 className="font-semibold text-slate-800 text-sm mb-2">Scan & Pay</h4>
                    <p className="text-sm text-slate-600 mb-4">Please scan the QR code below to pay <strong className="text-slate-900">₹{plans[selectedPlan as keyof typeof plans].price.toLocaleString()}</strong>.</p>
                    <div className="flex justify-center mb-4">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${zapPayUpi}&pn=ZapPay&am=${plans[selectedPlan as keyof typeof plans].price}&cu=INR`)}`} 
                        alt="UPI QR Code" 
                        className="w-48 h-48 border rounded-lg shadow-sm mx-auto"
                      />
                    </div>
                    <p className="text-xs text-slate-500">UPI ID: <span className="font-mono text-slate-700">{zapPayUpi || 'Loading...'}</span></p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Your Name</label>
                      <Input value={paymentName} onChange={e => setPaymentName(e.target.value)} placeholder="e.g. John Doe" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Your UPI ID (used for payment)</label>
                      <Input value={paymentSenderUpi} onChange={e => setPaymentSenderUpi(e.target.value)} placeholder="e.g. john@upi" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Transaction ID (UTR)</label>
                      <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. 123456789012" required />
                      <p className="text-xs text-slate-500">Enter the 12-digit transaction ID from your payment app.</p>
                    </div>
                  </div>
                </>
              )}

            </CardContent>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowRenewModal(false)}>Cancel</Button>
              {renewStep === 'select_plan' ? (
                <Button onClick={() => setRenewStep('payment_details')}>Complete Payment</Button>
              ) : (
                <Button onClick={handleRenewRequest} disabled={renewing || !transactionId || !paymentName || !paymentSenderUpi}>
                  {renewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back. Here is today's overview for your classes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs text-slate-500 font-medium">License Valid Until</span>
            <span className="text-sm font-bold text-slate-900">
              {institution?.licenseExpiry ? new Date(institution.licenseExpiry).toLocaleDateString('en-GB') : 'N/A'}
            </span>
          </div>
          {hasPendingRequest ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Renewal Pending</Badge>
          ) : (
            <Button onClick={() => setShowRenewModal(true)} size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
              {renewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Renew License
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-2xl font-bold text-slate-900">105</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-lg flex items-center justify-center text-success-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Today's Attendance</p>
              <h3 className="text-2xl font-bold text-slate-900">94%</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-lg flex items-center justify-center text-warning-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Evaluations</p>
              <h3 className="text-2xl font-bold text-slate-900">12</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Speaking Score</p>
              <h3 className="text-2xl font-bold text-slate-900">78/100</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Class Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={studentPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="speaking" name="Speaking" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="listening" name="Listening" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="writing" name="Writing" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentClasses.map(cls => (
                <div key={cls.id} className="p-3 border border-slate-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-primary-600 transition-colors">{cls.name}</h4>
                    <Badge variant="outline" className="text-[10px]">{cls.room}</Badge>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 gap-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cls.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cls.students} Enrolled</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" size="sm">
                <Plus className="w-4 h-4 mr-2" /> View Full Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle>Payment & License History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed At</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">No payment history found.</TableCell>
                </TableRow>
              ) : (
                paymentHistory.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-slate-900">{new Date(payment.requestDate).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell className="text-slate-600">₹{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        payment.status === 'pending' ? "bg-amber-50 text-amber-700 ring-amber-600/20" : 
                        payment.status === 'approved' ? "bg-success-50 text-success-700 ring-success-600/20" : 
                        "bg-error-50 text-error-700 ring-error-600/20"
                      )}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{payment.processedAt ? new Date(payment.processedAt).toLocaleDateString('en-GB') : '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">{payment.reason || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
