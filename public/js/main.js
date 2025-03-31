const socket = io();
const joinButton = document.getElementById('joinLobby');
const lobbyInput = document.getElementById('lobbyCode');
const copyButton = document.getElementById('copyCode');
const createButton = document.getElementById('createLobby');

function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 8}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

document.getElementById('lobbyCode').addEventListener('input', function(e) {
    const cursorPosition = this.selectionStart;
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    this.setSelectionRange(cursorPosition, cursorPosition);
});

createButton.addEventListener('click', () => {
    const lobbyCode = generateLobbyCode();
    socket.emit('create-room', lobbyCode);
});

joinButton.addEventListener('click', () => {
    if (joinButton.classList.contains('leave-room')) {
        socket.emit('leave-room', lobbyInput.value);
    } else {
        const code = lobbyInput.value.toUpperCase();
        if (code.length === 8) {
            socket.emit('join-room', code);
        } else {
            alert('Please enter a valid 8-character code');
        }
    }
});

socket.on('room-created', (roomId) => {
    lobbyInput.value = roomId;
    lobbyInput.disabled = true;
    createButton.disabled = true;
    joinButton.textContent = 'Leave Room';
    joinButton.classList.add('leave-room');
    copyButton.style.display = 'block';
});

socket.on('room-left', () => {
    lobbyInput.value = '';
    lobbyInput.disabled = false;
    createButton.disabled = false;
    joinButton.textContent = 'Join Room';
    joinButton.classList.remove('leave-room');
    copyButton.style.display = 'none';
    lobbyInput.classList.remove('error');
    sessionStorage.removeItem('gameData');
    if (window.location.search) {
        window.history.pushState({}, '', '/');
    }
});

socket.on('start-game', (data) => {
    sessionStorage.setItem('gameData', JSON.stringify(data));
    window.location.href = `/game?room=${data.roomId}`;
});

socket.on('join-success', (roomId) => {
    document.getElementById('status').textContent = 'Waiting for opponent...';
});

socket.on('room-full', () => {
    alert('This room is full!');
});

socket.on('join-error', (message) => {
    alert(message);
});

copyButton.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(lobbyInput.value);
    } catch (err) {
        lobbyInput.select();
        document.execCommand('copy');
    }
});
