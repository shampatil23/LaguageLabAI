import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Send, Megaphone, Trash2, Clock, Users, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { auth, database } from '../lib/firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { cn } from '../lib/utils';

type Notice = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'urgent';
    teacherId: string;
    teacherName: string;
    createdAt: string;
};

const typeConfig = {
    info: { label: 'Info', icon: Info, color: 'bg-blue-50 border-blue-200 text-blue-800', badge: 'bg-blue-100 text-blue-700' },
    warning: { label: 'Warning', icon: AlertTriangle, color: 'bg-amber-50 border-amber-200 text-amber-800', badge: 'bg-amber-100 text-amber-700' },
    success: { label: 'Good News', icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700' },
    urgent: { label: 'Urgent', icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-800', badge: 'bg-red-100 text-red-700' },
};

export default function Broadcast() {
    const role = localStorage.getItem('userRole') || 'teacher';
    const [notices, setNotices] = useState<Notice[]>([]);
    const [teacherData, setTeacherData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', type: 'info' as Notice['type'] });
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            if (!user) return;

            // Get teacher data
            onValue(ref(database, 'users/' + user.uid), snap => {
                if (snap.exists()) setTeacherData({ uid: user.uid, ...snap.val() });
            });

            // Listen to notices
            onValue(ref(database, 'notices'), snap => {
                if (snap.exists()) {
                    const data = snap.val();
                    let list: Notice[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
                    // Students see all notices; teachers see only their own
                    if (role === 'teacher') {
                        list = list.filter(n => n.teacherId === user.uid);
                    }
                    setNotices(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                } else {
                    setNotices([]);
                }
            });
        });
        return () => unsubAuth();
    }, [role]);

    const handleSend = async () => {
        if (!form.title.trim() || !form.message.trim() || !teacherData) return;
        setLoading(true);
        try {
            const noticeRef = push(ref(database, 'notices'));
            await set(noticeRef, {
                title: form.title.trim(),
                message: form.message.trim(),
                type: form.type,
                teacherId: teacherData.uid,
                teacherName: teacherData.name || teacherData.email || 'Teacher',
                createdAt: new Date().toISOString(),
            });
            setForm({ title: '', message: '', type: 'info' });
            setSent(true);
            setTimeout(() => setSent(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this notice?')) {
            await remove(ref(database, 'notices/' + id));
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {role === 'student' ? 'Notices & Announcements' : 'Broadcast Notice'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {role === 'student'
                            ? 'Messages and announcements from your teacher.'
                            : 'Send announcements to all your students. Messages appear on their dashboard.'}
                    </p>
                </div>
            </div>

            {/* TEACHER COMPOSE FORM */}
            {role !== 'student' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Send className="w-4 h-4 text-primary-600" /> New Broadcast
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {/* Type selector */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Notice Type</label>
                            <div className="flex gap-2 flex-wrap">
                                {(Object.keys(typeConfig) as Notice['type'][]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setForm(f => ({ ...f, type: t }))}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                            form.type === t
                                                ? typeConfig[t].badge + ' border-current ring-2 ring-offset-1 ring-current/30'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        )}
                                    >
                                        {typeConfig[t].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Title</label>
                            <input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g., Exam next Monday at 10 AM"
                                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Message</label>
                            <textarea
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                rows={4}
                                placeholder="Write your announcement here..."
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <Button
                                onClick={handleSend}
                                disabled={!form.title.trim() || !form.message.trim() || loading}
                                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {loading ? 'Sending...' : 'Send to All Students'}
                            </Button>
                            {sent && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                                    <CheckCircle className="w-4 h-4" /> Broadcast sent!
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* NOTICES LIST */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        {role === 'student' ? 'Recent Announcements' : 'Your Broadcasts'}
                    </h2>
                    {notices.length > 0 && (
                        <span className="text-xs text-slate-400">{notices.length} notice{notices.length !== 1 ? 's' : ''}</span>
                    )}
                </div>

                {notices.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">
                            {role === 'student' ? 'No announcements from your teacher yet.' : 'No broadcasts sent yet. Send your first notice above.'}
                        </p>
                    </div>
                ) : (
                    notices.map(n => {
                        const cfg = typeConfig[n.type] || typeConfig.info;
                        const Icon = cfg.icon;
                        return (
                            <div key={n.id} className={cn('rounded-xl border p-4 flex gap-4', cfg.color)}>
                                <div className="flex-shrink-0 mt-0.5">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-sm">{n.title}</p>
                                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
                                        </div>
                                        {role !== 'student' && (
                                            <button onClick={() => handleDelete(n.id)} className="text-current/40 hover:text-red-500 transition-colors flex-shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm mt-1 whitespace-pre-wrap">{n.message}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs opacity-60">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{n.teacherName}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
