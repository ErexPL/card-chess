const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};
const gameStates = {};
const matchmaking = [];

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get("/game", (req, res) => {
    res.sendFile(__dirname + '/views/game.html');
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("create-room", (lobbyCode) => {
        if (rooms[lobbyCode]) {
            socket.emit("join-error", "Room already exists");
            return;
        }
        rooms[lobbyCode] = [socket.id];
        gameStates[lobbyCode] = {
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        };
        socket.join(lobbyCode);
        socket.emit("room-created", lobbyCode);
    });

    socket.on("join-room", (lobbyCode) => {
        if (!rooms[lobbyCode]) {
            socket.emit("join-error", "Room not found");
            return;
        }
        
        if (rooms[lobbyCode].length >= 2) {
            socket.emit("room-full");
            return;
        }
        
        if (rooms[lobbyCode].includes(socket.id)) {
            socket.emit("join-error", "Cannot join your own room");
            return;
        }
        
        rooms[lobbyCode].push(socket.id);
        socket.join(lobbyCode);
        
        if (rooms[lobbyCode].length === 2) {
            io.to(lobbyCode).emit("start-game", {
                roomId: lobbyCode,
                players: rooms[lobbyCode],
                currentFen: gameStates[lobbyCode].fen
            });
        } else {
            socket.emit("join-success", lobbyCode);
        }
    });

    socket.on("find-match", () => {
        if (matchmaking.includes(socket.id)) return;
        
        if (matchmaking.length > 0) {
            const opponent = matchmaking.shift();
            const roomId = generateLobbyCode();
            rooms[roomId] = [opponent, socket.id];
            io.to(opponent).emit("join-success", roomId);
            socket.emit("join-success", roomId);
        } else {
            matchmaking.push(socket.id);
        }
    });

    socket.on("move", ({ source, target, roomId, fen }) => {
        if (rooms[roomId]) {
            socket.to(roomId).emit("opponent-move", { source, target, fen });
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

    socket.on("rejoin-game", (roomId) => {
        if (rooms[roomId] && rooms[roomId].includes(socket.id)) {
            socket.join(roomId);
            io.to(roomId).emit("start-game", {
                roomId: roomId,
                players: rooms[roomId]
            });
        }
    });

    socket.on("join-game", (roomId) => {
        console.log(`Player ${socket.id} joining game in room ${roomId}`);
        if (!rooms[roomId]) {
            console.log('Room not found, creating new room:', roomId);
            rooms[roomId] = [];
            gameStates[roomId] = {
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
            };
        }
        
        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }
        
        socket.join(roomId);
        io.to(roomId).emit("start-game", {
            roomId: roomId,
            players: rooms[roomId],
            currentFen: gameStates[roomId].fen
        });
        console.log('Emitted start-game event for room:', roomId, 'players:', rooms[roomId]);
    });

    socket.on('leave-room', (lobbyCode) => {
        if (rooms[lobbyCode]) {
            const index = rooms[lobbyCode].indexOf(socket.id);
            if (index > -1) {
                rooms[lobbyCode].splice(index, 1);
            }
        
            if (rooms[lobbyCode].length === 0) {
                delete rooms[lobbyCode];
                delete gameStates[lobbyCode];
            }
            
            socket.leave(lobbyCode);
            socket.emit('room-left');
        }
    });
});

function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 8}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
