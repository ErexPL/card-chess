        const socket = io();
const joinButton = document.getElementById('joinLobby');
const lobbyInput = document.getElementById('lobbyCode');
const copyButton = document.getElementById('copyCode');
const createButton = document.getElementById('createLobby');

// Generate random 8-character code
function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 8}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// Force input to uppercase and only allow letters and numbers
document.getElementById('lobbyCode').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^A-Z0-9]/g, '').slice(0, 8);
});

createButton.addEventListener('click', () => {
    const lobbyCode = generateLobbyCode();
    socket.emit('create-room', lobbyCode);
});

joinButton.addEventListener('click', () => {
    if (joinButton.classList.contains('leave-room')) {
        // Handle leave room
        socket.emit('leave-room', lobbyInput.value);
    } else {
        // Handle join room
        const code = lobbyInput.value.toUpperCase();
        if (code.length === 8) {
            socket.emit('join-room', code);
        } else {
            alert('Please enter a valid 8-character code');
        }
    }
});

copyButton.addEventListener('click', () => {
    lobbyInput.select();
    document.execCommand('copy');
    
    copyButton.classList.add('copy-success');
    
    setTimeout(() => {
        copyButton.classList.remove('copy-success');
    }, 1500);
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
    // Reset input field
    lobbyInput.value = '';
    lobbyInput.disabled = false;
    
    // Reset create button
    createButton.disabled = false;
    
    // Reset join/leave button
    joinButton.textContent = 'Join Room';
    joinButton.classList.remove('leave-room');
    
    // Hide copy button
    copyButton.style.display = 'none';
    
    // Reset any error states or highlights
    lobbyInput.classList.remove('error');
    
    // Clear session storage
    sessionStorage.removeItem('gameData');
    
    // Reset URL if needed
    if (window.location.search) {
        window.history.pushState({}, '', '/');
    }
});

socket.on('start-game', (data) => {
    // Store the player data in sessionStorage before redirecting
    sessionStorage.setItem('gameData', JSON.stringify(data));
    window.location.href = `/game?room=${data.roomId}`;
});

socket.on('join-success', (roomId) => {
    // Only used for first player now
    document.getElementById('status').textContent = 'Waiting for opponent...';
});

socket.on('room-full', () => {
    alert('This room is full!');
});

socket.on('join-error', (message) => {
    alert(message);
});