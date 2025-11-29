require('dotenv').config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js"); 
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- MIDDLEWARE ---
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error: No token provided"));

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return next(new Error("Authentication error: Invalid token"));
    socket.user = user; 
    console.log(`✅ Authenticated: ${user.email} (${socket.id})`);
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

// --- GLOBAL MEMORY ---
const roomLikes = {}; 
const mindMeldAnswers = {}; 
const roomDrawings = {}; 
const roomMovieStartPage = {};
 
// NEW: Persist active game states
const roomMindState = {}; 
const roomTruthState = {};

const processingLocks = new Set(); 

io.on('connection', (socket) => {

  // JOIN ROOM (SECURE VERSION)
  socket.on('join_room', async (roomId) => {
    try {
      // 1. AUTHORIZATION CHECK 🛡️
      // We know who they are (socket.user.id), now let's check if they belong here.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', socket.user.id)
        .single();

      if (error || !profile || profile.couple_id !== roomId) {
        console.warn(`🚨 Unauthorized access attempt by ${socket.user.email} to room ${roomId}`);
        socket.emit('room:error', "⛔ You do not belong to this room.");
        return; // STOP EXECUTION
      }

      // 2. CONCURRENCY CHECK
      const room = io.sockets.adapter.rooms.get(roomId);
      const isAlreadyInRoom = socket.rooms.has(roomId);

      if (!isAlreadyInRoom && room && room.size >= 2) {
        socket.emit('room:error', "Room is full! Only 2 lovers allowed.");
        return; 
      }

      // 3. SUCCESS - JOIN
      socket.join(roomId);
      socket.data.roomId = roomId;

      // Send Canvas History
      if (roomDrawings[roomId]) {
          socket.emit('canvas:history', roomDrawings[roomId]);
      }

      if (!roomMovieStartPage[roomId]) roomMovieStartPage[roomId] = Math.floor(Math.random() * 20) + 1;
      socket.emit('movie:sync_page', { page: roomMovieStartPage[roomId] });

      // Sync Active Game States
      if (roomMindState[roomId]) socket.emit('mind:new_question', roomMindState[roomId]);
      if (roomTruthState[roomId]) socket.emit('truth:new_challenge', roomTruthState[roomId]);

    } catch (err) {
      console.error("Join Room Error:", err);
      socket.emit('room:error', "Server error during join.");
    }
  });

  // --- HEARTBEAT ---
  socket.on('heart:beat', () => {
    const roomId = socket.data.roomId;
    if (roomId) socket.broadcast.to(roomId).emit('heart:beat'); 
  });

  // --- DAILY PULSE ---
  socket.on('daily:generate', async () => {
    const roomId = socket.data.roomId;
    if (!roomId || processingLocks.has(roomId)) return;
    processingLocks.add(roomId);

    console.log(`[AI] Generating Daily Question for ${roomId}...`);
    try {
      const prompt = "Generate one engaging, deep question for a couple to answer together today. Text only, no formatting. Max 15 words.";
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      io.to(roomId).emit('daily:new_question', question);
    } catch (error) {
      io.to(roomId).emit('daily:new_question', "What is one thing you are grateful for today?");
    } finally {
       setTimeout(() => processingLocks.delete(roomId), 2000);
    }
  });

  socket.on('daily:submit', () => {
    if (socket.data.roomId) socket.broadcast.to(socket.data.roomId).emit('daily:partner_submitted');
  });

  // --- MIND MELD (UPDATED) ---
  socket.on('mind:generate_question', async (vibe) => {
    const roomId = socket.data.roomId;
    if (!roomId || processingLocks.has(roomId)) return;
    processingLocks.add(roomId);
    
    console.log(`[AI] Generating Mind Meld (${vibe})...`);
    try {
      const prompt = `Generate a single, short question for a couple. Vibe: ${vibe}. Max 15 words. Text only.`;
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      
      // SAVE STATE
      roomMindState[roomId] = question;
      
      io.to(roomId).emit('mind:new_question', question);
    } catch (error) {
      io.to(roomId).emit('mind:new_question', "What is your favorite memory of us?");
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000); 
    }
  });

  // --- TRUTH OR DARE (UPDATED) ---
  socket.on('truth:generate', async ({ type, intensity }) => {
    const roomId = socket.data.roomId;
    if (!roomId || processingLocks.has(roomId)) return;
    processingLocks.add(roomId);

    try {
      const prompt = `Generate a ${type} challenge for a couple. Intensity: ${intensity}. Max 15 words. Output ONLY the text.`;
      const result = await model.generateContent(prompt);
      const challenge = result.response.text().trim();
      
      // SAVE STATE
      roomTruthState[roomId] = { text: challenge, type };

      io.to(roomId).emit('truth:new_challenge', { text: challenge, type });
    } catch (error) {
      io.to(roomId).emit('truth:new_challenge', { text: "Tell your partner something you love.", type: "truth" });
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000);
    }
  });

  // --- MOVIES ---
  socket.on('movie:swipe', ({ movieId, direction }) => {
    const roomId = socket.data.roomId; 
    if (!roomId) return;
    if (direction === 'right') {
      if (!roomLikes[roomId]) roomLikes[roomId] = {};
      if (!roomLikes[roomId][movieId]) roomLikes[roomId][movieId] = [];
      const movieLikes = roomLikes[roomId][movieId];
      if (!movieLikes.includes(socket.id)) movieLikes.push(socket.id);
      if (movieLikes.length >= 2) io.to(roomId).emit('movie:match_found', { movieId });
    }
  });

  socket.on('mind:typing', (isTyping) => {
    if (socket.data.roomId) socket.broadcast.to(socket.data.roomId).emit('mind:partner_typing', isTyping);
  });

  socket.on('mind:submit', ({ answer }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    mindMeldAnswers[socket.id] = answer;
    socket.broadcast.to(roomId).emit('mind:partner_submitted');
    
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size === 2) {
      const ids = Array.from(room);
      if (mindMeldAnswers[ids[0]] && mindMeldAnswers[ids[1]]) {
        io.to(ids[0]).emit('mind:reveal', { answer: mindMeldAnswers[ids[1]] });
        io.to(ids[1]).emit('mind:reveal', { answer: mindMeldAnswers[ids[0]] });
        delete mindMeldAnswers[ids[0]]; delete mindMeldAnswers[ids[1]];
      }
    }
  });

  // --- CANVAS ---
  socket.on('canvas:draw', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      if (!roomDrawings[roomId]) roomDrawings[roomId] = [];
      const point = { ...data, userId: socket.id };
      roomDrawings[roomId].push(point);
      socket.broadcast.to(roomId).emit('canvas:draw', point);
    }
  });
  
  socket.on('canvas:undo', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !roomDrawings[roomId]) return;
    const drawings = roomDrawings[roomId];
    let targetStrokeId = null;
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (drawings[i].userId === socket.id) {
        targetStrokeId = drawings[i].strokeId;
        break;
      }
    }
    if (targetStrokeId) {
      roomDrawings[roomId] = drawings.filter(pt => pt.strokeId !== targetStrokeId);
      io.to(roomId).emit('canvas:clear'); 
      io.to(roomId).emit('canvas:history', roomDrawings[roomId]);
    }
  });

  socket.on('canvas:clear', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      roomDrawings[roomId] = [];
      io.to(roomId).emit('canvas:clear');
    }
  });
  
  socket.on('disconnect', () => {
    delete mindMeldAnswers[socket.id];
    const roomId = socket.data.roomId;
    if (roomId && roomLikes[roomId]) {
       Object.keys(roomLikes[roomId]).forEach(movieId => {
         roomLikes[roomId][movieId] = roomLikes[roomId][movieId].filter(id => id !== socket.id);
       });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});