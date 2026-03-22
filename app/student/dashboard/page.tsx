"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { LogOut, Video, FileText, BookOpen, Clock, User, ChevronDown, ChevronUp, Sparkles, Award, MessageCircleQuestion, Send } from "lucide-react";

interface Course {
    id: string;
    name: string;
    code: string;
    teacherId: string;
    teacherName?: string;
}

interface ClassSession {
    id: string;
    title: string;
    roomId: string; // VideoSDK Room ID
    status: 'active' | 'ended';
    createdAt: string;
    courseId?: string;
    notes?: { url: string; name: string }[];
    attendance?: { uid: string; name: string; timestamp: string }[];
}

interface Doubt {
    id: string;
    studentId: string;
    studentName: string;
    teacherId: string;
    courseId: string;
    courseName: string;
    text: string;
    replyText?: string;
    status: 'pending' | 'resolved';
    createdAt: string;
    dateAsked: string;
}

import { Suspense } from "react";

// Main Content Component (Client Component using useSearchParams)
function DashboardContent() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get("courseId");

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [classes, setClasses] = useState<ClassSession[]>([]);

    const [activeClasses, setActiveClasses] = useState<ClassSession[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Doubts State
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [dailyDoubtCount, setDailyDoubtCount] = useState(0);
    const [doubtText, setDoubtText] = useState("");
    const [submittingDoubt, setSubmittingDoubt] = useState(false);
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch daily doubts for limit check
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "doubts"),
            where("studentId", "==", user.uid),
            where("dateAsked", "==", todayStr)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setDailyDoubtCount(snapshot.docs.length);
        });
        return () => unsubscribe();
    }, [user, todayStr]);

    // Fetch doubts for selected course
    useEffect(() => {
        if (!selectedCourse || !user) {
            setDoubts([]);
            return;
        }
        const q = query(
            collection(db, "doubts"),
            where("courseId", "==", selectedCourse.id),
            where("studentId", "==", user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doubt));
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setDoubts(data);
        });
        return () => unsubscribe();
    }, [selectedCourse, user]);

    const handleAskDoubt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!doubtText.trim() || !selectedCourse || !user) return;
        if (dailyDoubtCount >= 1) {
            toast.error("You have already asked a doubt today.");
            return;
        }

        setSubmittingDoubt(true);
        try {
            await addDoc(collection(db, "doubts"), {
                studentId: user.uid,
                studentName: profile?.displayName || user.email?.split('@')[0],
                teacherId: selectedCourse.teacherId,
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                text: doubtText.trim(),
                status: 'pending',
                createdAt: new Date().toISOString(),
                dateAsked: todayStr
            });
            setDoubtText("");
            toast.success("Doubt submitted successfully!");
        } catch (error) {
            console.error("Error submitting doubt", error);
            toast.error("Failed to submit doubt.");
        } finally {
            setSubmittingDoubt(false);
        }
    };

    // Dynamic Motivational Quotes
    const [quote, setQuote] = useState("");
    useEffect(() => {
        const quotes = [
            "Success is the sum of small efforts, repeated day in and day out.",
            "The expert in anything was once a beginner.",
            "Believe you can and you're halfway there.",
            "Don't watch the clock; do what it does. Keep going.",
            "Education is the most powerful weapon which you can use to change the world.",
            "The future belongs to those who believe in the beauty of their dreams.",
            "It always seems impossible until it's done.",
            "Your attitude, not your aptitude, will determine your altitude."
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setQuote(randomQuote);
    }, []);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile?.role === "admin") {
                router.push("/admin/dashboard");
            } else if (profile?.role === "teacher") {
                router.push("/teacher/dashboard");
            }
        }
    }, [user, profile, loading, router]);

    // Request Notification Permission
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    // Fetch Enrolled Courses
    useEffect(() => {
        if (!user) return;
        // Query courses where studentIds array contains user.uid
        const q = query(collection(db, "courses"), where("studentIds", "array-contains", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(data);

            // Logic to auto-select or maintain selection
            if (courseIdParam && !selectedCourse) {
                const courseToSelect = data.find(c => c.id === courseIdParam);
                if (courseToSelect) setSelectedCourse(courseToSelect);
            } else if (selectedCourse) {
                // Check if still enrolled
                const stillEnrolled = data.find(c => c.id === selectedCourse.id);
                if (!stillEnrolled) setSelectedCourse(null);
            }
        });
        return () => unsubscribe();
    }, [user, selectedCourse, courseIdParam]);

    // Fetch Classes for Selected Course
    useEffect(() => {
        if (!selectedCourse) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (classes.length > 0) setClasses([]);
            return;
        }

        const q = query(
            collection(db, "classes"),
            where("courseId", "==", selectedCourse.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as ClassSession));

            // Client-side sort to bypass Firestore Index requirement
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setClasses(data);

            // Notification Logic for New Active Classes
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const cls = change.doc.data();
                    const createdAt = new Date(cls.createdAt).getTime();
                    const now = Date.now();
                    const isRecent = (now - createdAt) < 60000 * 5; // 5 mins

                    if (cls.status === 'active' && isRecent) {
                        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                            const n = new Notification(`New Class: ${cls.title}`, {
                                body: `Course: ${selectedCourse.name}. Click to join!`,
                            });
                            n.onclick = () => {
                                window.focus();
                                router.push(`/class/${cls.roomId}`);
                            };
                        }
                        toast(`New class active: ${cls.title}`, { icon: '🔔' });
                    }
                }
            });

        }, (error) => {
            console.error("Firestore error:", error);
            if (error.code === 'failed-precondition') {
                toast.error("Database is optimizing... please wait a moment.");
            }
        });

        return () => unsubscribe();
    }, [selectedCourse, router]);

    // Fetch All Active Classes for Enrolled Courses (Global Dashboard)
    useEffect(() => {
        if (selectedCourse || courses.length === 0) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (activeClasses.length > 0) setActiveClasses([]);
            return;
        }

        const courseIds = courses.map(c => c.id);
        // Firestore 'in' query supports up to 10 values usually.
        // For safety, let's just slice first 10 for now or chunk it if needed.
        // Assuming user has < 10 active courses for MVP.
        const idsToCheck = courseIds.slice(0, 10);

        const q = query(
            collection(db, "classes"),
            where("courseId", "in", idsToCheck),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as ClassSession));
            // Sort by creation time
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActiveClasses(data);
        }, (error) => {
            console.error("Firestore error fetching active classes:", error);
        });

        return () => unsubscribe();
    }, [courses, selectedCourse]);


    if (loading || !user) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium tracking-wide">Loading your dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
            {/* Minimalist Top Navigation */}
            <nav className="bg-white shadow-sm border-b border-slate-200 z-10 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-blue-900 tracking-tight font-serif flex items-center gap-2">
                                <BookOpen className="text-blue-600" size={24} /> TutorIN
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline text-sm font-medium text-slate-600">{user.email}</span>
                            <button
                                onClick={() => router.push("/profile")}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                                title="Edit Profile"
                            >
                                <User size={20} />
                            </button>
                            <button
                                onClick={() => signOut(auth)}
                                className="p-2 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 flex flex-col gap-8 py-8">
                
                {/* Hero / Motivational Section */}
                <section className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-violet-800 rounded-2xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-3 tracking-tight">
                            Welcome back, {profile?.displayName || user.email?.split('@')[0]}!
                        </h2>
                        <p className="text-blue-100 text-lg flex sm:items-center items-start gap-2 min-h-[28px]">
                            <Sparkles className="text-emerald-400 shrink-0 mt-1 sm:mt-0" size={20} />
                            <span>{quote ? `"${quote}" Let's conquer today's goals.` : "Loading inspiration..."}</span>
                        </p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 right-1/4 mb-[-40px] w-32 h-32 bg-emerald-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
                </section>

                <div className="w-full flex flex-col md:flex-row items-start gap-8">
                    {/* Left Sidebar: Course List */}
                    <aside className="w-full md:w-1/3 lg:w-1/4 bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden shrink-0">
                        <div
                            className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center cursor-pointer md:cursor-default"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                                <Award className="text-violet-500" size={18} /> ENROLLED COURSES
                            </h2>
                            <div className="md:hidden text-slate-400">
                                {isSidebarOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>
                        <ul className={`divide-y divide-slate-50 ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
                            {courses.map(course => (
                                <li
                                    key={course.id}
                                    onClick={() => {
                                        setSelectedCourse(course);
                                        setIsSidebarOpen(false); // Close on mobile selection
                                    }}
                                    className={`p-4 transition-all duration-200 cursor-pointer border-l-4 ${selectedCourse?.id === course.id ? 'bg-blue-50/50 border-blue-600' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-300'}`}
                                >
                                    <p className={`text-xs font-bold tracking-wider mb-1 ${selectedCourse?.id === course.id ? 'text-blue-700' : 'text-slate-500'}`}>{course.code}</p>
                                    <p className={`font-semibold truncate ${selectedCourse?.id === course.id ? 'text-blue-900' : 'text-slate-700'}`}>{course.name}</p>
                                </li>
                            ))}
                            {courses.length === 0 && (
                                <li className="p-6 text-sm text-slate-400 text-center italic">
                                    You are not enrolled in any courses yet.
                                </li>
                            )}
                        </ul>
                    </aside>

                    {/* Right Content: Details & History */}
                    <section className="flex-1 w-full space-y-6">
                        {!selectedCourse ? (
                            <div className="space-y-6">
                                {/* Global Live Classes (No course selected) */}
                                <div className="bg-white shadow-sm border border-slate-100 rounded-xl p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center font-serif">
                                        <span className="relative flex h-3 w-3 mr-3 mt-1">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        Live Classes Happening Now
                                    </h2>
                                    {activeClasses.length > 0 ? (
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeClasses.map(cls => {
                                                const course = courses.find(c => c.id === cls.courseId);
                                                return (
                                                    <li key={cls.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
                                                        <div className="flex flex-col h-full justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="text-lg font-bold text-slate-800 leading-tight">{cls.title}</h4>
                                                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase animate-pulse">Live</span>
                                                                </div>
                                                                <p className="text-sm text-blue-700 font-medium mb-3">{course?.name} ({course?.code})</p>
                                                                <p className="text-xs text-slate-500 flex items-center mb-4">
                                                                    <Clock size={12} className="mr-1.5 opacity-70" />
                                                                    Started at {new Date(cls.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    const alreadyJoined = cls.attendance?.some((a) => a.uid === user.uid);
                                                                    if (!alreadyJoined) {
                                                                        try {
                                                                            const classRef = doc(db, "classes", cls.id);
                                                                            await updateDoc(classRef, {
                                                                                attendance: arrayUnion({
                                                                                    uid: user.uid,
                                                                                    name: profile?.displayName || user.email,
                                                                                    timestamp: new Date().toISOString()
                                                                                })
                                                                            });
                                                                        } catch (err) {
                                                                            console.error("Error logging attendance", err);
                                                                        }
                                                                    }
                                                                    router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${cls.courseId}`);
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                                            >
                                                                <Video size={16} /> Enter Classroom
                                                            </button>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                            <p className="text-slate-500 font-medium">No live classes running at the moment.</p>
                                            <p className="text-sm text-slate-400 mt-1">Take a deep breath and review your notes.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Selected Course Focus View */}
                                <div className="bg-white shadow-sm border border-slate-100 rounded-xl p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-bl-full opacity-50 z-0 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-widest">{selectedCourse.code}</span>
                                            <span className="text-xs text-slate-400 font-medium">Instructor: {selectedCourse.teacherId.slice(0, 8)}...</span>
                                        </div>
                                        <h2 className="text-3xl font-serif font-bold text-slate-800">{selectedCourse.name}</h2>
                                    </div>
                                </div>

                                {/* Class Stream / Materials */}
                                <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="text-blue-500" size={20} /> Course Feed
                                        </h3>
                                    </div>
                                    <ul className="divide-y divide-slate-100">
                                        {classes.map(cls => (
                                            <li key={cls.id} className="p-8 hover:bg-slate-50/30 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <h4 className="text-xl font-bold text-slate-800 mb-1">{cls.title}</h4>
                                                        <p className="text-sm text-slate-500 flex items-center">
                                                            <Clock size={14} className="mr-1.5 opacity-70" />
                                                            {new Date(cls.createdAt).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cls.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {cls.status}
                                                        </span>
                                                        {cls.status === 'active' && (
                                                            <button
                                                                onClick={async () => {
                                                                    const alreadyJoined = cls.attendance?.some((a) => a.uid === user.uid);
                                                                    if (!alreadyJoined) {
                                                                        try {
                                                                            const classRef = doc(db, "classes", cls.id);
                                                                            await updateDoc(classRef, {
                                                                                attendance: arrayUnion({
                                                                                    uid: user.uid,
                                                                                    name: profile?.displayName || user.email,
                                                                                    timestamp: new Date().toISOString()
                                                                                })
                                                                            });
                                                                        } catch (err) {
                                                                            console.error("Error logging attendance", err);
                                                                        }
                                                                    }
                                                                    router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${selectedCourse?.id}`);
                                                                }}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                                                            >
                                                                <Video size={16} className="mr-2" /> Join Session
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Study Materials/Notes Section */}
                                                {cls.notes && cls.notes.length > 0 && (
                                                    <div className="mt-5 bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                                                        <h5 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                            <BookOpen size={14} /> Study Materials
                                                        </h5>
                                                        <ul className="space-y-2">
                                                            {cls.notes.map((note, i) => (
                                                                <li key={i} className="flex items-start">
                                                                    <div className="bg-blue-100 p-1.5 rounded mr-3 mt-0.5 text-blue-600">
                                                                        <FileText size={14} />
                                                                    </div>
                                                                    <a 
                                                                        href={note.url} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className="text-sm font-medium text-slate-700 hover:text-blue-700 transition-colors py-1"
                                                                    >
                                                                        {note.name}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </li>
                                        ))}

                                        {classes.length === 0 && (
                                            <li className="p-12 text-center">
                                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-slate-400">
                                                    <BookOpen size={24} />
                                                </div>
                                                <p className="text-slate-500 font-medium">No sessions scheduled yet.</p>
                                                <p className="text-sm text-slate-400 mt-1">Check back later or review previous coursework.</p>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* Doubt Solving Widget */}
                                <div className="mt-6 bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <MessageCircleQuestion className="text-blue-500" size={20} /> Ask Your Teacher
                                        </h3>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${dailyDoubtCount >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {dailyDoubtCount >= 1 ? 'Daily Limit Reached' : '1 Doubt Remaining Today'}
                                        </span>
                                    </div>
                                    <div className="p-8">
                                        <form onSubmit={handleAskDoubt} className="mb-6 relative">
                                            <textarea
                                                className={`w-full border border-slate-300 rounded-xl shadow-sm p-4 text-sm resize-none focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none transition-shadow ${dailyDoubtCount >= 1 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                rows={3}
                                                placeholder={dailyDoubtCount >= 1 ? "You've asked your daily doubt! Check back tomorrow." : "Describe your doubt clearly..."}
                                                value={doubtText}
                                                onChange={(e) => setDoubtText(e.target.value)}
                                                disabled={submittingDoubt || dailyDoubtCount >= 1}
                                                required
                                            ></textarea>
                                            <button
                                                type="submit"
                                                aria-label="Submit Doubt"
                                                disabled={submittingDoubt || !doubtText.trim() || dailyDoubtCount >= 1}
                                                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </form>

                                        {doubts.length > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Your Past Doubts</h4>
                                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                                    {doubts.map(doubt => (
                                                        <div key={doubt.id} className={`p-4 rounded-xl border ${doubt.status === 'resolved' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${doubt.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {doubt.status}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    {new Date(doubt.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 font-medium mb-2">{doubt.text}</p>
                                                            {doubt.replyText && (
                                                                <div className="mt-3 pt-3 border-t border-emerald-100/50">
                                                                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                        <User size={12} /> Teacher&apos;s Reply
                                                                    </p>
                                                                    <p className="text-sm text-slate-600 italic">&quot;{doubt.replyText}&quot;</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

// Wrap in Suspense for Next.js build requirement
export default function StudentDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

