const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {}; // Store rooms and players

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("create-room", () => {
        const roomId = uuidv4();
        rooms[roomId] = [socket.id];
        socket.join(roomId);
        socket.emit("room-created", roomId);
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    socket.on("join-room", (roomId) => {
        // Check if player is already in the room
        if (rooms[roomId] && rooms[roomId].includes(socket.id)) {
            socket.emit("join-error", "You cannot join your own room!");
            return;
        }

        if (rooms[roomId] && rooms[roomId].length < 2) {
            rooms[roomId].push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit("player-joined", rooms[roomId]);
            console.log(`${socket.id} joined room ${roomId}`);
        } else {
            socket.emit("room-full", roomId);
        }
    });

    socket.on("move", ({ source, target, roomId, fen }) => {
        if (rooms[roomId]) {
            io.in(roomId).emit("opponent-move", { source, target, fen });
            console.log(`Move from ${source} to ${target} in room ${roomId}`);
        }
    });

    socket.on("disconnect", () => {
        for (const [roomId, players] of Object.entries(rooms)) {
            rooms[roomId] = players.filter((id) => id !== socket.id);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }
        console.log("A user disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
