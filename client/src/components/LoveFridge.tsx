"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Archive, Sticker, Save, ArrowDown } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";

const NOTE_COLORS = [
    { bg: "bg-yellow-300", text: "text-zinc-900", rotate: -2 },
    { bg: "bg-blue-300", text: "text-zinc-900", rotate: 3 },
    { bg: "bg-pink-300", text: "text-zinc-900", rotate: -1 },
    { bg: "bg-green-300", text: "text-zinc-900", rotate: 2 },
    { bg: "bg-purple-300", text: "text-zinc-900", rotate: -3 },
];

export default function LoveFridge({ user, coupleId, partnerProfile }: { user: any, coupleId: string, partnerProfile?: any }) {
  const { playPop, playSwipe, playMatch } = useGameSounds();
  const [notes, setNotes] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingID, setIsDraggingID] = useState<string | null>(null);
  
  // Track if we are over the drop zone
  const [isHoveringArchive, setIsHoveringArchive] = useState(false);

  const getAuthorName = (authorId: string) => {
      if (authorId === user.id) return "Me";
      if (partnerProfile && authorId === partnerProfile.id) {
          return partnerProfile.display_name || "Partner";
      }
      return "Partner";
  };

  useEffect(() => {
    fetchNotes();

    socket.on('note:moved', (data: any) => {
        setNotes(prev => prev.map(n => n.id === data.id ? { ...n, position_x: data.x, position_y: data.y } : n));
    });

    socket.on('note:created', (newNote: any) => {
        setNotes(prev => [...prev, newNote]);
        playPop();
    });

    socket.on('note:deleted', (noteId: string) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
    });

    return () => {
        socket.off('note:moved');
        socket.off('note:created');
        socket.off('note:deleted');
    };
  }, []);

  const fetchNotes = async () => {
      const { data } = await supabase.from('notes').select('*').eq('couple_id', coupleId);
      if (data) setNotes(data);
  };

  const createNote = async () => {
      if (!newNoteText.trim()) return;
      playPop();
      
      const style = NOTE_COLORS[selectedColor];
      const startX = Math.random() * 50 - 25; 
      const startY = Math.random() * 50 - 25;

      const newNote = {
          couple_id: coupleId,
          author_id: user.id,
          content: newNoteText,
          style: style,
          position_x: startX,
          position_y: startY
      };

      const tempId = Math.random().toString();
      const optimNote = { ...newNote, id: tempId };
      setNotes(prev => [...prev, optimNote]);
      setIsCreating(false);
      setNewNoteText("");

      const { data } = await supabase.from('notes').insert(newNote).select().single();
      
      if (data) {
          setNotes(prev => prev.map(n => n.id === tempId ? data : n));
          socket.emit('note:create', data);
      }
  };

  const handleDragEnd = async (note: any, info: any) => {
      setIsDraggingID(null);
      setIsHoveringArchive(false);
      
      const containerRect = containerRef.current?.getBoundingClientRect();
      const dropY = info.point.y; 
      const containerBottom = containerRect ? containerRect.bottom : window.innerHeight;

      if (containerRect && dropY > containerBottom - 150) {
          archiveNote(note);
          return;
      }

      const newX = note.position_x + info.offset.x;
      const newY = note.position_y + info.offset.y;

      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, position_x: newX, position_y: newY } : n));
      await supabase.from('notes').update({ position_x: newX, position_y: newY }).eq('id', note.id);
  };

  const handleDrag = (note: any, info: any) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      const dropY = info.point.y; 
      const containerBottom = containerRect ? containerRect.bottom : window.innerHeight;
      
      const isOver = dropY > containerBottom - 150;
      
      if (isOver !== isHoveringArchive) {
          setIsHoveringArchive(isOver);
          if (isOver && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
      }

      socket.emit('note:move', { 
          id: note.id, 
          x: note.position_x + info.offset.x, 
          y: note.position_y + info.offset.y 
      });
  };

  const archiveNote = async (note: any) => {
      playMatch();
      setNotes(prev => prev.filter(n => n.id !== note.id));
      socket.emit('note:delete', note.id);
      
      await supabase.from('notes').delete().eq('id', note.id);
      await supabase.from('history').insert({
          room_id: coupleId,
          category: 'note',
          user_id: note.author_id,
          content: { text: note.content, style: note.style }
      });
  };

  return (
    <div ref={containerRef} className="relative w-full h-[70vh] bg-zinc-900/30 rounded-3xl overflow-hidden border border-white/5">
        
        {notes.length === 0 && !isCreating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 pointer-events-none">
                <Sticker size={48} className="mb-4 opacity-50" />
                <p className="text-xs uppercase tracking-widest font-bold">Fridge is empty</p>
                <p className="text-[10px]">Tap + to leave a note</p>
            </div>
        )}

        <AnimatePresence>
            {notes.map((note) => (
                <motion.div
                    key={note.id}
                    drag
                    dragMomentum={false}
                    dragConstraints={containerRef}
                    onDragStart={() => setIsDraggingID(note.id)}
                    onDrag={(e, info) => handleDrag(note, info)}
                    onDragEnd={(e, info) => handleDragEnd(note, info)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                        x: note.position_x, 
                        y: note.position_y, 
                        // ANIMATION CHANGE: Shrink note to 0.5 when hovering drop zone
                        scale: isDraggingID === note.id ? (isHoveringArchive ? 0.5 : 1.1) : 1,
                        rotate: (note.style?.rotate || 0),
                        opacity: isDraggingID === note.id && isHoveringArchive ? 0.7 : 1, // Fade slightly
                        zIndex: isDraggingID === note.id ? 50 : 10,
                        // VISUAL FEEDBACK: Tint red when hovering
                        backgroundColor: isDraggingID === note.id && isHoveringArchive ? "#fca5a5" : "", // Red tint
                    }}
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
                    className={`absolute left-1/2 top-1/2 w-40 p-4 shadow-xl cursor-grab active:cursor-grabbing rounded-lg ${note.style?.bg || "bg-yellow-300"}`}
                    style={{ marginLeft: -80, marginTop: -80 }} 
                >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm border border-black/10" />
                    
                    <p className={`font-handwriting text-lg leading-snug font-medium ${note.style?.text || "text-zinc-900"}`}>
                        {note.content}
                    </p>
                    <p className="text-[9px] mt-2 opacity-50 font-bold uppercase tracking-widest text-right text-black">
                        {getAuthorName(note.author_id)}
                    </p>
                </motion.div>
            ))}
        </AnimatePresence>

        {/* --- ARCHIVE ZONE --- */}
        <AnimatePresence>
            {isDraggingID && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none"
                >
                    <motion.div 
                        animate={{
                            scale: 1, // Keep scale static as requested
                            backgroundColor: isHoveringArchive ? "rgba(220, 38, 38, 0.9)" : "rgba(220, 38, 38, 0.2)",
                            borderColor: isHoveringArchive ? "rgba(252, 165, 165, 1)" : "rgba(248, 113, 113, 0.5)",
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="backdrop-blur-md border rounded-3xl px-8 py-4 flex items-center gap-3 text-white shadow-2xl"
                    >
                        <Archive size={24} />
                        <span className="font-bold uppercase text-xs tracking-widest">
                            Drop to Save
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="absolute bottom-6 right-6 z-40">
            <button 
                onClick={() => { setIsCreating(true); playPop(); }}
                className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
                <Plus size={24} />
            </button>
        </div>

        <AnimatePresence>
            {isCreating && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl ${NOTE_COLORS[selectedColor].bg} transition-colors duration-300`}
                    >
                        <textarea 
                            autoFocus
                            placeholder="Write something..."
                            className={`w-full h-32 bg-transparent resize-none outline-none text-xl font-medium placeholder:text-zinc-500/50 ${NOTE_COLORS[selectedColor].text}`}
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex gap-2">
                                {NOTE_COLORS.map((c, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => { setSelectedColor(i); playPop(); }}
                                        className={`w-6 h-6 rounded-full border border-black/10 ${c.bg} ${selectedColor === i ? "ring-2 ring-black/40 scale-110" : ""}`}
                                    />
                                ))}
                            </div>
                            <button 
                                onClick={createNote}
                                disabled={!newNoteText.trim()}
                                className="bg-black/10 hover:bg-black/20 p-3 rounded-full text-black transition-colors disabled:opacity-30"
                            >
                                <Save size={20} />
                            </button>
                        </div>
                    </motion.div>
                    <div className="absolute inset-0 -z-10" onClick={() => setIsCreating(false)} />
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}