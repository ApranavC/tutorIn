"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "../../../../../lib/firebase";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import { FileText } from "lucide-react";

export default function FinishClass() {
    const { classId } = useParams();
    const router = useRouter();
    const [notesUrl, setNotesUrl] = useState("");
    const [notesName, setNotesName] = useState("Class Notes");
    const [loading, setLoading] = useState(false);

    const handleFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId) return;

        setLoading(true);
        try {
            let classRef = doc(db, "classes", classId as string);

            // If the ID contains hyphens, it's likely the VideoSDK roomId (e.g. xxxx-xxxx-xxxx).
            // We need to query Firebase for the actual document ID to prevent 'No document' errors.
            if ((classId as string).includes("-")) {
                const q = query(collection(db, "classes"), where("roomId", "==", classId));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    classRef = doc(db, "classes", querySnapshot.docs[0].id);
                } else {
                    toast.error("Could not find internal database record for this session.");
                    setLoading(false);
                    return;
                }
            }

            const updates: Record<string, unknown> = {
                status: 'ended'
            };

            if (notesUrl) {
                updates.notes = arrayUnion({
                    name: notesName || "Class Notes",
                    url: notesUrl
                });
            }

            await updateDoc(classRef, updates);

            toast.success("Class ended successfully!");
            router.push("/teacher/dashboard");
        } catch (error) {
            console.error("Error ending class:", error);
            toast.error("Failed to update class details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Class Completed
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Upload notes (optional) and end the session.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleFinish}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Notes URL (Google Drive / PDF Link)
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="url"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="https://"
                                    value={notesUrl}
                                    onChange={(e) => setNotesUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        {notesUrl && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Notes Title
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="e.g. Chapter 4 Summary"
                                    value={notesName}
                                    onChange={(e) => setNotesName(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? "Saving..." : (notesUrl ? "Save Notes & Finish Class" : "Finish Class Without Notes")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
