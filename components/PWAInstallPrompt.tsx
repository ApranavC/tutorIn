"use client";

import React, { useEffect, useState } from "react";
import { X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: string }>;
}

export default function PWAInstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (already installed)
        const isStandaloneMode =
            window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone) ||
            document.referrer.includes("android-app://");

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsStandalone(isStandaloneMode);

        if (isStandaloneMode) return;

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Capture the PWA install prompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Only show if not iOS (iOS handling is separate logic) or if we want to support both uniformly
            if (!isIosDevice) {
                setShowPrompt(true);
            }
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Register Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch((err) => {
                console.error("Service Worker registration failed:", err);
            });
        }

        // For iOS, show prompt immediately if not standalone (and after a small delay)
        if (isIosDevice && !isStandaloneMode) {
            setTimeout(() => setShowPrompt(true), 2000);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Optionally save to localStorage to not show again for a session
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom-5">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <X size={20} />
            </button>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                        {/* You can replace this with your actual App Icon */}
                        <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white font-bold rounded">
                            T
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Install TutorIN</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Add to Home Screen for the best experience.
                        </p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-100 dark:border-gray-700">
                        <p className="flex items-center gap-2 mb-2">
                            1. Tap the <Share size={16} className="text-blue-500" /> Share button.
                        </p>
                        <p className="flex items-center gap-2">
                            2. Select <PlusSquare size={16} /> <strong>Add to Home Screen</strong>.
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                        Install App
                    </button>
                )}
            </div>
        </div>
    );
}
