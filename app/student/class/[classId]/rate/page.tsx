"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "../../../../../lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Star } from "lucide-react";

export default function RateClass() {
    const { classId } = useParams();
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId || rating === 0) {
            toast.error("Please select a star rating");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            // Ideally fetch courseId/teacherId here if needed for analytics
            // For now, logging basic rating
            await addDoc(collection(db, "ratings"), {
                classId: classId,
                studentId: user.uid,
                studentEmail: user.email,
                rating: rating,
                comment: comment,
                createdAt: new Date().toISOString()
            });

            toast.success("Feedback submitted!");
            router.push("/student/dashboard");
        } catch (error) {
            console.error("Error submitting rating:", error);
            toast.error("Failed to submit feedback");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Rate this Class
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    How was your learning experience?
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleRate}>

                        <div className="flex justify-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`focus:outline-none transition-colors duration-150 ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
                                >
                                    <Star size={40} fill={rating >= star ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>
                        <div className="text-center text-sm text-gray-500">
                            {rating > 0 ? `You rated ${rating} star${rating > 1 ? 's' : ''}` : "Select a rating"}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Comments (Optional)
                            </label>
                            <div className="mt-1">
                                <textarea
                                    rows={3}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="What did you like? What could be better?"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? "Submitting..." : "Submit Feedback"}
                            </button>
                        </div>
                    </form>
                    <div className="mt-4 text-center">
                        <button onClick={() => router.push('/student/dashboard')} className="text-sm text-gray-500 hover:text-gray-900">Skip Feedback</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
