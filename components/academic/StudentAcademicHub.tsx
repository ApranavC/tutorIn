"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { BookOpen, FileText, CheckCircle2, Play, Send, Loader2, Trophy } from "lucide-react";
import QuizPlayer from "./QuizPlayer";
import AssignmentSubmitter from "./AssignmentSubmitter";
/* eslint-disable @typescript-eslint/no-explicit-any */
interface StudentAcademicHubProps {
    courseId: string;
    studentId: string;
    studentName: string;
}

export default function StudentAcademicHub({ courseId, studentId, studentName }: StudentAcademicHubProps) {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [activeAssignment, setActiveAssignment] = useState<any>(null);

    useEffect(() => {
        if (!courseId || !studentId) return;

        const qQuiz = query(collection(db, "quizzes"), where("courseId", "==", courseId));
        const qAssign = query(collection(db, "assignments"), where("courseId", "==", courseId));
        const qSub = query(
            collection(db, "submissions"), 
            where("courseId", "==", courseId),
            where("studentId", "==", studentId)
        );

        const unsubQuiz = onSnapshot(qQuiz, (snap) => {
            setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubAssign = onSnapshot(qAssign, (snap) => {
            setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubSub = onSnapshot(qSub, (snap) => {
            setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubQuiz();
            unsubAssign();
            unsubSub();
        };
    }, [courseId, studentId]);

    const getSubmission = (itemId: string) => {
        return submissions.find(s => s.itemId === itemId);
    };

    if (activeQuiz) {
        return <QuizPlayer quiz={activeQuiz} studentId={studentId} studentName={studentName} onClose={() => setActiveQuiz(null)} />;
    }

    if (activeAssignment) {
        return <AssignmentSubmitter assignment={activeAssignment} studentId={studentId} studentName={studentName} onClose={() => setActiveAssignment(null)} />;
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-serif">
                <Trophy className="text-blue-600" size={24} /> Learning Tasks
            </h3>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quizzes Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-500" /> Available Quizzes
                            </h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {quizzes.map(quiz => {
                                const sub = getSubmission(quiz.id);
                                return (
                                    <div key={quiz.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-slate-800">{quiz.title}</p>
                                            <p className="text-xs text-slate-400 mt-1">{quiz.questions?.length || 0} Questions</p>
                                        </div>
                                        {sub ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                                <CheckCircle2 size={14} /> {sub.score.toFixed(0)}% Score
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveQuiz(quiz)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                            >
                                                <Play size={14} fill="currentColor" /> Attempt
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {quizzes.length === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-4">No quizzes available for this course.</p>
                            )}
                        </div>
                    </div>

                    {/* Assignments Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={16} className="text-violet-500" /> Course Assignments
                            </h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {assignments.map(assign => {
                                const sub = getSubmission(assign.id);
                                const now = new Date();
                                const isDue = new Date(assign.dueDate).getTime() < now.getTime();
                                
                                return (
                                    <div key={assign.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex justify-between items-center group">
                                        <div className="max-w-[150px] sm:max-w-xs">
                                            <p className="font-bold text-slate-800 truncate">{assign.title}</p>
                                            <p className={`text-xs mt-1 font-medium ${isDue ? 'text-red-400' : 'text-slate-400'}`}>Due: {new Date(assign.dueDate).toLocaleDateString()}</p>
                                        </div>
                                        {sub ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                                <CheckCircle2 size={14} /> Submitted
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveAssignment(assign)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                            >
                                                <Send size={14} /> Submit
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {assignments.length === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-4">No assignments posted for this course.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
