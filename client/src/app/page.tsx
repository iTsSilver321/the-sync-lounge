"use client";

import AuthPortal from "@/components/AuthPortal";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 relative">
      
      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[50vw] h-[50vw] bg-purple-900/30 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50vw] h-[50vw] bg-pink-900/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="z-10 w-full max-w-md">
        <AuthPortal />
      </div>
    </main>
  );
}