// Configuration de l'API gratuite
const API_BASE = 'https://api.football-data.org/v4';
const API_FREE = 'https://www.thesportsdb.com/api/v1/json/3';

// Ligues supportées
const LEAGUES = {
    'PL': { name: 'Premier League', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'PD': { name: 'La Liga', country: '🇪🇸' },
    'SA': { name: 'Serie A', country: '🇮🇹' },
    'BL1': { name: 'Bundesliga', country: '🇩🇪' },
    'FL1': { name: 'Ligue 1', country: '🇫🇷' },
    'CL': { name: 'Champions League', country: '🏆' }
};

let allMatches = [];
let updateInterval;

// Éléments du DOM
const matchesContainer = document.getElementById('matchesContainer');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const leagueFilter = document.getElementById('leagueFilter');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const updateTime = document.getElementById('updateTime');

// Event listeners
refreshBtn.addEventListener('click', fetchMatches);
leagueFilter.addEventListener('change', filterMatches);
statusFilter.addEventListener('change', filterMatches);

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    fetchMatches();
    setInterval(fetchMatches, 60000); // Mise à jour toutes les 60 secondes
});

// Récupérer les matchs depuis l'API gratuite
async function fetchMatches() {
    try {
        refreshBtn.classList.add('loading');
        loading.style.display = 'flex';
        matchesContainer.innerHTML = '';

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateStr = today.toISOString().split('T')[0];
        const tomorrow_str = tomorrow.toISOString().split('T')[0];

        // Utiliser une API gratuite alternative (SofaScore alternative)
        // Pour cet exemple, on va simuler les données avec des matchs réalistes
        allMatches = await generateMockMatches();

        loading.style.display = 'none';
        refreshBtn.classList.remove('loading');
        
        filterMatches();
        updateTimeDisplay();

    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        loading.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

// Générer des matchs de démonstration réalistes
async function generateMockMatches() {
    const today = new Date();
    const matches = [];
    
    const teams = {
        'PL': [
            { home: 'Liverpool', away: 'Manchester City', league: 'PL' },
            { home: 'Arsenal', away: 'Chelsea', league: 'PL' },
            { home: 'Manchester United', away: 'Tottenham', league: 'PL' }
        ],
        'PD': [
            { home: 'Real Madrid', away: 'Barcelona', league: 'PD' },
            { home: 'Atletico Madrid', away: 'Sevilla', league: 'PD' }
        ],
        'SA': [
            { home: 'Juventus', away: 'AC Milan', league: 'SA' },
            { home: 'Inter Milan', away: 'Napoli', league: 'SA' }
        ],
        'BL1': [
            { home: 'Bayern Munich', away: 'Borussia Dortmund', league: 'BL1' },
            { home: 'RB Leipzig', away: 'Stuttgart', league: 'BL1' }
        ],
        'FL1': [
            { home: 'PSG', away: 'Olympique Marseille', league: 'FL1' },
            { home: 'Monaco', away: 'Lyon', league: 'FL1' }
        ],
        'CL': [
            { home: 'Bayern Munich', away: 'Real Madrid', league: 'CL' }
        ]
    };

    const statuses = ['SCHEDULED', 'LIVE', 'FINISHED'];
    
    for (const league in teams) {
        teams[league].forEach((match, index) => {
            const date = new Date(today);
            date.setHours(19 + index, Math.random() * 60 | 0, 0, 0);
            
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const homeScore = status === 'FINISHED' ? Math.floor(Math.random() * 4) : null;
            const awayScore = status === 'FINISHED' ? Math.floor(Math.random() * 4) : null;

            matches.push({
                id: `${league}-${index}`,
                homeTeam: { name: match.home },
                awayTeam: { name: match.away },
                score: {
                    fullTime: { home: homeScore, away: awayScore },
                    liveScore: status === 'LIVE' ? { home: Math.floor(Math.random() * 3), away: Math.floor(Math.random() * 3) } : null
                },
                status: status,
                utcDate: date.toISOString(),
                competition: { name: LEAGUES[league].name },
                league: league
            });
        });
    }

    return matches;
}

// Filtrer les matchs
function filterMatches() {
    const leagueValue = leagueFilter.value;
    const statusValue = statusFilter.value;

    let filtered = allMatches;

    if (leagueValue) {
        filtered = filtered.filter(m => m.league === leagueValue);
    }

    if (statusValue) {
        filtered = filtered.filter(m => m.status === statusValue);
    }

    matchesContainer.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        filtered.forEach(match => {
            const card = createMatchCard(match);
            matchesContainer.appendChild(card);
        });
    }
}

// Créer une carte de match
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';

    const date = new Date(match.utcDate);
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });

    const statusClass = match.status.toLowerCase();
    const statusEmoji = {
        'live': '🔴',
        'scheduled': '⏰',
        'finished': '✅'
    };

    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    
    let scoreDisplay = 'vs';
    if (match.status === 'LIVE' && match.score.liveScore) {
        scoreDisplay = `${match.score.liveScore.home} - ${match.score.liveScore.away}`;
    } else if (match.status === 'FINISHED') {
        scoreDisplay = `${homeScore} - ${awayScore}`;
    }

    // Calculer les probabilités de pronostic
    const probs = calculateProbabilities(match);

    card.innerHTML = `
        <div class="match-header">
            <span class="match-league">${match.competition.name}</span>
            <span class="match-status ${statusClass}">
                ${statusEmoji[statusClass]} ${match.status === 'LIVE' ? 'EN DIRECT' : match.status === 'SCHEDULED' ? 'À VENIR' : 'TERMINÉ'}
            </span>
            <span class="match-time">${dateStr} - ${timeStr}</span>
        </div>

        <div class="match-score">
            <div class="team away">
                <div class="team-logo">${getTeamEmoji(match.awayTeam.name)}</div>
                <div class="team-name away">${match.awayTeam.name}</div>
            </div>
            <div class="score ${match.status === 'LIVE' ? 'live' : ''}">${scoreDisplay}</div>
            <div class="team home">
                <div class="team-logo">${getTeamEmoji(match.homeTeam.name)}</div>
                <div class="team-name home">${match.homeTeam.name}</div>
            </div>
        </div>

        <div class="predictions">
            <div class="prediction">
                <div class="prediction-label">1 (${match.homeTeam.name})</div>
                <div class="prediction-value">${probs.home.toFixed(0)}%</div>
                <div class="prediction-odd">Cote: ${(1 / (probs.home / 100)).toFixed(2)}</div>
            </div>
            <div class="prediction">
                <div class="prediction-label">N (Nul)</div>
                <div class="prediction-value">${probs.draw.toFixed(0)}%</div>
                <div class="prediction-odd">Cote: ${(1 / (probs.draw / 100)).toFixed(2)}</div>
            </div>
            <div class="prediction">
                <div class="prediction-label">2 (${match.awayTeam.name})</div>
                <div class="prediction-value">${probs.away.toFixed(0)}%</div>
                <div class="prediction-odd">Cote: ${(1 / (probs.away / 100)).toFixed(2)}</div>
            </div>
        </div>
    `;

    return card;
}

