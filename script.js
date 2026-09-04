// Configuration API
// À remplacer par ta clé API de RapidAPI (API-Football)
const API_KEY = 'YOUR_API_KEY_HERE'; // https://rapidapi.com/api-sports/api/api-football
const API_HOST = 'api-football-v1.p.rapidapi.com';

// État global
let currentLeague = '39'; // Premier League par défaut
let matches = [];

// Charger les matchs
async function loadMatches() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const matchesEl = document.getElementById('matches');
    
    loadingEl.style.display = 'block';
    errorEl.innerHTML = '';
    matchesEl.innerHTML = '';
    
    currentLeague = document.getElementById('leagueSelect').value;
    
    try {
        // Récupérer les matchs actuels
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await fetch(
            `https://${API_HOST}/fixtures?league=${currentLeague}&season=2024&status=ALL`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': API_HOST
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Erreur API - Vérifiez votre clé API');
        }
        
        const data = await response.json();
        matches = data.response || [];
        
        if (matches.length === 0) {
            errorEl.innerHTML = '⚠️ Aucun match trouvé. Assurez-vous que votre clé API est correcte.';
        } else {
            displayMatches(matches.slice(0, 12)); // Afficher les 12 premiers
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        errorEl.innerHTML = `❌ Erreur: ${error.message}<br><br>
        <strong>Configuration:</strong><br>
        1. Va sur <a href="https://rapidapi.com/api-sports/api/api-football" target="_blank" style="color: #00d4ff;">rapidapi.com</a><br>
        2. Copie ta clé API<br>
        3. Remplace 'YOUR_API_KEY_HERE' dans script.js`;
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Afficher les matchs
function displayMatches(matchesList) {
    const matchesEl = document.getElementById('matches');
    matchesEl.innerHTML = '';
    
    matchesList.forEach(match => {
        const card = createMatchCard(match);
        matchesEl.appendChild(card);
    });
}

// Créer une carte de match
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    const fixture = match.fixture;
    const teams = match.teams;
    const goals = match.goals;
    
    const status = fixture.status.short;
    let statusText = '';
    let statusClass = '';
    
    if (status === 'LIVE') {
        statusText = '🔴 EN DIRECT';
        statusClass = 'live';
    } else if (status === 'FT' || status === 'AET' || status === 'PEN') {
        statusText = '✅ TERMINÉ';
        statusClass = 'finished';
    } else {
        statusText = '⏰ À VENIR';
        statusClass = 'upcoming';
    }
    
    const date = new Date(fixture.date);
    const dateStr = date.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const homeGoals = goals.home !== null ? goals.home : '-';
    const awayGoals = goals.away !== null ? goals.away : '-';
    
    card.innerHTML = `
        <div class="match-date">${dateStr}</div>
        <div class="match-teams">
            <div class="team">
                <div class="team-name">${teams.home.name}</div>
                <img src="${teams.home.logo}" alt="${teams.home.name}" style="width: 40px; height: 40px; margin-top: 5px;">
            </div>
            <div class="vs">vs</div>
            <div class="team">
                <div class="team-name">${teams.away.name}</div>
                <img src="${teams.away.logo}" alt="${teams.away.name}" style="width: 40px; height: 40px; margin-top: 5px;">
            </div>
        </div>
        <div class="match-score">${homeGoals} - ${awayGoals}</div>
        <div class="pronostics">
            <button class="prono-btn">🏠 Victoire ${teams.home.name.split(' ')[0]}</button>
            <button class="prono-btn">🤝 Nul</button>
            <button class="prono-btn">✈️ Victoire ${teams.away.name.split(' ')[0]}</button>
        </div>
        <div class="status ${statusClass}">${statusText}</div>
    `;
    
    return card;
}

// Charger les matchs au démarrage
window.addEventListener('load', () => {
    loadMatches();
    // Actualiser toutes les 60 secondes
    setInterval(loadMatches, 60000);
});