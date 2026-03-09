"use client";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            toast.success("Password reset email sent! Check your inbox.");
            setEmail(""); // Clear the input
        } catch (error: any) {
            console.error(error);
            // Handle specific firebase errors if needed, but generic is often safer for enumeration prevention
            if (error.code === 'auth/user-not-found') {
                toast.error("No account found with this email.");
            } else {
                toast.error(error.message || "Failed to send reset email.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                    <div>
                        <label htmlFor="email-address" className="sr-only">
                            Email address
                        </label>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none data-[te] rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
