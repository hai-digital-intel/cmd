"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FocusTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-lg tabular-nums text-foreground">
        {mins}:{secs}
      </span>
      <Button size="icon" variant="outline" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause timer" : "Start timer"}>
        {running ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setRunning(false);
          setSeconds(0);
        }}
        aria-label="Reset timer"
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}
