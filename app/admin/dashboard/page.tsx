
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { LogOut, Plus, Users, BookOpen } from "lucide-react";

interface Course {
    id: string;
    name: string; // "Advanced Mathematics"
    code: string; // "MATH101"
    teacherId: string;
    teacherEmail: string;
    studentIds: string[];
    createdAt: string;
}

interface UserProfile {
    uid: string;
    email: string;
    role: string;
    displayName?: string;
}

export default function AdminDashboard() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);

    // Form States
    const [isCreating, setIsCreating] = useState(false);
    const [newCourseName, setNewCourseName] = useState("");
    const [newCourseCode, setNewCourseCode] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");

    // UI States
    const [activeTab, setActiveTab] = useState("courses");
    const [managingCourse, setManagingCourse] = useState<Course | null>(null);
    const [studentToAdd, setStudentToAdd] = useState("");

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile?.role !== "admin") {
                // Redirect non-admins. 
                // For now, if role is undefined or not admin, maybe send to home or error.
                // Assuming 'admin' role exists.
                toast.error("Access Denied: Admins only.");
                router.push("/");
            }
        }
    }, [user, profile, loading, router]);

    // Fetch Courses
    useEffect(() => {
        if (!user || profile?.role !== "admin") return;

        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(data);
        });
        return () => unsubscribe();
    }, [user, profile]);

    // Fetch Users (Teachers and Students)
    useEffect(() => {
        if (!user || profile?.role !== "admin") return;

        const fetchUsers = async () => {
            try {
                // Fetch Teachers
                const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
                const teachersSnap = await getDocs(teachersQuery);
                setTeachers(teachersSnap.docs.map(doc => doc.data() as UserProfile));

                // Fetch Students
                const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
                const studentsSnap = await getDocs(studentsQuery);
                setStudents(studentsSnap.docs.map(doc => doc.data() as UserProfile));
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        fetchUsers();
    }, [user, profile]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourseName || !newCourseCode || !selectedTeacher) {
            toast.error("Please fill all fields");
            return;
        }

        setIsCreating(true);
        try {
            const teacher = teachers.find(t => t.uid === selectedTeacher);

            await addDoc(collection(db, "courses"), {
                name: newCourseName,
                code: newCourseCode,
                teacherId: selectedTeacher,
                teacherEmail: teacher?.email || "",
                studentIds: [],
                createdAt: new Date().toISOString(),
            });

            toast.success("Course created successfully");
            setNewCourseName("");
            setNewCourseCode("");
            setSelectedTeacher("");
        } catch (error) {
            console.error("Error creating course:", error);
            toast.error("Failed to create course");
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddStudent = async () => {
        if (!managingCourse || !studentToAdd) return;
        try {
            const courseRef = doc(db, "courses", managingCourse.id);
            await updateDoc(courseRef, {
                studentIds: arrayUnion(studentToAdd)
            });
            toast.success("Student added to course");
            setStudentToAdd("");
            // Refresh local state ideally or wait for snapshot
        } catch (error) {
            console.error("Error adding student:", error);
            toast.error("Failed to add student");
        }
    };

    if (loading || !profile || profile.role !== 'admin') return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

    const handleCleanup = async () => {
        if (!confirm("Are you sure you want to mark ALL active classes as ended?")) return;
        try {
            const q = query(collection(db, "classes"), where("status", "==", "active"));
            const snapshot = await getDocs(q);
            const batchPromises = snapshot.docs.map(doc => updateDoc(doc.ref, { status: "ended" }));
            await Promise.all(batchPromises);
            toast.success(`Marked ${snapshot.size} classes as ended.`);
        } catch (error) {
            console.error(error);
            toast.error("Cleanup failed");
        }
    };

    const activeCourseData = managingCourse ? courses.find(c => c.id === managingCourse.id) || managingCourse : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16"> {/* Flex fix */}
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-indigo-600">TutorIN (Admin)</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleCleanup} className="text-sm text-red-600 hover:text-red-800 underline">
                                Clean Up Old Classes
                            </button>
                            <span className="text-gray-700">{user?.email}</span>
                            <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

                {/* Create Course Section */}
                <div className="bg-white shadow sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Course</h3>
                        <form onSubmit={handleCreateCourse} className="mt-5 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Course Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                    placeholder="e.g. Advanced Physics"
                                    value={newCourseName}
                                    onChange={(e) => setNewCourseName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Course Code</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                    placeholder="e.g. PHY201"
                                    value={newCourseCode}
                                    onChange={(e) => setNewCourseCode(e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Assign Teacher</label>
                                <select
                                    required
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900 bg-white"
                                    value={selectedTeacher}
                                    onChange={(e) => setSelectedTeacher(e.target.value)}
                                >
                                    <option value="">Select a Teacher</option>
                                    {teachers.map(t => (
                                        <option key={t.uid} value={t.uid}>{t.email} ({t.displayName || 'No Name'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {isCreating ? "Creating..." : "Create Course"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Courses List */}
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">All Courses</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {courses.map((course) => (
                            <li key={course.id}>
                                <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-indigo-600 truncate">{course.name} <span className="text-gray-500 text-sm">({course.code})</span></h4>
                                        <div className="mt-2 flex items-center text-sm text-gray-500">
                                            <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            <span className="truncate">Teacher: {course.teacherEmail}</span>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500">
                                            <BookOpen className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            <span>Students Enrolled: {course.studentIds?.length || 0}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => setManagingCourse(course)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none"
                                        >
                                            Manage Students
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {courses.length === 0 && (
                            <div className="px-4 py-12 text-center text-gray-500">
                                No courses found. Create one above.
                            </div>
                        )}
                    </ul>
                </div>

                {/* Manage Students Modal */}
                {activeCourseData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden transform transition-all">

                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Manage Students: <span className="text-indigo-600">{activeCourseData.name}</span>
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Enrol students into this course.
                                </p>
                            </div>

                            <div className="px-4 py-5 sm:p-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Student</label>
                                <div className="flex gap-2">
                                    <select
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900 bg-white"
                                        value={studentToAdd}
                                        onChange={(e) => setStudentToAdd(e.target.value)}
                                    >
                                        <option value="">Select a Student</option>
                                        {students
                                            .filter(s => !activeCourseData.studentIds?.includes(s.uid))
                                            .map(s => (
                                                <option key={s.uid} value={s.uid}>{s.email} ({s.displayName || 'No Name'})</option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddStudent}
                                        disabled={!studentToAdd}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        Add Student
                                    </button>
                                </div>

                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Enrolled Students ({activeCourseData.studentIds?.length || 0})</h4>
                                    <div className="bg-gray-50 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                        <ul className="divide-y divide-gray-200">
                                            {activeCourseData.studentIds?.map(sid => {
                                                const student = students.find(s => s.uid === sid);
                                                return (
                                                    <li key={sid} className="px-4 py-3 flex justify-between items-center bg-white hover:bg-gray-50">
                                                        <div className="flex items-center">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                                                {(student?.displayName || student?.email || "U")?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{student?.displayName || "Unknown"}</p>
                                                                <p className="text-xs text-gray-500">{student?.email || sid}</p>
                                                            </div>
                                                        </div>
                                                        {/* Future: Remove Button */}
                                                    </li>
                                                );
                                            })}
                                            {(!activeCourseData.studentIds || activeCourseData.studentIds.length === 0) && (
                                                <li className="px-4 py-8 text-center text-sm text-gray-500 italic">
                                                    No students enrolled in this course yet.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <button
                                    type="button"
                                    className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                                    onClick={() => setManagingCourse(null)}
                                >
                                    Done
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
