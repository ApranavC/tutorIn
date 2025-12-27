"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import toast from "react-hot-toast";
import { ArrowLeft, Save, User } from "lucide-react";

export default function ProfilePage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [dob, setDob] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        } else if (profile) {
            setDisplayName(profile.displayName || user?.displayName || "");
            setSchoolName(profile.schoolName || ""); // Assuming we store this in profile/user doc
            setMobileNumber(profile.mobileNumber || "");
            setDob(profile.birthDate || "");
        }
    }, [user, profile, loading, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // Update Auth Profile (Display Name)
            if (displayName !== user.displayName) {
                await updateProfile(user, { displayName });
            }

            // Update Firestore User Document
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName,
                schoolName,
                mobileNumber,
                birthDate: dob,
                updatedAt: new Date().toISOString()
            });

            toast.success("Profile updated successfully");
            // Optionally redirect back
            // router.back();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !user) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                        <User className="mr-2" size={20} /> Edit Profile
                    </h3>
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Back
                    </button>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">School / College Name</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                placeholder="e.g. Springfield High"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                            <input
                                type="tel"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                placeholder="+1 234 567 890"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                            <input
                                type="date"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : <><Save size={16} className="mr-2" /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
