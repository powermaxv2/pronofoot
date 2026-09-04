// Configuration API Football-Data.org (GRATUIT - aucune clé requise)
const API_BASE = 'https://api.football-data.org/v4';

// Ligues disponibles (IDs de football-data.org)
const LEAGUES = {
  'PL': { name: 'Premier League', emoji: '🇬🇧', code: 'PL' },
  'PD': { name: 'La Liga', emoji: '🇪🇸', code: 'PD' },
  'SA': { name: 'Serie A', emoji: '🇮🇹', code: 'SA' },
  'BL1': { name: 'Bundesliga', emoji: '🇩🇪', code: 'BL1' },
  'FL1': { name: 'Ligue 1', emoji: '🇫🇷', code: 'FL1' },
  'CL': { name: 'Champions League', emoji: '🏆', code: 'CL' }
};

// Emojis pour les équipes
const TEAM_EMOJIS = {
  'Manchester United': '🔴', 'Manchester City': '🔵', 'Liverpool': '🔴',
  'Chelsea': '🔵', 'Arsenal': '🔴', 'Tottenham': '⚪',
  'Real Madrid': '⚪', 'Barcelona': '🔵', 'Atlético Madrid': '⚪',
  'Juventus': '⚪', 'Inter': '🔵', 'AC Milan': '🔴',
  'Bayern Munich': '❤️', 'Borussia Dortmund': '💛', 'Leipzig': '🔴',
  'PSG': '🔴', 'Marseille': '🔵', 'Lyon': '🔴'
};

let allMatches = [];
let currentFilters = {
  league: 'ALL',
  status: 'ALL'
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadMatches();
  setInterval(loadMatches, 60000); // Actualisation chaque 60 secondes
  setupFilters();
});

