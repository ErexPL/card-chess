const socket = io(); // Initialize socket.io connection
let selectedPiece = null;
let highlightedSquares = [];
let playerColor = null; // Track the player's color
let currentTurn = 'white'; // Track whose turn it is

class ChessPiece {
    constructor(color, position) {
        this.color = color; // 'white' or 'black'
        this.position = position; // e.g., 'e4'
    }

    // Abstract method to get possible moves (to be overridden by subclasses)
    getPossibleMoves(board) {
        throw new Error("getPossibleMoves() must be implemented in subclasses");
    }

    move(newPosition) {
        this.position = newPosition;
    }
}

// Pawn class
class Pawn extends ChessPiece {
    getPossibleMoves(board) {
        const moves = [];
        const direction = this.color === 'white' ? 1 : -1;
        const [file, rank] = this.position.split('');
        const newRank = parseInt(rank) + direction;

        // Forward move
        const forward = file + newRank;
        if (!board.getPiece(forward)) {
            moves.push(forward);
        }

        // Capture moves
        const captureLeft = String.fromCharCode(file.charCodeAt(0) - 1) + newRank;
        const captureRight = String.fromCharCode(file.charCodeAt(0) + 1) + newRank;

        if (board.getPiece(captureLeft)?.color !== this.color) {
            moves.push(captureLeft);
        }
        if (board.getPiece(captureRight)?.color !== this.color) {
            moves.push(captureRight);
        }

        return moves;
    }
}

// Rook class
class Rook extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, ['up', 'down', 'left', 'right']);
    }
}

// Knight class
class Knight extends ChessPiece {
    getPossibleMoves(board) {
        const moves = [];
        const [file, rank] = this.position.split('');
        const knightMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];

        knightMoves.forEach(([df, dr]) => {
            const newFile = String.fromCharCode(file.charCodeAt(0) + df);
            const newRank = parseInt(rank) + dr;
            const newPosition = newFile + newRank;

            if (board.isValidSquare(newPosition) && (!board.getPiece(newPosition) || board.getPiece(newPosition).color !== this.color)) {
                moves.push(newPosition);
            }
        });

        return moves;
    }
}

// Bishop class
class Bishop extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, ['up-left', 'up-right', 'down-left', 'down-right']);
    }
}

// Queen class
class Queen extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, [
            'up', 'down', 'left', 'right',
            'up-left', 'up-right', 'down-left', 'down-right'
        ]);
    }
}

// King class
class King extends ChessPiece {
    getPossibleMoves(board) {
        const moves = [];
        const [file, rank] = this.position.split('');
        const kingMoves = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        kingMoves.forEach(([df, dr]) => {
            const newFile = String.fromCharCode(file.charCodeAt(0) + df);
            const newRank = parseInt(rank) + dr;
            const newPosition = newFile + newRank;

            if (board.isValidSquare(newPosition) && (!board.getPiece(newPosition) || board.getPiece(newPosition).color !== this.color)) {
                moves.push(newPosition);
            }
        });

        return moves;
    }
}

class Board {
    constructor() {
        this.grid = this.initializeBoard();
    }

    // Initialize the board with pieces in their starting positions
    initializeBoard() {
        const grid = Array(8).fill(null).map(() => Array(8).fill(null));

        // Place pawns
        for (let file = 0; file < 8; file++) {
            grid[6][file] = new Pawn('white', String.fromCharCode('a'.charCodeAt(0) + file) + '2');
            grid[1][file] = new Pawn('black', String.fromCharCode('a'.charCodeAt(0) + file) + '7');
        }

        // Place rooks
        grid[7][0] = new Rook('white', 'a1');
        grid[7][7] = new Rook('white', 'h1');
        grid[0][0] = new Rook('black', 'a8');
        grid[0][7] = new Rook('black', 'h8');

        // Place knights
        grid[7][1] = new Knight('white', 'b1');
        grid[7][6] = new Knight('white', 'g1');
        grid[0][1] = new Knight('black', 'b8');
        grid[0][6] = new Knight('black', 'g8');

        // Place bishops
        grid[7][2] = new Bishop('white', 'c1');
        grid[7][5] = new Bishop('white', 'f1');
        grid[0][2] = new Bishop('black', 'c8');
        grid[0][5] = new Bishop('black', 'f8');

        // Place queens
        grid[7][3] = new Queen('white', 'd1');
        grid[0][3] = new Queen('black', 'd8');

        // Place kings
        grid[7][4] = new King('white', 'e1');
        grid[0][4] = new King('black', 'e8');

        return grid;
    }

