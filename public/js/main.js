        const socket = io();
        const status = document.getElementById("status");
        let board = null;
        let game = new Chess();
        let playerColor = 'white';
        let selectedSquare = null;

        function initializeBoard() {
            const config = {
                position: 'start',
                orientation: playerColor,
                draggable: false,
                pieceTheme: (piece) => {
                    const color = piece.charAt(0) === 'w' ? '-w' : '-b';
                    const pieceType = getPieceType(piece.charAt(1));
                    return `/svgs/${pieceType}${color}.svg`;
                }
            };
            board = Chessboard('gameBoard', config);

            $('.square-55d63').on('click', function() {
                const square = $(this).data('square');
                handleSquareClick(square);
            });
        }

        function getPieceType(piece) {
            const pieceTypes = {
                'P': 'pawn',
                'N': 'knight',
                'B': 'bishop',
                'R': 'rook',
                'Q': 'queen',
                'K': 'king'
            };
            return pieceTypes[piece];
        }

        function handleSquareClick(square) {
            if ((game.turn() === 'w' && playerColor !== 'white') ||
                (game.turn() === 'b' && playerColor !== 'black')) {
                return;
            }

            const piece = game.get(square);
            const isMyPiece = piece && ((piece.color === 'w' && playerColor === 'white') ||
                                      (piece.color === 'b' && playerColor === 'black'));

            // If clicking a new piece of your color
            if (isMyPiece) {
                selectedSquare = square;
                removeHighlights();
                $(`[data-square="${square}"]`).addClass('highlight-square');
                showPossibleMoves(square);
                return;
            }

            // If a piece is selected and clicking a destination
            if (selectedSquare) {
                const move = game.move({
                    from: selectedSquare,
                    to: square,
                    promotion: 'q'
                });

                if (move !== null) {
                    socket.emit('move', {
                        source: selectedSquare,
                        target: square,
                        roomId: document.getElementById("roomId").value,
                        fen: game.fen()
                    });
                    board.position(game.fen(), false);
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
                $(`[data-square="${move.to}"]`).addClass('possible-move');
            });
        }

        function removeHighlights() {
            $('.highlight-square').removeClass('highlight-square');
            $('.possible-move').removeClass('possible-move');
        }

        const style = document.createElement('style');
        style.textContent = `
            /* Selected piece highlight */
            .highlight-square {
                box-shadow: inset 0 0 0 4px rgba(78, 165, 255, 0.8) !important;
            }

            /* Possible moves highlight */
            .possible-move {
                position: relative;
            }
            .possible-move::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 24px;
                height: 24px;
                background: rgba(0, 0, 0, 0.12);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                z-index: 1;
            }

            /* Capture moves */
            .possible-move:has(.piece-417db)::before {
                width: 90%;
                height: 90%;
                background: none;
                border: 3px solid rgba(255, 59, 59, 0.75);
            }

            /* Dark square adjustments */
            .black-3c85d .possible-move::before {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.6);
            }
        `;
        document.head.appendChild(style);

        document.getElementById("createRoom").addEventListener("click", () => {
            socket.emit("create-room");
        });

        socket.on("room-created", (roomId) => {
            updateStatus(`Room Created! ID: ${roomId}`);
            const roomInput = document.getElementById("roomId");
            roomInput.value = roomId;
            roomInput.setAttribute("data-created-room", roomId);
            document.getElementById("playerIndicator").textContent = "Waiting for opponent...";
            document.getElementById("createRoom").disabled = true;
        });

        document.getElementById("joinRoom").addEventListener("click", () => {
            const roomId = document.getElementById("roomId").value;
            if (roomId) {
                socket.emit("join-room", roomId);
            }
        });

        socket.on("player-joined", (players) => {
            console.log("Player joined, my socket id:", socket.id);
            console.log("Players in room:", players);
            updateStatus(`Players in room: ${players.length}/2`);
            if (players.length === 2) {
                document.getElementById("gameBoard").style.display = "block";
                playerColor = players[0] === socket.id ? 'white' : 'black';
                document.getElementById("playerIndicator").textContent = `You are playing as ${playerColor}`;
                game = new Chess();
                initializeBoard();
                console.log("Board initialized for", playerColor);
            }
        });

        socket.on("room-full", () => {
            updateStatus("Room is full!");
        });

        socket.on("opponent-move", ({ source, target, fen }) => {
            console.log("Received opponent move:", source, "to", target);
            game.load(fen);
            board.position(fen, false);
            removeHighlights();
        });

        // Update the status display with animation
        function updateStatus(message) {
            status.textContent = message;
            status.classList.add('status-update');
            setTimeout(() => status.classList.remove('status-update'), 300);
        }