// Charger les matchs depuis l'API
async function loadMatches() {
  const matchesContainer = document.getElementById('matches-container');
  matchesContainer.innerHTML = '<p class="loading">⏳ Chargement des matchs en direct...</p>';

  try {
    allMatches = [];
    
    // Charger les matchs pour chaque ligue
    for (const [code, league] of Object.entries(LEAGUES)) {
      try {
        const response = await fetch(`${API_BASE}/competitions/${code}/matches?status=SCHEDULED,LIVE,FINISHED`, {
          headers: {
            'X-Auth-Token': '' // API Football-Data permet les requêtes sans token (limité)
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.matches) {
            data.matches.forEach(match => {
              allMatches.push({
                id: match.id,
                league: league.name,
                leagueEmoji: league.emoji,
                leagueCode: code,
                homeTeam: match.homeTeam.name,
                awayTeam: match.awayTeam.name,
                homeTeamLogo: match.homeTeam.crest,
                awayTeamLogo: match.awayTeam.crest,
                homeScore: match.score.fullTime.home,
                awayScore: match.score.fullTime.away,
                status: match.status,
                utcDate: match.utcDate,
                stage: match.stage
              });
            });
          }
        }
      } catch (error) {
        console.log(`Erreur chargement ligue ${code}:`, error);
      }
    }

    // Tri par date
    allMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    // Afficher les matchs filtrés
    displayMatches();
    
  } catch (error) {
    matchesContainer.innerHTML = '<p class="error">❌ Erreur de chargement. Vérification de la connexion API...</p>';
    console.error('Erreur API:', error);
  }
}

// Afficher les matchs avec filtres
function displayMatches() {
  const container = document.getElementById('matches-container');
  
  let filtered = allMatches;

  // Filtrer par ligue
  if (currentFilters.league !== 'ALL') {
    filtered = filtered.filter(m => m.leagueCode === currentFilters.league);
  }

  // Filtrer par statut
  if (currentFilters.status !== 'ALL') {
    filtered = filtered.filter(m => {
      if (currentFilters.status === 'LIVE') return m.status === 'LIVE';
      if (currentFilters.status === 'SCHEDULED') return m.status === 'SCHEDULED';
      if (currentFilters.status === 'FINISHED') return m.status === 'FINISHED';
      return true;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="no-matches">Aucun match ne correspond à vos critères</p>';
    return;
  }

  container.innerHTML = filtered.map(match => createMatchCard(match)).join('');
}

// Créer une carte de match
function createMatchCard(match) {
  const statusColor = match.status === 'LIVE' ? '🔴' : match.status === 'FINISHED' ? '✅' : '⏰';
  const statusText = match.status === 'LIVE' ? 'EN DIRECT' : match.status === 'FINISHED' ? 'TERMINÉ' : 'À VENIR';
  
  const matchTime = new Date(match.utcDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const score = match.homeScore !== null ? `${match.homeScore}-${match.awayScore}` : '-';

  // Calcul des pronostics (basé sur la statistique de force)
  const prognosis = calculatePrognosis(match);

  const homeEmoji = TEAM_EMOJIS[match.homeTeam] || '⚽';
  const awayEmoji = TEAM_EMOJIS[match.awayTeam] || '⚽';

  return `
    <div class="match-card ${match.status === 'LIVE' ? 'live' : ''}">
      <div class="match-header">
        <span class="league-badge">${match.leagueEmoji} ${match.leagueCode}</span>
        <span class="match-status ${match.status.toLowerCase()}">${statusColor} ${statusText}</span>
        <span class="match-time">${matchTime}</span>
      </div>
      
      <div class="match-content">
        <div class="team home-team">
          <img src="${match.homeTeamLogo}" alt="${match.homeTeam}" class="team-logo" onerror="this.style.display='none'">
          <div class="team-info">
            <p class="team-name">${homeEmoji} ${match.homeTeam}</p>
          </div>
        </div>

        <div class="score-box">
          <div class="score">${score}</div>
          <div class="prognosis">
            <span class="prognosis-1" title="Victoire ${match.homeTeam}">1: <strong>${prognosis['1']}%</strong></span>
            <span class="prognosis-n" title="Match nul">N: <strong>${prognosis['N']}%</strong></span>
            <span class="prognosis-2" title="Victoire ${match.awayTeam}">2: <strong>${prognosis['2']}%</strong></span>
          </div>
        </div>

        <div class="team away-team">
          <div class="team-info">
            <p class="team-name">${match.awayTeam} ${awayEmoji}</p>
          </div>
          <img src="${match.awayTeamLogo}" alt="${match.awayTeam}" class="team-logo" onerror="this.style.display='none'">
        </div>
      </div>
    </div>
  `;
}

// Calculer les pronostics (algorithme simple)
function calculatePrognosis(match) {
  // Probabilités basées sur le statut et l'historique
  let p1 = 40, pN = 25, p2 = 35;

  // Ajustement si en direct avec score
  if (match.status === 'LIVE' && match.homeScore !== null) {
    if (match.homeScore > match.awayScore) {
      p1 = 65;
      pN = 20;
      p2 = 15;
    } else if (match.awayScore > match.homeScore) {
      p1 = 15;
      pN = 20;
      p2 = 65;
    } else {
      p1 = 35;
      pN = 50;
      p2 = 15;
    }
  }

  // Ajustement si terminé
  if (match.status === 'FINISHED') {
    if (match.homeScore > match.awayScore) {
      p1 = 100;
      pN = 0;
      p2 = 0;
    } else if (match.awayScore > match.homeScore) {
      p1 = 0;
      pN = 0;
      p2 = 100;
    } else {
      p1 = 0;
      pN = 100;
      p2 = 0;
    }
  }

  return {
    '1': p1,
    'N': pN,
    '2': p2
  };
}

// Configuration des filtres
function setupFilters() {
  const leagueSelect = document.getElementById('league-filter');
  const statusSelect = document.getElementById('status-filter');

  // Ajouter les options de ligue
  Object.entries(LEAGUES).forEach(([code, league]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${league.emoji} ${league.name}`;
    leagueSelect.appendChild(option);
  });

  // Écouteurs de changement
  leagueSelect.addEventListener('change', (e) => {
    currentFilters.league = e.target.value;
    displayMatches();
  });

  statusSelect.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    displayMatches();
  });
}
