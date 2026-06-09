"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LoginModal } from "@/components/LoginModal";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="relative flex min-h-svh flex-col">
      <AnimatedBackground />

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="core·in" width={36} height={36} priority />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            core<span className="text-muted-foreground">·in</span>
          </span>
        </div>

        <Button
          size="pill"
          onClick={() => setLoginOpen(true)}
          className="font-medium tracking-wide"
        >
          Enter
        </Button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
            Personal space
          </div>

          <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Your life,
            <br />
            <span className="text-muted-foreground">organized.</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            A calm, focused space to plan your weeks, track your tasks, and build
            a clearer picture of how you spend your time.
          </p>

          <Button
            size="lg"
            onClick={() => setLoginOpen(true)}
            className="gap-2 rounded-full px-8 font-medium"
          >
            Get started
          </Button>
        </div>
      </main>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
