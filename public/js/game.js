const socket = io();
let selectedPiece = null;
let highlightedSquares = [];
let playerColor = null;
let currentTurn = 'white';

class ChessPiece {
    constructor(color, position) {
        this.color = color;
        this.position = position;
    }

    getPossibleMoves(board) {
        throw new Error("getPossibleMoves() must be implemented in subclasses");
    }

    move(newPosition) {
        this.position = newPosition;
    }
}

class Pawn extends ChessPiece {
    getPossibleMoves(board) {
        const moves = [];
        const direction = this.color === 'white' ? 1 : -1;
        const [file, rank] = this.position.split('');
        const newRank = parseInt(rank) + direction;

        const forward = file + newRank;
        if (!board.getPiece(forward)) {
            moves.push(forward);
        }

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

class Rook extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, ['up', 'down', 'left', 'right']);
    }
}

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

class Bishop extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, ['up-left', 'up-right', 'down-left', 'down-right']);
    }
}

class Queen extends ChessPiece {
    getPossibleMoves(board) {
        return board.getLinearMoves(this.position, this.color, [
            'up', 'down', 'left', 'right',
            'up-left', 'up-right', 'down-left', 'down-right'
        ]);
    }
}

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

    initializeBoard() {
        const grid = Array(8).fill(null).map(() => Array(8).fill(null));

        for (let file = 0; file < 8; file++) {
            grid[6][file] = new Pawn('white', String.fromCharCode('a'.charCodeAt(0) + file) + '2');
            grid[1][file] = new Pawn('black', String.fromCharCode('a'.charCodeAt(0) + file) + '7');
        }

        grid[7][0] = new Rook('white', 'a1');
        grid[7][7] = new Rook('white', 'h1');
        grid[0][0] = new Rook('black', 'a8');
        grid[0][7] = new Rook('black', 'h8');

        grid[7][1] = new Knight('white', 'b1');
        grid[7][6] = new Knight('white', 'g1');
        grid[0][1] = new Knight('black', 'b8');
        grid[0][6] = new Knight('black', 'g8');

        grid[7][2] = new Bishop('white', 'c1');
        grid[7][5] = new Bishop('white', 'f1');
        grid[0][2] = new Bishop('black', 'c8');
        grid[0][5] = new Bishop('black', 'f8');

        grid[7][3] = new Queen('white', 'd1');
        grid[0][3] = new Queen('black', 'd8');

        grid[7][4] = new King('white', 'e1');
        grid[0][4] = new King('black', 'e8');

        return grid;
    }

    getPiece(position) {
        const [rank, file] = this.positionToIndices(position);
        return this.grid[rank][file];
    }

    getLinearMoves(position, pieceColor, directions) {
        const moves = [];
        const [file, rank] = position.split('');
        const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const rankIndex = parseInt(rank) - 1;
        
        const directionVectors = {
            'up': [0, 1],
            'down': [0, -1],
            'left': [-1, 0],
            'right': [1, 0],
            'up-left': [-1, 1],
            'up-right': [1, 1],
            'down-left': [-1, -1],
            'down-right': [1, -1]
        };

        directions.forEach(direction => {
            const [dx, dy] = directionVectors[direction];
            let currentFile = fileIndex;
            let currentRank = rankIndex;

            while (true) {
                currentFile += dx;
                currentRank += dy;

                if (currentFile < 0 || currentFile > 7 || currentRank < 0 || currentRank > 7) {
                    break;
                }

                const newPosition = String.fromCharCode('a'.charCodeAt(0) + currentFile) + (currentRank + 1);
                const pieceAtPosition = this.getPiece(newPosition);

                if (!pieceAtPosition) {
                    moves.push(newPosition);
                } else {
                    if (pieceAtPosition.color !== pieceColor) {
                        moves.push(newPosition);
                    }
                    break;
                }
            }
        });

        return moves;
    }

    movePiece(from, to) {
        const [fromRank, fromFile] = this.positionToIndices(from);
        const [toRank, toFile] = this.positionToIndices(to);

        const piece = this.grid[fromRank][fromFile];
        if (!piece) {
            throw new Error(`No piece at position ${from}`);
        }

        piece.move(to);

        this.grid[toRank][toFile] = piece;
        this.grid[fromRank][fromFile] = null;
    }

    isValidSquare(position) {
        const [rank, file] = this.positionToIndices(position);
        return rank >= 0 && rank < 8 && file >= 0 && file < 8;
    }

    positionToIndices(position) {
        const file = position.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(position[1]);
        return [rank, file];
    }

    indicesToPosition(rank, file) {
        const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
        const rankChar = (8 - rank).toString();
        return fileChar + rankChar;
    }

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

        fen += ` ${currentTurn} - - 0 1`;

        return fen;
    }

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
                    file += parseInt(char);
                }
            }
        });
    }
}

function isPlayerTurn() {
    return playerColor === currentTurn;
}

function handleSquareClick(position, board) {
    if (!isPlayerTurn()) {
        return;
    }

    const piece = board.getPiece(position);

    if (selectedPiece) {
        if (highlightedSquares.includes(position)) {
            const oldPosition = selectedPiece.position;
            
            board.movePiece(oldPosition, position);
            
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            
            const urlParams = new URLSearchParams(window.location.search);
            const roomId = urlParams.get('room');
            
            socket.emit('move', {
                source: oldPosition,
                target: position,
                roomId: roomId,
                fen: board.generateFEN()
            });
            
            selectedPiece = null;
            clearHighlights();
            updateBoard(board);
            return;
        }
        
        selectedPiece = null;
        clearHighlights();
    }

    if (piece && piece.color === playerColor) {
        selectedPiece = piece;
        highlightMoves(piece, board);
    }
}

function highlightMoves(piece, board) {
    const possibleMoves = piece.getPossibleMoves(board);
    highlightedSquares = possibleMoves;

    possibleMoves.forEach((move) => {
        const square = document.querySelector(`[data-position="${move}"]`);
        if (square) {
            square.classList.add('highlight');
        }
    });
}

function clearHighlights() {
    highlightedSquares.forEach((move) => {
        const square = document.querySelector(`[data-position="${move}"]`);
        if (square) {
            square.classList.remove('highlight');
        }
    });
    highlightedSquares = [];
}

function updateBoard(board) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    const boardHTML = generateBoardHTML(board);
    gameBoard.appendChild(boardHTML);
}

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

            square.onclick = () => handleSquareClick(position, board);
            
            const piece = board.grid[rank][file];
            if (piece) {
                const pieceElement = document.createElement('img');
                pieceElement.className = `piece`;
                pieceElement.src = getPieceSVGPath(piece);
                pieceElement.draggable = false;
                square.appendChild(pieceElement);
            }

            boardContainer.appendChild(square);
        }
    }

    return boardContainer;
}

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

const board = new Board();
const roomId = new URLSearchParams(window.location.search).get('room');
socket.emit('join-game', roomId);

socket.on('game-state', (data) => {
    playerColor = data.playerColor;
    currentTurn = data.currentTurn;

    board.loadFromFEN(data.currentFen);
    updateBoard(board);
});

socket.on('start-game', (data) => {
    playerColor = data.players[0] === socket.id ? 'white' : 'black';
    currentTurn = data.currentTurn;

    board.loadFromFEN(data.currentFen);
    updateBoard(board);
});

socket.on('opponent-move', ({ source, target, fen }) => {
    board.loadFromFEN(fen);
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateBoard(board);
});

socket.on('move-error', (message) => {
    alert(message);
});
