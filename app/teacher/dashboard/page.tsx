"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { generateToken, createRoom } from "../../../lib/videoService";
import { db, auth } from "../../../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { Copy, Plus, Video, LogOut, FileText, BookOpen, Clock, User, Download, ChevronDown, ChevronUp } from "lucide-react";

interface Course {
    id: string;
    name: string;
    code: string;
    teacherId: string;
    studentIds: string[];
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

export default function TeacherDashboard() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    // Data Strings
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [activeClasses, setActiveClasses] = useState<ClassSession[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Action States
    const [creatingClass, setCreatingClass] = useState(false);
    const [newClassTitle, setNewClassTitle] = useState("");

    // Note Adding State
    const [addingNoteToClassId, setAddingNoteToClassId] = useState<string | null>(null);
    const [newNoteUrl, setNewNoteUrl] = useState("");
    const [newNoteName, setNewNoteName] = useState("");

    // Sync State
    const [syncingClassId, setSyncingClassId] = useState<string | null>(null);

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


    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !newClassTitle) return;

        setCreatingClass(true);
        try {
            const token = await generateToken();
            const roomId = await createRoom(token);

            await addDoc(collection(db, "classes"), {
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
            // Optional: Redirect to class immediately?
            // router.push(`/class/${roomId}`);
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-indigo-600">TutorIN (Teacher)</h1>
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
                            <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
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
                                <p className="text-xs text-gray-500 mt-1">{course.studentIds?.length || 0} Students</p>
                            </li>
                        ))}
                        {courses.length === 0 && (
                            <li className="p-4 text-sm text-gray-500 text-center">
                                No courses assigned yet. Contact Admin.
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
                                            // Find course info if needed, though we have courseName usually
                                            const course = courses.find(c => c.id === (cls as any).courseId);
                                            return (
                                                <li key={cls.id} className="py-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900">{cls.title}</h4>
                                                            <p className="text-sm text-indigo-600 font-medium">{course?.name || (cls as any).courseName} ({(cls as any).courseId})</p>
                                                            <p className="text-xs text-gray-500 flex items-center mt-1">
                                                                <Clock size={12} className="mr-1" />
                                                                Started at {new Date(cls.createdAt).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => copyInvite(cls.roomId)}
                                                                className="px-3 py-2 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-50"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/class/${cls.roomId}?classId=${cls.id}&courseId=${(cls as any).courseId}`)}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                                                            >
                                                                Return to Class
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No live classes running.</p>
                                )}
                            </div>

                            <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                                Select a course from the left to manage it.
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Course Header & Actions */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="w-full md:w-auto">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.name}</h2>
                                        <p className="text-gray-500">{selectedCourse.code}</p>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-lg w-full md:w-1/3">
                                        <h3 className="text-sm font-medium text-indigo-800 mb-2">Start New Class</h3>
                                        <form onSubmit={handleCreateClass} className="flex flex-col gap-2">
                                            <input
                                                type="text"
                                                placeholder="Class Topic (e.g. Chapter 4)"
                                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                                                required
                                                value={newClassTitle}
                                                onChange={e => setNewClassTitle(e.target.value)}
                                            />
                                            <button
                                                type="submit"
                                                disabled={creatingClass}
                                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                                            >
                                                {creatingClass ? "Creating..." : <><Video size={16} className="mr-2" /> Start Live Class</>}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Class History */}
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">Class History</h3>
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
                                                    <button onClick={() => copyInvite(cls.roomId)} className="p-2 text-gray-400 hover:text-gray-600" title="Copy Link"><Copy size={16} /></button>
                                                    <button
                                                        onClick={() => router.push(`/class/${cls.roomId}?classId=${cls.id}`)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50"
                                                    >
                                                        Join
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Attendance Section */}
                                            <div className="mt-4 mb-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h5 className="text-xs font-uppercase text-gray-500 font-bold">ATTENDANCE</h5>
                                                        {(cls as any).timeline ? (
                                                            <><span className="text-2xl font-semibold text-gray-900">{(cls as any).timeline.length}</span> <span className="text-sm text-gray-500">Video Participants</span></>
                                                        ) : (
                                                            <><span className="text-2xl font-semibold text-gray-900">{cls.attendance?.length || 0}</span> <span className="text-sm text-gray-500">Clicks</span></>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSyncAttendance(cls.id, cls.roomId)}
                                                            disabled={syncingClassId === cls.id}
                                                            className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none disabled:opacity-50"
                                                        >
                                                            {syncingClassId === cls.id ? "Syncing..." : <><Clock size={14} className="mr-2" /> Sync Duration</>}
                                                        </button>
                                                    </div>
                                                </div>

                                                {(cls as any).timeline && (cls as any).timeline.length > 0 ? (
                                                    <details className="mt-2 text-sm text-gray-500 cursor-pointer" open>
                                                        <summary className="hover:text-indigo-600 focus:outline-none font-medium mb-1">View Student Duration</summary>
                                                        <div className="mt-2 max-h-60 overflow-y-auto bg-gray-50 rounded border border-gray-100 p-2">
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-100">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Join/Leave Events</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {(cls as any).timeline.map((student: any, idx: number) => (
                                                                        <tr key={idx}>
                                                                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{student.name}</td>
                                                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-indigo-600 font-bold">{student.duration.toFixed(1)} mins</td>
                                                                            <td className="px-3 py-2 text-xs text-right text-gray-500">
                                                                                {student.events.map((e: any, i: number) => (
                                                                                    <div key={i}>
                                                                                        {new Date(e.start).toLocaleTimeString()} - {new Date(e.end).toLocaleTimeString()}
                                                                                    </div>
                                                                                ))}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                ) : (
                                                    cls.attendance && cls.attendance.length > 0 && (
                                                        <details className="mt-2 text-sm text-gray-500 cursor-pointer">
                                                            <summary className="hover:text-indigo-600 focus:outline-none">View Simple List</summary>
                                                            <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded border border-gray-100 p-2">
                                                                <ul className="space-y-1">
                                                                    {cls.attendance.map((att: any, idx: number) => (
                                                                        <li key={idx} className="flex justify-between text-xs">
                                                                            <span className="font-medium text-gray-900">{att.name}</span>
                                                                            <span className="text-gray-400">{new Date(att.timestamp).toLocaleTimeString()}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </details>
                                                    )
                                                )}
                                            </div>

                                            {/* Notes Section */}
                                            <div className="bg-gray-50 rounded-md p-4">
                                                <h5 className="text-xs font-uppercase text-gray-500 font-bold mb-2">NOTES</h5>
                                                {cls.notes && cls.notes.length > 0 ? (
                                                    <ul className="space-y-1 mb-3">
                                                        {cls.notes.map((note, i) => (
                                                            <li key={i} className="text-sm flex items-center text-indigo-600">
                                                                <FileText size={14} className="mr-2" />
                                                                <a href={note.url} target="_blank" rel="noreferrer" className="underline hover:no-underline">{note.name}</a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <p className="text-sm text-gray-400 italic mb-3">No notes uploaded.</p>}

                                                {/* Add Note UI */}
                                                {addingNoteToClassId === cls.id ? (
                                                    <div className="flex gap-2 items-center mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Note Name"
                                                            className="text-xs p-1 border rounded w-1/4 text-gray-900 bg-white"
                                                            value={newNoteName}
                                                            onChange={e => setNewNoteName(e.target.value)}
                                                        />
                                                        <input
                                                            type="url"
                                                            placeholder="Drive URL..."
                                                            className="text-xs p-1 border rounded flex-1 text-gray-900 bg-white"
                                                            value={newNoteUrl}
                                                            onChange={e => setNewNoteUrl(e.target.value)}
                                                        />
                                                        <button onClick={() => handleAddNote(cls.id)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                                                        <button onClick={() => setAddingNoteToClassId(null)} className="text-xs text-gray-500 px-2">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setAddingNoteToClassId(cls.id)}
                                                        className="text-xs flex items-center text-gray-500 hover:text-indigo-600"
                                                    >
                                                        <Plus size={14} className="mr-1" /> Add Note
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    {classes.length === 0 && (
                                        <li className="p-6 text-center text-gray-500 text-sm">No classes started for this course yet.</li>
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

