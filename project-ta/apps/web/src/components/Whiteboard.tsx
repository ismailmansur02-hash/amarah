"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke, Tool } from "@project-ta/shared";

/**
 * Shared whiteboard.
 *
 * Points are stored normalised to 0..1 so a phone and a laptop looking at the same
 * board see the same drawing. New strokes are posted as they finish and the board
 * polls for everyone else's, which keeps the whole thing working on serverless
 * hosting with no websocket server to run. Swapping the poll for a socket later
 * touches only this file.
 */

const COLOURS = ["#0f5132", "#1f9d5b", "#1d4ed8", "#b3261e", "#b45309", "#111827"];
const POLL_MS = 1200;

interface Props {
  sessionId: string;
  disabled?: boolean;
}

export default function Whiteboard({ sessionId, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<number[] | null>(null);
  const lastSeenRef = useRef(0);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [colour, setColour] = useState(COLOURS[0]);
  const [width, setWidth] = useState(3);
  const [saving, setSaving] = useState(false);

  /* ------------------------------------------------------------- rendering */

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Faint grid so it reads as workings-out paper rather than a blank void.
    ctx.strokeStyle = "#eef4f0";
    ctx.lineWidth = 1;
    const step = 28 * (window.devicePixelRatio || 1);
    for (let x = step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const paint = (s: Pick<Stroke, "points" | "color" | "width" | "tool">) => {
      if (s.points.length < 4) return;
      ctx.globalAlpha = s.tool === "highlighter" ? 0.28 : 1;
      ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * (window.devicePixelRatio || 1);
      ctx.beginPath();
      ctx.moveTo(s.points[0] * w, s.points[1] * h);
      for (let i = 2; i < s.points.length; i += 2) {
        ctx.lineTo(s.points[i] * w, s.points[i + 1] * h);
      }
      ctx.stroke();
    };

    for (const s of strokesRef.current) paint(s);
    if (currentRef.current) {
      paint({ points: currentRef.current, color: colour, width, tool });
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [colour, tool, width]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(wrap.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(wrap.clientHeight * dpr));
    redraw();
  }, [redraw]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  /* ---------------------------------------------------------------- polling */

  const pull = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/strokes?since=${lastSeenRef.current}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { strokes: Stroke[] };
      if (data.strokes?.length) {
        strokesRef.current.push(...data.strokes);
        lastSeenRef.current = data.strokes[data.strokes.length - 1].createdAt;
        redraw();
      } else if (data.strokes && lastSeenRef.current === 0) {
        redraw();
      }
    } catch {
      /* a dropped poll is harmless — the next one catches up */
    }
  }, [sessionId, redraw]);

  useEffect(() => {
    pull();
    const t = setInterval(pull, POLL_MS);
    return () => clearInterval(t);
  }, [pull]);

  /* ---------------------------------------------------------------- drawing */

  function pointFrom(e: React.PointerEvent): [number, number] {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return [
      Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    ];
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentRef.current = pointFrom(e);
    redraw();
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentRef.current) return;
    const [x, y] = pointFrom(e);
    const pts = currentRef.current;
    const lx = pts[pts.length - 2];
    const ly = pts[pts.length - 1];
    // Skip micro-movements so we aren't shipping thousands of points.
    if (Math.hypot(x - lx, y - ly) < 0.004) return;
    pts.push(x, y);
    redraw();
  }

  async function onUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = currentRef.current;
    currentRef.current = null;
    if (!points || points.length < 4) { redraw(); return; }

    // Draw it locally straight away; the server copy arrives on the next poll.
    const optimistic: Stroke = {
      id: `local_${Date.now()}`,
      sessionId,
      authorId: "me",
      authorRole: "student",
      tool, color: colour, width, points,
      createdAt: 0,
    };
    strokesRef.current.push(optimistic);
    redraw();

    setSaving(true);
    try {
      await fetch(`/api/sessions/${sessionId}/strokes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ strokes: [{ tool, color: colour, width, points }] }),
      });
    } catch {
      /* the stroke is still on screen locally; the next poll reconciles */
    } finally {
      setSaving(false);
    }
  }

  async function clearBoard() {
    if (!confirm("Clear the whiteboard for both of you?")) return;
    strokesRef.current = [];
    lastSeenRef.current = Date.now();
    redraw();
    await fetch(`/api/sessions/${sessionId}/strokes`, { method: "DELETE" });
  }

  return (
    <section className="panel" aria-label="Shared whiteboard">
      <div className="panel-head">
        <h2 className="panel-title">Whiteboard</h2>
        <span className="spacer" />
        <div className="board-tools">
          {COLOURS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ background: c }}
              aria-pressed={colour === c && tool !== "eraser"}
              aria-label={`Colour ${c}`}
              onClick={() => { setColour(c); setTool("pen"); }}
            />
          ))}
          <button className="tool-btn" aria-pressed={tool === "pen"} onClick={() => { setTool("pen"); setWidth(3); }}>Pen</button>
          <button className="tool-btn" aria-pressed={tool === "highlighter"} onClick={() => { setTool("highlighter"); setWidth(16); }}>Marker</button>
          <button className="tool-btn" aria-pressed={tool === "eraser"} onClick={() => { setTool("eraser"); setWidth(22); }}>Eraser</button>
          <button className="tool-btn" onClick={clearBoard}>Clear</button>
        </div>
      </div>

      <div className="board-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="board-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        />
        {saving && (
          <span
            className="badge"
            style={{ position: "absolute", right: 10, bottom: 10 }}
          >
            saving…
          </span>
        )}
      </div>
    </section>
  );
}
