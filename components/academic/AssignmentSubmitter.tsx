"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Send, X, Link, AlertCircle } from "lucide-react";

interface AssignmentSubmitterProps {
    assignment: {
        id: string;
        title: string;
        description: string;
        courseId: string;
    };
    studentId: string;
    studentName: string;
    onClose: () => void;
}

export default function AssignmentSubmitter({ assignment, studentId, studentName, onClose }: AssignmentSubmitterProps) {
    const [submissionContent, setSubmissionContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!submissionContent.trim()) {
            toast.error("Please provide your submission content or link.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "submissions"), {
                studentId,
                studentName,
                itemId: assignment.id,
                courseId: assignment.courseId,
                type: "assignment",
                content: submissionContent.trim(),
                status: "submitted",
                submittedAt: new Date().toISOString()
            });
            toast.success("Assignment submitted successfully!");
            onClose();
        } catch (error) {
            console.error("Error submitting assignment:", error);
            toast.error("Failed to submit assignment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 leading-tight">Submit: {assignment.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Assignment Submission</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Close">
                    <X size={20} />
                </button>
            </div>

            <div className="p-8 space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800 italic">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-blue-500" />
                    <p>{assignment.description}</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Link size={14} className="text-blue-500" /> Your Submission Link / Text
                    </label>
                    <textarea
                        className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium min-h-[150px]"
                        placeholder="Paste your link (Google Drive, GitHub) or type your notes here..."
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    <Send size={18} /> {submitting ? "Submitting..." : "Submit Assignment"}
                </button>
            </div>
        </div>
    );
}
