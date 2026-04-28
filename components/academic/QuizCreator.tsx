"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, X } from "lucide-react";

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface QuizCreatorProps {
    courseId: string;
    teacherId: string;
    onClose: () => void;
}

export default function QuizCreator({ courseId, teacherId, onClose }: QuizCreatorProps) {
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<Question[]>([
        { question: "", options: ["", "", ""], correctAnswer: 0 }
    ]);
    const [submitting, setSubmitting] = useState(false);

    const addQuestion = () => {
        setQuestions([...questions, { question: "", options: ["", "", ""], correctAnswer: 0 }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: string | string[] | number) => {
        const newQuestions = [...questions];
        // Safe runtime update: field is validated by the keyof constraint
        (newQuestions[index] as unknown as Record<string, unknown>)[field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Please enter a quiz title.");
            return;
        }

        if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
            toast.error("Please fill in all questions and options.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "quizzes"), {
                courseId,
                teacherId,
                title,
                questions,
                createdAt: new Date().toISOString()
            });
            toast.success("Quiz created successfully!");
            onClose();
        } catch (error) {
            console.error("Error creating quiz:", error);
            toast.error("Failed to create quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">Create New Quiz</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Close">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Quiz Title</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Midterm Physics Quiz"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="space-y-8">
                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="p-5 border border-slate-200 rounded-2xl space-y-4 relative bg-slate-50/30">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Question {qIndex + 1}</span>
                                {questions.length > 1 && (
                                    <button onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700 p-1" title="Remove Question">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <input
                                type="text"
                                className="w-full p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter your question here..."
                                value={q.question}
                                onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                            />

                            <div className="space-y-3">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name={`correct-${qIndex}`}
                                            checked={q.correctAnswer === oIndex}
                                            onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <input
                                            type="text"
                                            className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={`Option ${oIndex + 1}`}
                                            title={`Option ${oIndex + 1}`}
                                            value={opt}
                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addQuestion}
                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Add Another Question
                </button>
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
                    <Save size={18} /> {submitting ? "Saving..." : "Create Quiz"}
                </button>
            </div>
        </div>
    );
}
