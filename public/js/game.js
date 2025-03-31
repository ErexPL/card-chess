const socket = io();
let board = null;
let game = new Chess();
let playerColor = 'white';
let selectedSquare = null;

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

if (!roomId) {
    window.location.href = '/';
}

socket.emit('join-game', roomId);

socket.on('start-game', (data) => {
    console.log('Received start-game event:', data);
    playerColor = data.players[0] === socket.id ? 'white' : 'black';
    console.log('Player color set to:', playerColor);
    
    if (!board) {
        initializeBoard();
    }
    
    if (data.currentFen) {
        game.load(data.currentFen);
        board.position(data.currentFen);
    }
    
    board.orientation(playerColor);
    document.getElementById('playerIndicator').textContent = `You are playing as ${playerColor}`;
});

socket.on('opponent-move', ({ source, target, fen }) => {
    console.log('Opponent moved:', source, target, fen);
    game.load(fen);
    board.position(fen);
    removeHighlights();
});

function initializeBoard() {
    const config = {
        position: 'start',
        orientation: playerColor,
        draggable: false,
        showNotation: true,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    board = Chessboard('gameBoard', config);
    
    setTimeout(() => {
        $('.square-55d63').off('click').on('click', function() {
            const square = $(this).data('square');
            handleSquareClick(square);
        });
    }, 100);
    
    $(window).resize(() => {
        board.resize();
    });
}

function handleSquareClick(square) {
    if ((game.turn() === 'w' && playerColor !== 'white') ||
        (game.turn() === 'b' && playerColor !== 'black')) {
        console.log('Not your turn');
        return;
    }

    const piece = game.get(square);
    const isMyPiece = piece && ((piece.color === 'w' && playerColor === 'white') ||
                               (piece.color === 'b' && playerColor === 'black'));

    console.log('Piece:', piece, 'isMyPiece:', isMyPiece);

    if (isMyPiece) {
        selectedSquare = square;
        removeHighlights();
        $(`[data-square="${square}"]`).addClass('highlight-square');
        showPossibleMoves(square);
        return;
    }

    if (selectedSquare) {
        const move = game.move({
            from: selectedSquare,
            to: square,
            promotion: 'q'
        });

        if (move !== null) {
            console.log('Move made:', move);
            socket.emit('move', {
                source: selectedSquare,
                target: square,
                roomId: roomId,
                fen: game.fen()
            });
            board.position(game.fen());
        }
        removeHighlights();
        selectedSquare = null;
    }
}

function showPossibleMoves(square) {
    const moves = game.moves({
        square: square,
        verbose: true
    });
    
    moves.forEach(move => {
        $(`[data-square="${move.to}"]`).addClass('highlight-move');
    });
}

function removeHighlights() {
    $('.square-55d63').removeClass('highlight-square highlight-move');
}

const style = document.createElement('style');
style.textContent = `
    .highlight-square {
        box-shadow: inset 0 0 3px 3px yellow !important;
    }
    .highlight-move {
        box-shadow: inset 0 0 3px 3px green !important;
    }
`;
document.head.appendChild(style);
