"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Plus, BookOpen, FileText, Trophy, Loader2, ChevronRight } from "lucide-react";
import QuizCreator from "./QuizCreator";
import AssignmentCreator from "./AssignmentCreator";
import Leaderboard from "./Leaderboard";

interface AcademicHubProps {
    courseId: string;
    courseName: string;
    teacherId: string;
}

interface QuizItem {
    id: string;
    title: string;
    questions?: unknown[];
    createdAt: string;
    [key: string]: unknown;
}

interface AssignmentItem {
    id: string;
    title: string;
    dueDate: string;
    createdAt: string;
    [key: string]: unknown;
}

export default function AcademicHub({ courseId, courseName, teacherId }: AcademicHubProps) {
    const [view, setView] = useState<"list" | "create-quiz" | "create-assignment">("list");
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) return;

        const qQuiz = query(collection(db, "quizzes"), where("courseId", "==", courseId));
        const qAssign = query(collection(db, "assignments"), where("courseId", "==", courseId));

        const unsubQuiz = onSnapshot(qQuiz, (snap) => {
            setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizItem)));
        });

        const unsubAssign = onSnapshot(qAssign, (snap) => {
            setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentItem)));
            setLoading(false);
        });

        return () => {
            unsubQuiz();
            unsubAssign();
        };
    }, [courseId]);

    if (view === "create-quiz") {
        return <QuizCreator courseId={courseId} teacherId={teacherId} onClose={() => setView("list")} />;
    }

    if (view === "create-assignment") {
        return <AssignmentCreator courseId={courseId} teacherId={teacherId} onClose={() => setView("list")} />;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Trophy className="text-blue-600" size={24} /> Academic Management
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Manage quizzes, assignments, and check student progress for {courseName}.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setView("create-quiz")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={18} /> New Quiz
                    </button>
                    <button
                        onClick={() => setView("create-assignment")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={18} /> New Assignment
                    </button>
                </div>
            </div>

            <div className="p-6 sm:p-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Quizzes Column */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <BookOpen size={16} className="text-blue-500" /> Active Quizzes ({quizzes.length})
                                </h4>
                                <div className="space-y-3">
                                    {quizzes.map(quiz => (
                                        <div key={quiz.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">{quiz.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">{quiz.questions?.length || 0} Questions • Created {new Date(quiz.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    ))}
                                    {quizzes.length === 0 && (
                                        <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400 italic">No quizzes created yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assignments Column */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <FileText size={16} className="text-violet-500" /> Assignments ({assignments.length})
                                </h4>
                                <div className="space-y-3">
                                    {assignments.map(assign => (
                                        <div key={assign.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">{assign.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">Due: {new Date(assign.dueDate).toLocaleDateString()} • Posted {new Date(assign.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                                        </div>
                                    ))}
                                    {assignments.length === 0 && (
                                        <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400 italic">No assignments posted yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Section (Full Width below) */}
                        <div className="pt-8 border-t border-slate-100">
                            <Leaderboard courseId={courseId} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