// Calculer les probabilités de pronostic
function calculateProbabilities(match) {
    // Basé sur un modèle simple
    const baseHome = 0.45;
    const baseDraw = 0.25;
    const baseAway = 0.30;

    // Ajouter de la variance pour plus de réalisme
    const variance = Math.random() * 0.15 - 0.075;
    
    let home = Math.max(0.1, Math.min(0.8, baseHome + variance));
    let draw = Math.max(0.1, Math.min(0.5, baseDraw + Math.random() * 0.2 - 0.1));
    let away = baseAway + (Math.random() * 0.2 - 0.1);

    // Normaliser
    const total = home + draw + away;
    home = (home / total) * 100;
    draw = (draw / total) * 100;
    away = (away / total) * 100;

    return { home, draw, away };
}

// Obtenir un emoji pour chaque équipe
function getTeamEmoji(teamName) {
    const emojis = {
        'Liverpool': '🔴',
        'Manchester City': '🔵',
        'Arsenal': '🔴',
        'Chelsea': '🔵',
        'Manchester United': '🔴',
        'Tottenham': '⚪',
        'Real Madrid': '⚪',
        'Barcelona': '🔵',
        'Atletico Madrid': '🔴',
        'Sevilla': '❤️',
        'Juventus': '⚫',
        'AC Milan': '🔴',
        'Inter Milan': '🔵',
        'Napoli': '🔵',
        'Bayern Munich': '🔴',
        'Borussia Dortmund': '🟡',
        'RB Leipzig': '🔴',
        'Stuttgart': '🔴',
        'PSG': '🔴',
        'Olympique Marseille': '🔵',
        'Monaco': '🔴',
        'Lyon': '🔵'
    };

    return emojis[teamName] || '⚽';
}

// Mettre à jour l'heure d'actualisation
function updateTimeDisplay() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    updateTime.textContent = `Mise à jour: ${timeStr}`;
}
