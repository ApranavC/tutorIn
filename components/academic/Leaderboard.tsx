"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Trophy, Medal, User, Loader2 } from "lucide-react";

interface LeaderboardProps {
    courseId: string;
}

export default function Leaderboard({ courseId }: LeaderboardProps) {
    const [rankings, setRankings] = useState<{ id: string; name: string; totalScore: number; count: number; avg: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) return;

        // Fetch all submissions for this course
        const qSub = query(collection(db, "submissions"), where("courseId", "==", courseId));

        const unsubscribe = onSnapshot(qSub, (snap) => {
            const subs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Aggregate by student
            const studentScores: Record<string, { name: string, totalScore: number, count: number }> = {};

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            subs.forEach((sub: Record<string, any>) => {
                if (!studentScores[sub.studentId]) {
                    studentScores[sub.studentId] = { name: sub.studentName, totalScore: 0, count: 0 };
                }
                if (sub.type === "quiz") {
                    studentScores[sub.studentId].totalScore += sub.score;
                } else if (sub.type === "assignment") {
                    // Use graded score if available, otherwise award participation points
                    studentScores[sub.studentId].totalScore += (sub.score != null ? sub.score : 50);
                }
                studentScores[sub.studentId].count += 1;
            });

            // Convert to array and sort
            const sorted = Object.entries(studentScores).map(([id, data]) => ({
                id,
                ...data,
                avg: data.totalScore / data.count
            })).sort((a, b) => b.totalScore - a.totalScore); // Sort by total points for now

            setRankings(sorted);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [courseId]);

    if (loading) return (
        <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-900 to-indigo-800 text-white flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Trophy size={20} className="text-emerald-400" /> Course Leaderboard
                </h3>
            </div>
            
            <div className="p-4">
                <div className="space-y-2">
                    {rankings.map((student, index) => (
                        <div 
                            key={student.id} 
                            className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                                index === 0 ? "bg-amber-50 border border-amber-100" : "bg-white border border-slate-50 hover:bg-slate-50/50"
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                    index === 0 ? "bg-amber-400 text-white" : 
                                    index === 1 ? "bg-slate-300 text-white" :
                                    index === 2 ? "bg-amber-600/60 text-white" : "bg-slate-100 text-slate-500"
                                }`}>
                                    {index === 0 ? <Medal size={20} /> : index + 1}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{student.name}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">{student.count} Submissions</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-blue-900">{student.totalScore.toFixed(0)}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Pts</p>
                            </div>
                        </div>
                    ))}
                    {rankings.length === 0 && (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <User className="mx-auto opacity-20" size={48} />
                            <p className="font-medium">No results yet. Complete a quiz to rank up!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