    // Get the piece at a specific position (e.g., 'e4')
    getPiece(position) {
        const [rank, file] = this.positionToIndices(position);
        return this.grid[rank][file];
    }

    // Move a piece from one position to another
    movePiece(from, to) {
        const [fromRank, fromFile] = this.positionToIndices(from);
        const [toRank, toFile] = this.positionToIndices(to);

        const piece = this.grid[fromRank][fromFile];
        if (!piece) {
            throw new Error(`No piece at position ${from}`);
        }

        // Update the piece's position
        piece.move(to);

        // Move the piece on the board
        this.grid[toRank][toFile] = piece;
        this.grid[fromRank][fromFile] = null;
    }

    // Check if a square is valid (within bounds)
    isValidSquare(position) {
        const [rank, file] = this.positionToIndices(position);
        return rank >= 0 && rank < 8 && file >= 0 && file < 8;
    }

    // Convert position (e.g., 'e4') to grid indices
    positionToIndices(position) {
        const file = position.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(position[1]);
        return [rank, file];
    }

    // Convert grid indices to position (e.g., [4, 4] -> 'e4')
    indicesToPosition(rank, file) {
        const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
        const rankChar = (8 - rank).toString();
        return fileChar + rankChar;
    }

    // Generate FEN string from the current board state
    generateFEN() {
        let fen = '';

        for (let rank = 0; rank < 8; rank++) {
            let emptyCount = 0;

            for (let file = 0; file < 8; file++) {
                const piece = this.grid[rank][file];

                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }

                    const pieceChar = this.getPieceChar(piece);
                    fen += pieceChar;
                } else {
                    emptyCount++;
                }
            }

            if (emptyCount > 0) {
                fen += emptyCount;
            }

            if (rank < 7) {
                fen += '/';
            }
        }

        // Add default FEN metadata (active color, castling, etc.)
        fen += ` ${currentTurn} - - 0 1`; // Default values for simplicity

        return fen;
    }

    // Helper function to get FEN character for a piece
    getPieceChar(piece) {
        const charMap = {
            Pawn: 'p',
            Rook: 'r',
            Knight: 'n',
            Bishop: 'b',
            Queen: 'q',
            King: 'k',
        };

        const char = charMap[piece.constructor.name];
        return piece.color === 'white' ? char.toUpperCase() : char;
    }

    // Load the board state from a FEN string
    loadFromFEN(fen) {
        const rows = fen.split(' ')[0].split('/');
        this.grid = Array(8).fill(null).map(() => Array(8).fill(null));

        rows.forEach((row, rank) => {
            let file = 0;
            for (const char of row) {
                if (isNaN(char)) {
                    const color = char === char.toUpperCase() ? 'white' : 'black';
                    const type = char.toLowerCase();
                    const position = this.indicesToPosition(rank, file);

                    switch (type) {
                        case 'p':
                            this.grid[rank][file] = new Pawn(color, position);
                            break;
                        case 'r':
                            this.grid[rank][file] = new Rook(color, position);
                            break;
                        case 'n':
                            this.grid[rank][file] = new Knight(color, position);
                            break;
                        case 'b':
                            this.grid[rank][file] = new Bishop(color, position);
                            break;
                        case 'q':
                            this.grid[rank][file] = new Queen(color, position);
                            break;
                        case 'k':
                            this.grid[rank][file] = new King(color, position);
                            break;
                    }
                    file++;
                } else {
                    file += parseInt(char); // Skip empty squares
                }
            }
        });
    }
}

