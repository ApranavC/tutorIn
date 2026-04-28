"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { ArrowRight, ArrowLeft, Send, XCircle, Trophy } from "lucide-react";

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface QuizPlayerProps {
    quiz: {
        id: string;
        title: string;
        questions: Question[];
        courseId: string;
    };
    studentId: string;
    studentName: string;
    onClose: () => void;
}

export default function QuizPlayer({ quiz, studentId, studentName, onClose }: QuizPlayerProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const handleSelectOption = (optionIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = optionIndex;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentStep < quiz.questions.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (answers.includes(-1)) {
            toast.error("Please answer all questions before submitting.");
            return;
        }

        let calculatedScore = 0;
        quiz.questions.forEach((q, i) => {
            if (q.correctAnswer === answers[i]) {
                calculatedScore++;
            }
        });

        const finalScore = (calculatedScore / quiz.questions.length) * 100;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "submissions"), {
                studentId,
                studentName,
                itemId: quiz.id,
                courseId: quiz.courseId,
                type: "quiz",
                score: finalScore,
                content: answers,
                status: "submitted",
                submittedAt: new Date().toISOString()
            });
            setScore(finalScore);
            setSubmitted(true);
            toast.success("Quiz submitted successfully!");
        } catch (error) {
            console.error("Error submitting quiz:", error);
            toast.error("Failed to submit quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Trophy size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Quiz Completed!</h3>
                <div className="py-4 px-8 bg-slate-50 rounded-2xl border border-slate-100 inline-block">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Your Score</p>
                    <p className="text-4xl font-black text-blue-600">{score.toFixed(0)}%</p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-600 font-medium">Thank you for participating, {studentName}.</p>
                    <p className="text-sm text-slate-400">Your results have been recorded for the course leaderboard.</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-md mt-6"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentStep];

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{quiz.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Question {currentStep + 1} of {quiz.questions.length}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <XCircle size={24} />
                </button>
            </div>

            <div className="p-8 flex-1 space-y-8">
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="absolute h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / quiz.questions.length) * 100}%` }}
                    />
                </div>

                <div className="space-y-6">
                    <h4 className="text-xl font-bold text-slate-800 leading-relaxed">{currentQuestion.question}</h4>
                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectOption(idx)}
                                className={`p-4 text-left rounded-xl border-2 transition-all font-medium ${
                                    answers[currentStep] === idx
                                    ? "bg-blue-50 border-blue-500 text-blue-900 shadow-sm"
                                    : "bg-white border-slate-100 text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                        answers[currentStep] === idx
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-400"
                                    }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    {option}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-0"
                >
                    <ArrowLeft size={18} /> Previous
                </button>

                {currentStep === quiz.questions.length - 1 ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || answers.includes(-1)}
                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit Quiz"} <Send size={18} />
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={answers[currentStep] === -1}
                        className="flex items-center gap-2 px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                        Next Question <ArrowRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
