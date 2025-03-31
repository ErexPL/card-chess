const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};
const gameStates = {};

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get("/game", (req, res) => {
    res.sendFile(__dirname + '/views/game.html');
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Create a new room
    socket.on("create-room", (lobbyCode) => {
        if (rooms[lobbyCode]) {
            socket.emit("join-error", "Room already exists");
            return;
        }
        rooms[lobbyCode] = [socket.id];
        gameStates[lobbyCode] = {
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            currentTurn: 'white', // Track whose turn it is
        };
        socket.join(lobbyCode);
        socket.emit("room-created", lobbyCode);
    });

    // Join an existing room
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
                currentFen: gameStates[lobbyCode].fen,
                currentTurn: gameStates[lobbyCode].currentTurn,
            });
        } else {
            socket.emit("join-success", lobbyCode);
        }
    });

    // Join a game by room ID
    socket.on("join-game", (roomId) => {
        console.log(`Player ${socket.id} joining game in room ${roomId}`);
        if (!rooms[roomId]) {
            console.log('Room not found, creating new room:', roomId);
            rooms[roomId] = [];
            gameStates[roomId] = {
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                currentTurn: 'white',
            };
        }
    
        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }
    
        socket.join(roomId);
    
        // Determine the player's color
        const playerColor = rooms[roomId].indexOf(socket.id) === 0 ? 'white' : 'black';
    
        // Send the current game state and player's color to the client
        socket.emit("game-state", {
            roomId: roomId,
            players: rooms[roomId],
            playerColor: playerColor, // Ensure this is sent
            currentFen: gameStates[roomId].fen,
            currentTurn: gameStates[roomId].currentTurn,
        });
    
        console.log('Sent game state for room:', roomId, 'players:', rooms[roomId], 'playerColor:', playerColor);
    });

    // Handle a move
    socket.on("move", ({ source, target, roomId, fen }) => {
        if (!rooms[roomId]) {
            socket.emit("move-error", "Room not found");
            return;
        }

        const gameState = gameStates[roomId];
        const currentPlayer = rooms[roomId].indexOf(socket.id) === 0 ? 'white' : 'black';

        // Enforce turn-based gameplay
        if (gameState.currentTurn !== currentPlayer) {
            socket.emit("move-error", "Not your turn");
            return;
        }

        // Update the game state
        gameState.fen = fen;
        gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';

        // Broadcast the move to the other player
        socket.to(roomId).emit("opponent-move", { source, target, fen });
        console.log(`Move from ${source} to ${target} in room ${roomId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        for (const [roomId, players] of Object.entries(rooms)) {
            rooms[roomId] = players.filter((id) => id !== socket.id);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
                delete gameStates[roomId];
            }
        }
        console.log("A user disconnected:", socket.id);
    });

    // Leave a room
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
    return Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});