// Handle square click
function handleSquareClick(position, board) {
    const piece = board.getPiece(position);

    // If it's not the player's turn, ignore the click
    if (currentTurn !== playerColor) {
        alert("It's not your turn!");
        return;
    }

    // If a piece is selected and the clicked square is a valid move
    if (selectedPiece && highlightedSquares.includes(position)) {
        const from = selectedPiece.position;
        const to = position;

        // Move the piece locally
        board.movePiece(from, to);
        selectedPiece = null;
        clearHighlights();
        updateBoard(board);

        // Emit the move to the server
        const fen = board.generateFEN();
        socket.emit('move', { source: from, target: to, roomId, fen });

        return;
    }

    // If a piece is clicked, select it and highlight its possible moves
    if (piece && piece.color === playerColor) {
        if (selectedPiece === piece) {
            // If the same piece is clicked again, deselect it
            selectedPiece = null;
            clearHighlights();
        } else {
            // Select the new piece
            selectedPiece = piece;
            clearHighlights();
            highlightMoves(piece, board);
        }
    } else {
        // If an empty square is clicked, clear selection
        selectedPiece = null;
        clearHighlights();
    }
}

// Highlight possible moves for a piece
function highlightMoves(piece, board) {
    const possibleMoves = piece.getPossibleMoves(board); // Get possible moves
    highlightedSquares = possibleMoves;

    possibleMoves.forEach((move) => {
        const square = document.querySelector(`[data-position="${move}"]`);
        if (square) {
            square.classList.add('highlight'); // Highlight the square
        }
    });
}

// Clear all highlights
function clearHighlights() {
    highlightedSquares.forEach((move) => {
        const square = document.querySelector(`[data-position="${move}"]`);
        if (square) {
            square.classList.remove('highlight'); // Remove highlight
        }
    });
    highlightedSquares = [];
}

// Update the board after a move
function updateBoard(board) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = ''; // Clear the current board
    const boardHTML = generateBoardHTML(board);
    gameBoard.appendChild(boardHTML);
}

// Generate the board HTML
function generateBoardHTML(board) {
    const boardContainer = document.createElement('div');
    boardContainer.className = 'chessboard';

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const square = document.createElement('div');
            const isLightSquare = (rank + file) % 2 === 0;
            square.className = `square ${isLightSquare ? 'light' : 'dark'}`;
            const position = board.indicesToPosition(rank, file);
            square.dataset.position = position;

            // Add click event directly to the square
            square.onclick = () => handleSquareClick(position, board);

            // Get the piece at the current position
            const piece = board.grid[rank][file];
            if (piece) {
                const pieceElement = document.createElement('img');
                pieceElement.className = `piece`;
                pieceElement.src = getPieceSVGPath(piece);
                pieceElement.draggable = false; // Disable default drag behavior
                square.appendChild(pieceElement);
            }

            boardContainer.appendChild(square);
        }
    }

    return boardContainer;
}

// Helper function to get the SVG path for a piece
function getPieceSVGPath(piece) {
    const pieceMap = {
        Pawn: 'pawn',
        Rook: 'rook',
        Knight: 'knight',
        Bishop: 'bishop',
        Queen: 'queen',
        King: 'king',
    };

    const pieceName = pieceMap[piece.constructor.name];
    const color = piece.color === 'white' ? 'w' : 'b';
    return `/svgs/${pieceName}-${color}.svg`;
}

// Initialize the board and add it to the DOM
const board = new Board();
const roomId = new URLSearchParams(window.location.search).get('room'); // Get room ID from URL
socket.emit('join-game', roomId);

// Listen for the current game state
// Listen for the current game state
socket.on('game-state', (data) => {
    console.log('Game state received:', data); // Debugging: Log the received data
    playerColor = data.playerColor; // Set the player's color from the server
    currentTurn = data.currentTurn;

    document.getElementById('playerIndicator').textContent = `You are playing as ${playerColor}`;
    board.loadFromFEN(data.currentFen); // Load the board state from the FEN string
    updateBoard(board);
});

// Listen for game start
socket.on('start-game', (data) => {
    console.log('Game started:', data);
    playerColor = data.players[0] === socket.id ? 'white' : 'black';
    currentTurn = data.currentTurn;

    document.getElementById('playerIndicator').textContent = `You are playing as ${playerColor}`;
    board.loadFromFEN(data.currentFen); // Load the board state from the FEN string
    updateBoard(board);
});

// Listen for opponent's move
socket.on('opponent-move', ({ source, target, fen }) => {
    console.log(`Opponent moved from ${source} to ${target}`);
    board.movePiece(source, target);
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    board.loadFromFEN(fen); // Update the board state from the FEN string
    updateBoard(board);
});

// Listen for move errors
socket.on('move-error', (message) => {
    alert(message);
});