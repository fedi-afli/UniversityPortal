document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const messageArea = document.querySelector('.flex-1.p-4.overflow-y-auto');
    const userMessage = input.value;

    if (!userMessage) return;

    // Afficher le message utilisateur
    appendMessage('user', userMessage);
    input.value = '';

    try {
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, studentId: "ID_DE_L_ETUDIANT" })
        });
        const data = await response.json();
        
        // Afficher la réponse de l'assistant
        appendMessage('bot', data.reply);
    } catch (err) {
        appendMessage('bot', "Erreur de connexion au serveur.");
    }
});

function appendMessage(role, text) {
    const container = document.querySelector('.flex-1.p-4.overflow-y-auto');
    const div = document.createElement('div');
    div.className = `flex items-start gap-3 ${role === 'user' ? 'justify-end' : ''}`;
    
    div.innerHTML = `
        <div class="${role === 'user' ? 'bg-blue-600' : 'bg-blue-600/20'} p-3 rounded-lg max-w-[80%]">
            <p class="text-sm text-gray-200">${text}</p>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}