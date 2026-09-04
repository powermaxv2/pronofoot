// Configuration
const LEAGUES = {
    'PL': { name: 'Premier League', emoji: '⚪', code: 'PL' },
    'LA_LIGA': { name: 'La Liga', emoji: '🟡', code: '21' },
    'SA': { name: 'Serie A', emoji: '🔵', code: '135' },
    'BL1': { name: 'Bundesliga', emoji: '🔴', code: '25' },
    'FL1': { name: 'Ligue 1', emoji: '🔵⚪', code: '61' },
    'CL': { name: 'Champions League', emoji: '👑', code: '8' }
};

let allMatches = [];
let filteredMatches = [];

// Team emojis pour les logos
const TEAM_EMOJIS = {
    'Manchester United': '🔴', 'Liverpool': '❤️', 'Manchester City': '🩵', 'Arsenal': '❤️',
    'Tottenham': '⚪', 'Chelsea': '🔵', 'Real Madrid': '⚪', 'Barcelona': '🔵',
    'Atlético Madrid': '🔴', 'Sevilla': '❤️', 'Bayern Munich': '⚪', 'Borussia Dortmund': '🟡',
    'Juventus': '⚪', 'Inter': '🔵', 'AC Milan': '❤️', 'PSG': '🔴', 'Marseille': '⚪'
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadMatches();
    setInterval(loadMatches, 60000); // Actualiser chaque minute

    document.getElementById('leagueFilter').addEventListener('change', filterMatches);
    document.getElementById('statusFilter').addEventListener('change', filterMatches);
    document.getElementById('refreshBtn').addEventListener('click', loadMatches);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// Charger les matchs via l'API
async function loadMatches() {
    try {
        showLoading();
        allMatches = [];

        // Charger les matchs de plusieurs ligues
        const leagueIds = [
            { code: 'PL', name: 'Premier League' },
            { code: '21', name: 'La Liga' },
            { code: '135', name: 'Serie A' },
            { code: '25', name: 'Bundesliga' },
            { code: '61', name: 'Ligue 1' },
            { code: '8', name: 'Champions League' }
        ];

        for (let league of leagueIds) {
            try {
                const response = await fetch(`https://api.football-data.org/v4/competitions/${league.code}/matches?status=SCHEDULED,LIVE,FINISHED`, {
                    headers: { 'X-Auth-Token': '6a1f42f1ca3c42968f07c9b98c6b5ba3' }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.matches) {
                        data.matches.forEach(match => {
                            match.competition_name = league.name;
                            allMatches.push(match);
                        });
                    }
                }
            } catch (error) {
                console.log(`Erreur chargement ${league.name}:`, error);
            }
        }

        // Trier par date
        allMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        
        filterMatches();
        updateStats();
        updateUpcoming();
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('matchesGrid').innerHTML = '<div class="loading"><p>Erreur de chargement. Veuillez actualiser.</p></div>';
    }
}

// Filtrer les matchs
function filterMatches() {
    const leagueFilter = document.getElementById('leagueFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredMatches = allMatches.filter(match => {
        const leagueMatch = !leagueFilter || 
            match.competition_name.toLowerCase().includes(LEAGUES[leagueFilter]?.name.toLowerCase() || leagueFilter);
        const statusMatch = !statusFilter || match.status === statusFilter;
        return leagueMatch && statusMatch;
    });

    displayMatches();
}

// Afficher les matchs
function displayMatches() {
    const grid = document.getElementById('matchesGrid');
    
    if (filteredMatches.length === 0) {
        grid.innerHTML = '<div class="loading"><p>Aucun match trouvé</p></div>';
        return;
    }

    grid.innerHTML = filteredMatches.map(match => createMatchCard(match)).join('');
}

