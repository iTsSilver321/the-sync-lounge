"use client";

import { useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket"; // <--- CRITICAL FIX
import { Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";

export default function SharedCanvas() {
  const { playPop } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#A855F7");
  const prevPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // 1. CONNECT & JOIN
    if (!socket.connected) socket.connect();
    socket.emit("join_room", roomId);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Responsive Canvas Size
    const setSize = () => {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = window.innerHeight * 0.6;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
        }
    };
    setSize();
    window.addEventListener("resize", setSize);

    // 2. LISTENERS
    const handleDraw = ({ x, y, prevX, prevY, color }: any) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleHistory = (history: any[]) => {
      history.forEach((line) => handleDraw(line));
    };

    const handleClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on("canvas:draw", handleDraw);
    socket.on("canvas:history", handleHistory);
    socket.on("canvas:clear", handleClear);

    return () => {
      window.removeEventListener("resize", setSize);
      socket.off("canvas:draw", handleDraw);
      socket.off("canvas:history", handleHistory);
      socket.off("canvas:clear", handleClear);
    };
  }, [roomId]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    prevPoint.current = { x, y };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !prevPoint.current) return;
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current?.getContext("2d");
    
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(prevPoint.current.x, prevPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // EMIT TO PARTNER
      socket.emit("canvas:draw", {
        prevX: prevPoint.current.x,
        prevY: prevPoint.current.y,
        x,
        y,
        color
      });

      prevPoint.current = { x, y };
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    prevPoint.current = null;
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    } else {
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    }
  };

  const handleClear = () => {
    playPop();
    socket.emit("canvas:clear");
  };

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="bg-zinc-800 p-2 rounded-t-2xl w-full max-w-md flex justify-between items-center px-6">
         <span className="text-zinc-400 text-xs uppercase tracking-widest">Shared Canvas</span>
         <div className="flex gap-4">
             <button onClick={() => { setColor("#A855F7"); playPop(); }} className={`w-6 h-6 rounded-full bg-purple-500 ${color === "#A855F7" ? "ring-2 ring-white" : ""}`} />
             <button onClick={() => { setColor("#EC4899"); playPop(); }} className={`w-6 h-6 rounded-full bg-pink-500 ${color === "#EC4899" ? "ring-2 ring-white" : ""}`} />
             <button onClick={() => { setColor("#22C55E"); playPop(); }} className={`w-6 h-6 rounded-full bg-green-500 ${color === "#22C55E" ? "ring-2 ring-white" : ""}`} />
         </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="bg-zinc-900 border-x border-zinc-800 touch-none cursor-crosshair w-full"
      />

      <div className="bg-zinc-800 p-4 rounded-b-2xl w-full max-w-md flex justify-center">
        <button onClick={handleClear} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors">
            <Trash2 size={18} /> Clear Board
        </button>
      </div>
    </div>
  );
}