"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Save, X, Calendar, AlignLeft } from "lucide-react";

interface AssignmentCreatorProps {
    courseId: string;
    teacherId: string;
    onClose: () => void;
}

export default function AssignmentCreator({ courseId, teacherId, onClose }: AssignmentCreatorProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        if (!title.trim() || !description.trim() || !dueDate) {
            toast.error("Please fill in all fields.");
            return;
        }

        // Validate due date is in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(dueDate) < today) {
            toast.error("Due date must be today or in the future.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "assignments"), {
                courseId,
                teacherId,
                title,
                description,
                dueDate,
                createdAt: new Date().toISOString()
            });
            toast.success("Assignment posted successfully!");
            onClose();
        } catch (error) {
            console.error("Error creating assignment:", error);
            toast.error("Failed to post assignment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800 font-serif">Post New Assignment</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Close">
                    <X size={20} />
                </button>
            </div>

            <div className="p-8 space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Assignment Title</label>
                    <input
                        type="text"
                        className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                        placeholder="e.g. Weekly Lab Report: Thermodynamics"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <AlignLeft size={14} /> Description & Instructions
                    </label>
                    <textarea
                        className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium min-h-[150px]"
                        placeholder="Provide detailed instructions, links to resources, and submission requirements..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={14} /> Due Date
                    </label>
                    <input
                        type="date"
                        className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                        title="Due Date"
                        value={dueDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDueDate(e.target.value)}
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
                    onClick={handleSave}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    <Save size={18} /> {submitting ? "Posting..." : "Post Assignment"}
                </button>
            </div>
        </div>
    );
}
