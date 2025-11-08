const authFormContainer = document.getElementById('auth-form'); 
const authFormData = document.getElementById('auth-form-data');


const loginToggle = document.getElementById('login-toggle');

const registerToggle = document.getElementById('register-toggle');
const usernameAuthInput = document.getElementById('username-auth-input');
const emailAuthInput = document.getElementById('email-auth-input');

const passwordAuthInput = document.getElementById('password-auth-input');
const logoutButton = document.getElementById('logout-button');

let currentAuthMode = 'login'; 
let authToken = localStorage.getItem('chatAppToken'); 
let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername'); 

const form = document.getElementById('form'); 
const input = document.getElementById('input');



const messages = document.getElementById('messages'); 
const roomForm = 
document.getElementById('room-form'); 

const roomInput = document.getElementById('room-input');
const roomDisplay = document.getElementById('room-display');
const chatSection = document.getElementById('chat-section'); 

let socket;

function displayMessage(msg, isStatus = false,
     isMine = false) {
    const item = document.createElement('li');
    item.innerHTML = msg; 
    if (isStatus) item.classList.add
    ('status-message');
    else if (isMine) item.classList.add('my-message');
    messages.appendChild(item);
    chatSection.scrollTop = chatSection.scrollHeight; 
}

function switchToChatUI(roomName) {
    authFormContainer.classList.add('hidden');
    roomForm.classList.add('hidden'); 
    chatSection.classList.remove('hidden');
    form.style.display = 'flex';
    roomDisplay.textContent = `YOU ARE IN ROOM: ${roomName}`; 
    if (logoutButton) logoutButton.classList.remove('hidden');
}

function switchToRoomSelection(username) {
    authFormContainer.classList.add('hidden');
    roomForm.classList.remove('hidden'); 
    chatSection.classList.add('hidden');
    currentUsername = username;
    if (logoutButton) logoutButton.classList.remove('hidden');
}

function startChatSocket(token) 
{
    if (socket && socket.connected) socket.disconnect();
    socket = io({ auth: { token: token } });
    socket.on('connect', () => {
        displayMessage(`Server connection successfull choose a room`, true); 
        messages.innerHTML = ''; 
    });
    socket.on('connect_error', (err) =>
         {
        displayMessage(`connection error: ${err.message}please relogin`, true); 
        localStorage.removeItem('chatAppToken'); 
        localStorage.removeItem('currentUserId'); 
        localStorage.removeItem('currentUsername'); 
        window.location.reload(); 
    });
    socket.on('chat message', (data) => 
        {
        const isMine = data.userId === currentUserId; 
        const usernameDisplay = isMine ? 'YOU' : data.username;
        const formattedMsg = `<strong>${usernameDisplay}:</strong> ${data.message}`;
        displayMessage(formattedMsg, false, isMine); 
    });
    socket.on('status update', (statusMsg) => displayMessage(statusMsg, true));
    socket.on('message history', (data) =>
         {
        messages.innerHTML = ''; 
        const roomName = roomInput.value;
        data.forEach(msgObject => {
            const isHistoricalMine = msgObject.userId === currentUserId; 
            const usernameDisplay = isHistoricalMine ? 'you' : msgObject.username;
            const formattedMsg = `<strong>${usernameDisplay}:</strong> ${msgObject.message}`;
            displayMessage(formattedMsg, false, isHistoricalMine); 
        });
        switchToChatUI(roomName);
    });}

function updateToggleClasses(activeToggle, inactiveToggle) {
    activeToggle.classList.add('active');
    inactiveToggle.classList.remove('active');
}

loginToggle.addEventListener('click', () => {
    currentAuthMode = 'login';
    document.querySelector('#auth-form-data button').textContent = 'Login';
    document.querySelector('#auth-form-data h3').textContent = 'Login to Chat';
    usernameAuthInput.style.display = 'none';
    updateToggleClasses(loginToggle, registerToggle);
});

registerToggle.addEventListener('click', () => {
    currentAuthMode = 'register';
    document.querySelector('#auth-form-data button').textContent = 'Register';
    document.querySelector('#auth-form-data h3').textContent = 'Register New Account';
    usernameAuthInput.style.display = 'block'; 
    updateToggleClasses(registerToggle, loginToggle);
});

authFormData.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = `/api/v1/auth/${currentAuthMode}`;
    const email = emailAuthInput.value.trim();
    const password = passwordAuthInput.value.trim();
    let username = usernameAuthInput.value.trim();
    if (currentAuthMode === 'login') username = undefined;
    else if (currentAuthMode === 'register' && !username) {
        displayMessage('username is must for registration', true);
        return;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            localStorage.setItem('chatAppToken', data.token); 
            localStorage.setItem('currentUserId', data.user.id); 
            localStorage.setItem('currentUsername', data.user.username); 
            authToken = data.token;
            currentUserId = data.user.id;
            currentUsername = data.user.username;
            displayMessage(`Welcome, ${currentUsername}!`, true);
            switchToRoomSelection(currentUsername); 
            startChatSocket(authToken); 
        } else {
            displayMessage(`Authentication Error: ${data.message || 'something went wrong'}`, true);
        }
    } catch (err) {
        displayMessage('Network error:cannot reach to server', true);
    }});

document.getElementById('room-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const room = roomInput.value.trim();
    if (currentUsername && room && socket && socket.connected) socket.emit('join room', { room }); 
    else displayMessage("please connect to server and enter room name", true);
});

form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const messageText = input.value.trim();
    if (messageText && socket && socket.connected) {
        socket.emit('chat message', messageText);
        input.value = ''; 
    }});

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('chatAppToken');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUsername');
        if (socket) socket.disconnect();
        window.location.reload(); 
    });}

document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUsername && currentUserId) {
        authFormContainer.classList.add('hidden');
        chatSection.classList.add('hidden'); 
        switchToRoomSelection(currentUsername);
        startChatSocket(authToken); 
    } else {
        authFormContainer.classList.remove('hidden');
        roomForm.classList.add('hidden');
        chatSection.classList.add('hidden');
        updateToggleClasses(loginToggle, registerToggle);
    }
});
