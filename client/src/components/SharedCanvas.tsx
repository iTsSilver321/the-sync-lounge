"use client";

import { useEffect, useRef, useState } from "react";
import { connectSocket, socket } from "@/lib/socket";
import { Trash2, Undo2, Eraser, PenLine, AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion, AnimatePresence } from "framer-motion";

export default function SharedCanvas() {
  const { playPop } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local cache of drawing history
  const historyRef = useRef<any[]>([]);
  
  const [color, setColor] = useState("#A855F7");
  const [isEraser, setIsEraser] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const isDrawing = useRef(false);
  const prevPoint = useRef<{ x: number; y: number } | null>(null);
  const currentStrokeId = useRef<string | null>(null);

  // --- DRAWING HELPERS ---

  const drawLine = (ctx: CanvasRenderingContext2D, data: any) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.color === "#18181b" ? 12 : 4; 
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  };

  const repaintCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current.forEach((stroke) => {
        drawLine(ctx, stroke);
    });
  };

  // --- 1. SOCKET & SYNC ---

  useEffect(() => {
    connectSocket();

    // Trigger history fetch (Server fix allows this to work on re-visit)
    socket.emit("join_room", roomId);

    const handleRemoteDraw = (data: any) => {
      historyRef.current.push(data);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawLine(ctx, data);
    };

    const handleHistory = (serverHistory: any[]) => {
      // console.log("🎨 History Loaded:", serverHistory.length);
      historyRef.current = serverHistory;
      repaintCanvas();
    };

    const handleClear = () => {
      historyRef.current = [];
      repaintCanvas();
    };

    socket.on("canvas:draw", handleRemoteDraw);
    socket.on("canvas:history", handleHistory);
    socket.on("canvas:clear", handleClear);

    return () => {
      socket.off("canvas:draw", handleRemoteDraw);
      socket.off("canvas:history", handleHistory);
      socket.off("canvas:clear", handleClear);
    };
  }, [roomId]);

  // --- 2. RESPONSIVE RESIZE ---

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (canvas && container.offsetWidth > 0) {
        canvas.width = container.offsetWidth;
        canvas.height = window.innerHeight * 0.75;
        repaintCanvas(); 
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []); 

  // --- 3. INPUT HANDLERS ---

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    currentStrokeId.current = `${socket.id}-${Date.now()}`;
    const { x, y } = getCoords(e);
    prevPoint.current = { x, y };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !prevPoint.current) return;
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current?.getContext("2d");
    
    if (ctx) {
      const activeColor = isEraser ? "#18181b" : color;
      const strokeData = {
        prevX: prevPoint.current.x, prevY: prevPoint.current.y,
        x, y, color: activeColor,
        strokeId: currentStrokeId.current,
        userId: socket.id
      };

      drawLine(ctx, strokeData);
      historyRef.current.push(strokeData);
      socket.emit("canvas:draw", strokeData);
      prevPoint.current = { x, y };
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    prevPoint.current = null;
    currentStrokeId.current = null;
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

  // Tools
  const confirmClear = () => {
    socket.emit("canvas:clear");
    setShowClearConfirm(false);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-center w-full h-full overflow-hidden">
      
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="bg-zinc-900 rounded-3xl touch-none cursor-crosshair shadow-inner"
      />

      {/* Floating Palette */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-24 glass-panel px-4 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-white/10 z-20"
      >
         <div className="flex gap-2 border-r border-white/10 pr-4">
             {['#A855F7', '#EC4899', '#22C55E', '#3B82F6', '#FFFFFF'].map((c) => (
                 <button
                    key={c}
                    onClick={() => { setColor(c); setIsEraser(false); playPop(); }}
                    className={`w-6 h-6 rounded-full transition-all ${color === c && !isEraser ? "scale-125 ring-2 ring-white" : "hover:scale-110 opacity-80 hover:opacity-100"}`}
                    style={{ backgroundColor: c }}
                 />
             ))}
         </div>

         <div className="flex gap-4 text-zinc-400">
             <button onClick={() => { setIsEraser(!isEraser); playPop(); }} className={`hover:text-white transition-colors ${isEraser ? "text-white scale-110" : ""}`}>
                {isEraser ? <Eraser size={20} /> : <PenLine size={20} />}
             </button>
             <button onClick={() => { socket.emit("canvas:undo"); playPop(); }} className="hover:text-white transition-colors active:scale-90">
                <Undo2 size={20} />
             </button>
             <button onClick={() => { setShowClearConfirm(true); playPop(); }} className="hover:text-red-400 transition-colors">
                <Trash2 size={20} />
             </button>
         </div>
      </motion.div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.9, y: 20 }} 
                    className="bg-zinc-800 border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center"
                >
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Clear Canvas?</h3>
                    <p className="text-zinc-400 text-sm mb-6">This will wipe the entire board for both of you.</p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowClearConfirm(false)} 
                            className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-medium text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmClear} 
                            className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-colors"
                        >
                            Wipe It
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}