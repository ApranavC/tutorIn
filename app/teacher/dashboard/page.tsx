"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { generateToken, createRoom } from "../../../lib/videoService";
import { db, auth } from "../../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { Copy, Plus, Video, LogOut, FileText, BookOpen, Clock, User, MessageCircleQuestion, Send, CheckCircle2 } from "lucide-react";
import AcademicHub from "@/components/academic/AcademicHub";
import type { Course, ClassSession, Doubt } from "@/types";

export default function TeacherDashboard() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    // Data Strings
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [activeClasses, setActiveClasses] = useState<ClassSession[]>([]);

    // Action States
    const [creatingClass, setCreatingClass] = useState(false);
    const [newClassTitle, setNewClassTitle] = useState("");

    // Note Adding State
    const [addingNoteToClassId, setAddingNoteToClassId] = useState<string | null>(null);
    const [newNoteUrl, setNewNoteUrl] = useState("");
    const [newNoteName, setNewNoteName] = useState("");

    // Sync State
    const [syncingClassId, setSyncingClassId] = useState<string | null>(null);

    // Doubt State
    const [courseDoubts, setCourseDoubts] = useState<Doubt[]>([]);
    const [replyingToDoubtId, setReplyingToDoubtId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile?.role === "admin") {
                router.push("/admin/dashboard");
            } else if (profile?.role === "student") {
                router.push("/student/dashboard");
            }
        }
    }, [user, profile, loading, router]);

    // Fetch Assigned Courses
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(data);
            // Default select first course if none selected
            if (data.length > 0 && !selectedCourse) {
                // Don't auto-select to avoid jumping if they are browsing?
                // Actually auto-select is fine for initial load
            }
        });
        return () => unsubscribe();
    }, [user, selectedCourse]);

    // Fetch Active Classes (Global for Teacher)
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "classes"),
            where("teacherId", "==", user.uid),
            where("status", "==", "active")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
            // Sort by most recent
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActiveClasses(data);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch Classes for Selected Course
    useEffect(() => {
        if (!selectedCourse) {
            setClasses([]);
            return;
        }

        const q = query(
            collection(db, "classes"),
            where("courseId", "==", selectedCourse.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setClasses(data);
        });
        return () => unsubscribe();
    }, [selectedCourse]);

    // Fetch Doubts for Selected Course
    useEffect(() => {
        if (!selectedCourse || !user) {
            setCourseDoubts([]);
            return;
        }

        const q = query(
            collection(db, "doubts"),
            where("courseId", "==", selectedCourse.id),
            where("teacherId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doubt));
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setCourseDoubts(data);
        });

        return () => unsubscribe();
    }, [selectedCourse, user]);

    const handleResolveDoubt = async (doubtId: string) => {
        if (!replyText.trim()) return;
        setSubmittingReply(true);
        try {
            const doubtRef = doc(db, "doubts", doubtId);
            await updateDoc(doubtRef, {
                replyText: replyText.trim(),
                status: 'resolved'
            });
            setReplyingToDoubtId(null);
            setReplyText("");
            toast.success("Doubt resolved successfully!");
        } catch (error) {
            console.error("Error resolving doubt", error);
            toast.error("Failed to resolve doubt.");
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !newClassTitle) return;

        setCreatingClass(true);
        try {
            const token = await generateToken();
            const roomId = await createRoom(token);

            const docRef = await addDoc(collection(db, "classes"), {
                title: newClassTitle,
                courseId: selectedCourse.id, // Link to real course ID
                courseName: selectedCourse.name, // Denormalize for easier display if needed
                roomId,
                teacherId: user?.uid,
                teacherName: profile?.displayName || user?.email,
                status: "active",
                notes: [],
                createdAt: new Date().toISOString(),
            });

            toast.success("Class started!");
            setNewClassTitle("");
            // Redirect to class immediately
            router.push(`/class/${roomId}?classId=${docRef.id}&courseId=${selectedCourse.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to start class");
        } finally {
            setCreatingClass(false);
        }
    };

    const handleAddNote = async (classId: string) => {
        if (!newNoteUrl) return;
        try {
            const classRef = doc(db, "classes", classId);
            await updateDoc(classRef, {
                notes: arrayUnion({ url: newNoteUrl, name: newNoteName || "Note" })
            });
            toast.success("Note added");
            setAddingNoteToClassId(null);
            setNewNoteUrl("");
            setNewNoteName("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add note");
        }
    };

    const copyInvite = (roomId: string) => {
        const inviteLink = `${window.location.origin}/class/${roomId}`;
        navigator.clipboard.writeText(inviteLink);
        toast.success("Copied to clipboard");
    };

    const handleSyncAttendance = async (classId: string, roomId: string) => {
        setSyncingClassId(classId);
        try {
            const response = await fetch("/api/sync-attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, classId }),
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Attendance synced!");
            } else {
                toast.error("Sync failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to sync attendance");
        } finally {
            setSyncingClassId(null);
        }
    };

    if (loading || !user) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 z-10 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-serif font-bold text-blue-900 tracking-tight">TutorIN <span className="text-blue-600 text-lg font-sans font-medium">Educator Portal</span></h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline-block text-slate-600 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-full">{user.email}</span>
                            <button
                                onClick={() => router.push("/profile")}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                                title="Edit Profile"
                            >
                                <User size={20} />
                            </button>
                            <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-red-500 transition-colors" title="Logout">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 flex flex-col gap-8 py-8">
                
                {/* 1. Hero / "Live Now" Section (Always visible at the top) */}
                {activeClasses.length > 0 && (
                    <section className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                        <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            Active Sessions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                            {activeClasses.map(cls => {
                                const course = courses.find(c => c.id === cls.courseId);
                                return (
                                    <div key={cls.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 flex flex-col justify-between hover:bg-white/15 transition-all">
                                        <div>
                                            <h4 className="text-xl font-bold truncate leading-tight">{cls.title}</h4>
                                            <p className="text-blue-200 text-sm font-medium truncate mt-1">
                                                {course?.name || cls.courseName} <span className="opacity-75">({cls.courseId})</span>
                                            </p>
                                            <p className="text-xs text-blue-100 flex items-center mt-3 opacity-90 font-medium">
                                                <Clock size={12} className="mr-1.5" />
                                                Started {new Date(cls.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 mt-5">
                                            <button
                                                onClick={() => copyInvite(cls.roomId)}
                                                className="p-2.5 bg-white/10 hover:bg-white/25 rounded-lg transition-colors border border-transparent hover:border-white/30"
                                                title="Copy Invite Link"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${cls.courseId}`)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                                            >
                                                <Video size={16} /> Enter Classroom
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* 2. Educator Greeting & Course Grid */}
                <section className="animate-fade-in-up [animation-delay:100ms]">
                    <div className="mb-6">
                        <h2 className="text-2xl font-serif font-bold text-slate-800">Your Assigned Courses</h2>
                        <p className="text-slate-500 mt-1 font-medium">Select a course to manage past lessons and start new sessions.</p>
                    </div>
                    
                    {courses.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                            <BookOpen className="mx-auto h-12 w-12 text-blue-200 mb-4" />
                            <p className="text-lg font-medium text-slate-700">No courses assigned yet</p>
                            <p className="mt-1">Please contact your administrator to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    onClick={() => setSelectedCourse(course)}
                                    className={`group relative bg-white rounded-2xl p-6 cursor-pointer transition-all duration-200 border-2 ${
                                        selectedCourse?.id === course.id 
                                        ? 'border-blue-600 shadow-md ring-2 ring-blue-600/20 bg-blue-50/50 scale-[1.02]' 
                                        : 'border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2.5 rounded-xl transition-colors ${selectedCourse?.id === course.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                            <BookOpen size={20} />
                                        </div>
                                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg whitespace-nowrap">
                                            {course.code}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight">{course.name}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium mt-2">
                                        <User size={14} className="text-slate-400" /> {course.studentIds?.length || 0} Students Access
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 3. Class Management for Selected Course */}
                {selectedCourse && (
                    <section className="space-y-6 animate-fade-in-up [animation-delay:200ms]">
                        {/* Start New Class Widget */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/50">
                                <div className="w-full md:w-5/12">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Video className="text-blue-600" size={24} /> Start New Live Class
                                    </h3>
                                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                        Initiate a secure live video session for <span className="font-bold text-slate-700">{selectedCourse.name}</span>. Enrolled students will be able to join immediately.
                                    </p>
                                </div>
                                
                                <form onSubmit={handleCreateClass} className="w-full md:w-7/12 flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        placeholder="Enter Class Topic (e.g. Chapter 4 Integration)"
                                        className="flex-1 text-sm font-medium border-slate-300 rounded-xl shadow-sm p-4 bg-white text-slate-900 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                        required
                                        value={newClassTitle}
                                        onChange={e => setNewClassTitle(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={creatingClass}
                                        className="shrink-0 inline-flex justify-center items-center px-6 py-4 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                    >
                                        {creatingClass ? "Starting..." : "Start Session"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Student Doubts Panel */}
                        {courseDoubts.length > 0 && (
                            <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <MessageCircleQuestion className="text-blue-600" size={20} /> Student Questions
                                    </h3>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                                        {courseDoubts.filter(d => d.status === 'pending').length} Pending
                                    </span>
                                </div>
                                <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                    {courseDoubts.map(doubt => (
                                        <li key={doubt.id} className={`p-6 hover:bg-slate-50/50 transition-colors ${doubt.status === 'resolved' ? 'opacity-80' : ''}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700">{doubt.studentName}</span>
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                                        {new Date(doubt.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${doubt.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {doubt.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-800 font-medium mb-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">{doubt.text}</p>
                                            
                                            {doubt.status === 'pending' ? (
                                                <div className="ml-4 pl-4 border-l-2 border-blue-100">
                                                    {replyingToDoubtId === doubt.id ? (
                                                        <div className="flex flex-col gap-3">
                                                            <textarea
                                                                className="w-full text-sm font-medium p-3 border border-slate-300 shadow-sm rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                                rows={2}
                                                                placeholder="Type your reply to the student..."
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                disabled={submittingReply}
                                                                autoFocus
                                                            ></textarea>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleResolveDoubt(doubt.id)}
                                                                    disabled={submittingReply || !replyText.trim()}
                                                                    className="text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                                                >
                                                                    <Send size={14} /> Send Reply
                                                                </button>
                                                                <button
                                                                    onClick={() => setReplyingToDoubtId(null)}
                                                                    className="text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setReplyingToDoubtId(doubt.id);
                                                                setReplyText("");
                                                            }}
                                                            className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5"
                                                        >
                                                            <MessageCircleQuestion size={16} /> Write a Reply
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="ml-4 pl-4 border-l-2 border-emerald-100">
                                                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> Your Reply
                                                    </p>
                                                    <p className="text-sm text-slate-600 italic">&quot;{doubt.replyText}&quot;</p>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Academic Management Hub */}
                        <AcademicHub 
                            courseId={selectedCourse.id} 
                            courseName={selectedCourse.name}
                            teacherId={user.uid}
                        />

                        {/* Class History */}
                        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-white">
                                <h3 className="text-lg font-bold text-slate-800">Class History & Resources</h3>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {classes.map(cls => (
                                    <li key={cls.id} className="p-6 lg:p-8 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-xl font-bold text-slate-900">{cls.title}</h4>
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${cls.status === 'active' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                                                        {cls.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 flex items-center mt-2 font-medium">
                                                    <Clock size={14} className="mr-1.5" />
                                                    {new Date(cls.createdAt).toLocaleDateString()} at {new Date(cls.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => copyInvite(cls.roomId)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 bg-white shadow-sm" title="Copy Content Link"><Copy size={16} /></button>
                                                <button
                                                    onClick={() => router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${cls.courseId}`)}
                                                    className="inline-flex items-center px-4 py-2.5 border border-slate-300 text-sm font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 shadow-sm transition-all hover:border-blue-300"
                                                >
                                                    Go to Room File
                                                </button>
                                            </div>
                                        </div>

                                        {/* Two-column layout for Attendance and Notes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                            {/* Attendance Section */}
                                            <div className="bg-white border text-left border-slate-200 rounded-xl p-5 shadow-sm">
                                                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                                        <User size={14} className="text-blue-500" /> Attendance Records
                                                    </h5>
                                                    <button
                                                        onClick={() => handleSyncAttendance(cls.id, cls.roomId)}
                                                        disabled={syncingClassId === cls.id}
                                                        className="inline-flex items-center px-3 py-1.5 border border-blue-200 shadow-sm text-xs font-bold rounded-lg text-blue-700 bg-blue-50/50 hover:bg-blue-100 focus:outline-none disabled:opacity-50 transition-colors"
                                                    >
                                                        {syncingClassId === cls.id ? "Syncing..." : "Sync Duration"}
                                                    </button>
                                                </div>
                                                
                                                <div className="mb-3">
                                                    {cls.timeline ? (
                                                        <><span className="text-2xl font-bold text-slate-800">{cls.timeline.length}</span> <span className="text-sm text-slate-500 font-medium ml-1">Participants Tracking via VideoSDK</span></>
                                                    ) : (
                                                        <><span className="text-2xl font-bold text-slate-800">{cls.attendance?.length || 0}</span> <span className="text-sm text-slate-500 font-medium ml-1">Manual Join Clicks</span></>
                                                    )}
                                                </div>

                                                {cls.timeline && cls.timeline.length > 0 ? (
                                                    <details className="text-sm text-slate-600 cursor-pointer group mt-4 align-top text-left">
                                                        <summary className="hover:text-blue-600 focus:outline-none font-bold mb-2">View Detailed Log</summary>
                                                        <div className="mt-3 max-h-48 overflow-y-auto bg-slate-50 rounded-lg border border-slate-100 p-0 text-left">
                                                            <table className="min-w-full divide-y divide-slate-200">
                                                                <thead className="bg-slate-100/50 sticky top-0">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Student</th>
                                                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Duration</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-slate-100">
                                                                    {cls.timeline.map((student, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-800">{student.name}</td>
                                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-emerald-600 font-bold">{student.duration.toFixed(1)} mins</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                ) : (
                                                    cls.attendance && cls.attendance.length > 0 && (
                                                        <details className="text-sm text-slate-600 cursor-pointer text-left mt-4">
                                                            <summary className="hover:text-blue-600 focus:outline-none font-bold">View Click Log</summary>
                                                            <div className="mt-3 max-h-40 overflow-y-auto bg-slate-50 rounded-lg border border-slate-100 p-3">
                                                                <ul className="space-y-2 text-left">
                                                                    {cls.attendance.map((att, idx) => (
                                                                        <li key={idx} className="flex justify-between text-sm items-center">
                                                                            <span className="font-bold text-slate-700">{att.name}</span>
                                                                            <span className="text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 text-xs font-medium">{new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </details>
                                                    )
                                                )}
                                            </div>

                                            {/* Notes Section */}
                                            <div className="bg-white border text-left border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
                                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                                                    <FileText size={14} className="text-violet-500" /> Class Materials
                                                </h5>
                                                <div className="flex-1">
                                                    {cls.notes && cls.notes.length > 0 ? (
                                                        <ul className="space-y-3 mb-5">
                                                            {cls.notes.map((note, i) => (
                                                                <li key={i} className="text-sm flex items-start group">
                                                                    <div className="mt-0.5 mr-3 text-violet-500 bg-violet-50 p-1.5 rounded-lg">
                                                                        <FileText size={14} />
                                                                    </div>
                                                                    <a href={note.url} target="_blank" rel="noreferrer" className="text-slate-700 font-bold hover:text-violet-700 transition-colors mt-0.5 underline decoration-slate-200 underline-offset-4 hover:decoration-violet-300 break-words leading-tight">{note.name}</a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <div className="flex flex-col items-center justify-center h-24 text-slate-400 mb-5 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200"><p className="text-sm font-medium italic">No materials uploaded.</p></div>}
                                                </div>

                                                {/* Add Note UI */}
                                                <div className="mt-auto pt-4 border-t border-slate-100">
                                                    {addingNoteToClassId === cls.id ? (
                                                        <div className="flex flex-col gap-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Document Title"
                                                                className="text-sm font-medium p-3 border border-slate-300 shadow-sm rounded-lg w-full text-slate-900 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                                                value={newNoteName}
                                                                onChange={e => setNewNoteName(e.target.value)}
                                                            />
                                                            <input
                                                                type="url"
                                                                placeholder="Link to file or Drive"
                                                                className="text-sm font-medium p-3 border border-slate-300 shadow-sm rounded-lg w-full text-slate-900 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                                                value={newNoteUrl}
                                                                onChange={e => setNewNoteUrl(e.target.value)}
                                                            />
                                                            <div className="flex gap-2 mt-1">
                                                                <button onClick={() => handleAddNote(cls.id)} className="text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg flex-1 transition-colors shadow-sm">Save Material</button>
                                                                <button onClick={() => setAddingNoteToClassId(null)} className="text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAddingNoteToClassId(cls.id)}
                                                            className="w-full justify-center text-sm font-bold flex items-center gap-2 text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 py-3 rounded-xl transition-colors border border-violet-100"
                                                        >
                                                            <Plus size={16} /> Upload New Material
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {classes.length === 0 && (
                                    <li className="p-12 text-center text-slate-500 bg-slate-50/30">
                                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                            <Clock className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="text-base font-bold text-slate-600">No session history</p>
                                        <p className="text-sm mt-1">Classes you start for this course will appear here.</p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
