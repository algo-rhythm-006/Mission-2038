"use client";

import { useState } from "react";

import HeroPanels from "./components/HeroPanels";
import LoadingScreen from "./components/LoadingScreen";

export default function LoginPage() {
    const [loading, setLoading] = useState(true);

    return (
        <main className="relative min-h-screen overflow-hidden bg-black text-white">
            {loading ? (
                <LoadingScreen onComplete={() => setLoading(false)} />
            ) : (
                <HeroPanels />
            )}
        </main>
    );
}
