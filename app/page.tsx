
"use client";
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">TutorIN</h1>
        <p className="text-xl max-w-lg mx-auto">
          The serverless educational calling platform. Connect with your students instantly.
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold shadow-lg hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-indigo-800 text-white rounded-lg font-semibold shadow-lg hover:bg-indigo-900 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
