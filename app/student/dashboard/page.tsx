"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { LogOut, Video, FileText, BookOpen, Clock, User, ChevronDown, ChevronUp } from "lucide-react";

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
    notes?: { url: string; name: string }[];
    attendance?: { uid: string; name: string; timestamp: string }[];
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
            setClasses([]);
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
            setActiveClasses([]);
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


    if (loading || !user) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-indigo-600">TutorIN (Student)</h1>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-gray-700">{user.email}</span>
                            <button
                                onClick={() => router.push("/profile")}
                                className="mr-2 p-2 rounded-full hover:bg-gray-100 text-gray-600"
                                title="Edit Profile"
                            >
                                <User size={20} />
                            </button>
                            <button
                                onClick={() => signOut(auth)}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start gap-6">
                {/* Left Sidebar: Course List */}
                <aside className="w-full md:w-1/4 bg-white shadow rounded-lg overflow-hidden shrink-0">
                    <div
                        className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer md:cursor-default"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <h2 className="text-lg font-medium text-gray-900 flex items-center">
                            <BookOpen className="mr-2" size={20} /> My Courses
                        </h2>
                        <div className="md:hidden text-gray-500">
                            {isSidebarOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </div>
                    <ul className={`divide-y divide-gray-200 ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
                        {courses.map(course => (
                            <li
                                key={course.id}
                                onClick={() => {
                                    setSelectedCourse(course);
                                    setIsSidebarOpen(false); // Close on mobile selection
                                }}
                                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedCourse?.id === course.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                            >
                                <p className="text-sm font-medium text-indigo-600">{course.code}</p>
                                <p className="text-gray-900 font-semibold truncate">{course.name}</p>
                            </li>
                        ))}
                        {courses.length === 0 && (
                            <li className="p-4 text-sm text-gray-500 text-center">
                                You are not enrolled in any courses yet.
                            </li>
                        )}
                    </ul>
                </aside>

                {/* Right Content: Details & History */}
                <section className="flex-1 space-y-6">
                    {!selectedCourse ? (
                        <div className="space-y-6">
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <Video className="mr-2 text-red-500" /> Live Now
                                </h2>
                                {activeClasses.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {activeClasses.map(cls => {
                                            const course = courses.find(c => c.id === (cls as any).courseId);
                                            return (
                                                <li key={cls.id} className="py-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900">{cls.title}</h4>
                                                            <p className="text-sm text-indigo-600 font-medium">{course?.name} ({course?.code})</p>
                                                            <p className="text-xs text-gray-500 flex items-center mt-1">
                                                                <Clock size={12} className="mr-1" />
                                                                Started at {new Date(cls.createdAt).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                const alreadyJoined = cls.attendance?.some((a: any) => a.uid === user.uid);
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
                                                                // Pass courseId so redirect works
                                                                router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${(cls as any).courseId}`);
                                                            }}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                                                        >
                                                            Join Class
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No live classes happening right now.</p>
                                )}
                            </div>

                            <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                                Select a course from the sidebar to view full history and materials.
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Course Header */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.name}</h2>
                                <p className="text-gray-500">{selectedCourse.code}</p>
                                <p className="text-sm text-gray-400 mt-2">Teacher ID: {selectedCourse.teacherId}</p>
                            </div>

                            {/* Class List */}
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">Class Feed</h3>
                                </div>
                                <ul className="divide-y divide-gray-200">
                                    {classes.map(cls => (
                                        <li key={cls.id} className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-900">{cls.title}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center">
                                                        <Clock size={12} className="mr-1" />
                                                        {new Date(cls.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {cls.status}
                                                    </span>
                                                    {cls.status === 'active' && (
                                                        <button
                                                            onClick={async () => {
                                                                const alreadyJoined = cls.attendance?.some((a: any) => a.uid === user.uid);
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
                                                            className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50"
                                                        >
                                                            <><Video size={14} className="mr-1" /> Join Live</>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Notes Section */}
                                            {cls.notes && cls.notes.length > 0 && (
                                                <div className="bg-gray-50 rounded-md p-4">
                                                    <h5 className="text-xs font-uppercase text-gray-500 font-bold mb-2">NOTES</h5>
                                                    <ul className="space-y-1">
                                                        {cls.notes.map((note, i) => (
                                                            <li key={i} className="text-sm flex items-center text-indigo-600">
                                                                <FileText size={14} className="mr-2" />
                                                                <a href={note.url} target="_blank" rel="noreferrer" className="underline hover:no-underline">{note.name}</a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}

                                    {classes.length === 0 && (
                                        <li className="p-6 text-center text-gray-500 text-sm">No classes history for this course.</li>
                                    )}
                                </ul>
                            </div>
                        </>
                    )}
                </section>
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