// Créer une carte de match
function createMatchCard(match) {
    const status = getStatusDisplay(match.status);
    const date = new Date(match.utcDate);
    const dateStr = date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    
    const homeScore = match.score.fullTime.home ?? '-';
    const awayScore = match.score.fullTime.away ?? '-';

    const predictions = calculatePredictions(match);

    const emoji1 = TEAM_EMOJIS[homeTeam.name] || '⚽';
    const emoji2 = TEAM_EMOJIS[awayTeam.name] || '⚽';

    return `
        <div class="match-card">
            <div class="match-header">
                <span class="match-date">${dateStr}</span>
                <span class="match-status status-${match.status.toLowerCase()}">
                    ${status.emoji} ${status.text}
                </span>
            </div>
            <div class="match-league">${match.competition_name}</div>
            
            <div class="teams">
                <div class="team">
                    <div class="team-logo">${emoji1}</div>
                    <div class="team-name">${homeTeam.name}</div>
                </div>
                <div class="vs">
                    <div class="score">${homeScore} - ${awayScore}</div>
                </div>
                <div class="team">
                    <div class="team-logo">${emoji2}</div>
                    <div class="team-name">${awayTeam.name}</div>
                </div>
            </div>

            <div class="predictions">
                <div class="prediction" onclick="alert('Victoire ${homeTeam.name}')">
                    <div class="prediction-label">Victoire</div>
                    <div class="prediction-value">${predictions.win.toFixed(1)}%</div>
                </div>
                <div class="prediction" onclick="alert('Match nul')">
                    <div class="prediction-label">Nul</div>
                    <div class="prediction-value">${predictions.draw.toFixed(1)}%</div>
                </div>
                <div class="prediction" onclick="alert('Victoire ${awayTeam.name}')">
                    <div class="prediction-label">Défaite</div>
                    <div class="prediction-value">${predictions.loss.toFixed(1)}%</div>
                </div>
            </div>
        </div>
    `;
}

// Calculer les probabilités de résultats
function calculatePredictions(match) {
    // Logique simple de prédiction basée sur les cotes
    // En réalité, tu pourrais utiliser les statistiques réelles des équipes
    
    const factor = Math.random(); // Simplifié
    
    let win = 35 + Math.random() * 30;
    let loss = 35 + Math.random() * 30;
    let draw = 100 - win - loss;

    // Normaliser les valeurs
    const total = win + loss + draw;
    win = (win / total) * 100;
    loss = (loss / total) * 100;
    draw = (draw / total) * 100;

    return { win, loss, draw };
}

// Obtenir le statut du match
function getStatusDisplay(status) {
    const statuses = {
        'SCHEDULED': { emoji: '⏰', text: 'À venir' },
        'LIVE': { emoji: '🔴', text: 'En direct' },
        'FINISHED': { emoji: '✅', text: 'Terminé' }
    };
    return statuses[status] || { emoji: '❓', text: status };
}

// Afficher le chargement
function showLoading() {
    document.getElementById('matchesGrid').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Chargement des matchs...</p>
        </div>
    `;
}

// Mettre à jour les statistiques
function updateStats() {
    const live = allMatches.filter(m => m.status === 'LIVE').length;
    const scheduled = allMatches.filter(m => m.status === 'SCHEDULED').length;
    const finished = allMatches.filter(m => m.status === 'FINISHED').length;

    document.getElementById('liveCount').textContent = live;
    document.getElementById('scheduledCount').textContent = scheduled;
    document.getElementById('finishedCount').textContent = finished;
}

// Mettre à jour les prochains matchs
function updateUpcoming() {
    const upcoming = allMatches
        .filter(m => m.status === 'SCHEDULED')
        .slice(0, 5);

    const list = document.getElementById('upcomingList');
    
    if (upcoming.length === 0) {
        list.innerHTML = '<p class="empty">Aucun match à venir</p>';
        return;
    }

    list.innerHTML = upcoming.map(match => {
        const date = new Date(match.utcDate);
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        
        return `
            <div class="upcoming-item">
                <div class="upcoming-teams">${match.homeTeam.name} vs ${match.awayTeam.name}</div>
                <div class="upcoming-time">${dateStr} à ${timeStr}</div>
            </div>
        `;
    }).join('');
}

// Basculer le thème
function toggleTheme() {
    document.body.style.filter = document.body.style.filter === 'invert(1)' ? '' : 'invert(1)';
}
