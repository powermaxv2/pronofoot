// Configuration
// NOTE: football-data.org limite le tier gratuit à 10 requêtes/minute.
// Cette clé est publique (site 100% statique, sans backend) : à rotationner
// régulièrement sur football-data.org si elle fuit trop de quota.
const API_TOKEN = '6a1f42f1ca3c42968f07c9b98c6b5ba3';
const API_BASE = 'https://api.football-data.org/v4';

// Source unique de vérité : clé interne -> code officiel football-data.org.
// (Les codes précédents (21, 135, 25, 61, 8) venaient d'une autre API et ne
// correspondaient à aucune compétition football-data.org : seule Premier
// League se chargeait réellement.)
const LEAGUES = {
    'PL':      { name: 'Premier League',    emoji: '⚪',    code: 'PL' },
    'LA_LIGA': { name: 'La Liga',           emoji: '🟡',   code: 'PD' },
    'SA':      { name: 'Serie A',           emoji: '🔵',   code: 'SA' },
    'BL1':     { name: 'Bundesliga',        emoji: '🔴',   code: 'BL1' },
    'FL1':     { name: 'Ligue 1',           emoji: '🔵⚪', code: 'FL1' },
    'CL':      { name: 'Champions League',  emoji: '👑',   code: 'CL' }
};

const MATCH_STATUS_TTL = 120000; // 2 min (au lieu de 60s, pour rester sous 10 req/min)
const STANDINGS_TTL = 15 * 60 * 1000; // 15 min : les classements bougent peu

let allMatches = [];
let filteredMatches = [];
let standingsByLeague = {}; // clé LEAGUES -> table de classement
let standingsLoadedAt = 0;
let selectedLeague = '';
let selectedStatus = '';

const STATUS_OPTIONS = [
    { key: 'SCHEDULED', label: 'À venir' },
    { key: 'LIVE', label: 'En direct' },
    { key: 'FINISHED', label: 'Terminé' }
];

const ICON_MOON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.4A8.5 8.5 0 1 1 9.6 4a7 7 0 0 0 10.4 10.4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
const ICON_SUN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderFilterChips();
    loadMatches();
    setInterval(loadMatches, MATCH_STATUS_TTL);

    document.getElementById('leagueChips').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        selectedLeague = chip.dataset.value;
        renderFilterChips();
        filterMatches();
    });
    document.getElementById('statusChips').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        selectedStatus = chip.dataset.value;
        renderFilterChips();
        filterMatches();
    });
    document.getElementById('refreshBtn').addEventListener('click', loadMatches);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// Construit les chips de filtre à partir de LEAGUES (source unique de vérité)
function renderFilterChips() {
    const chipHTML = (value, label, active) =>
        `<button type="button" class="chip${active ? ' active' : ''}" data-value="${value}">${label}</button>`;

    const leagueOptions = [{ key: '', label: 'Toutes les ligues' },
        ...Object.entries(LEAGUES).map(([key, l]) => ({ key, label: l.name }))];
    document.getElementById('leagueChips').innerHTML = leagueOptions
        .map(opt => chipHTML(opt.key, opt.label, opt.key === selectedLeague))
        .join('');

    const statusOptions = [{ key: '', label: 'Tous les statuts' }, ...STATUS_OPTIONS];
    document.getElementById('statusChips').innerHTML = statusOptions
        .map(opt => chipHTML(opt.key, opt.label, opt.key === selectedStatus))
        .join('');
}

// Initiales d'équipe pour le badge (code officiel si fourni par l'API, sinon dérivé du nom)
function getInitials(team) {
    if (team.tla) return team.tla;
    const words = team.name.replace(/\b(FC|CF|AFC|SC|AC|CD|RC)\b/gi, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

// football-data.org v4 n'a pas de statut "LIVE" : ce sont IN_PLAY / PAUSED.
// On regroupe tout dans les 3 catégories utilisées par l'UI et on ignore les
// matchs reportés/annulés (pas pertinents pour des pronostics).
function normalizeStatus(rawStatus) {
    if (rawStatus === 'IN_PLAY' || rawStatus === 'PAUSED') return 'LIVE';
    if (rawStatus === 'FINISHED' || rawStatus === 'AWARDED') return 'FINISHED';
    if (rawStatus === 'SCHEDULED' || rawStatus === 'TIMED') return 'SCHEDULED';
    return null; // POSTPONED, SUSPENDED, CANCELLED...
}

function dateParam(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

// Charger les matchs via l'API
async function loadMatches() {
    try {
        showLoading();

        const newMatches = [];
        let anySuccess = false;
        let rateLimited = false;

        const dateFrom = dateParam(-3);
        const dateTo = dateParam(14);

        for (const [key, league] of Object.entries(LEAGUES)) {
            try {
                const response = await fetch(
                    `${API_BASE}/competitions/${league.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
                    { headers: { 'X-Auth-Token': API_TOKEN } }
                );

                if (response.status === 429) {
                    rateLimited = true;
                    continue;
                }

                if (response.ok) {
                    const data = await response.json();
                    anySuccess = true;
                    (data.matches || []).forEach(match => {
                        const normalized = normalizeStatus(match.status);
                        if (!normalized) return;
                        match.normalizedStatus = normalized;
                        match.competitionKey = key;
                        match.competitionName = league.name;
                        newMatches.push(match);
                    });
                }
            } catch (error) {
                console.error(`Erreur chargement ${league.name}:`, error);
            }
        }

        if (anySuccess) {
            allMatches = newMatches;
            allMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
            await ensureStandingsLoaded();
        }

        filterMatches();
        updateStats();
        updateUpcoming();

        // On n'affiche l'erreur en grand que si on n'a jamais rien pu charger :
        // un rafraîchissement automatique qui échoue transitoirement ne doit
        // pas effacer les matchs déjà affichés avec succès juste avant.
        if (!anySuccess && allMatches.length === 0) {
            showError(rateLimited
                ? 'Limite de requêtes API atteinte, réessayez dans une minute.'
                : 'Erreur de chargement. Veuillez actualiser.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de chargement. Veuillez actualiser.');
    }
}

// Charge (ou rafraîchit si périmé) les classements de chaque ligue, utilisés
// pour calculer des pronostics basés sur la forme réelle des équipes.
async function ensureStandingsLoaded() {
    const now = Date.now();
    if (now - standingsLoadedAt < STANDINGS_TTL && Object.keys(standingsByLeague).length > 0) {
        return;
    }

    for (const [key, league] of Object.entries(LEAGUES)) {
        try {
            const response = await fetch(`${API_BASE}/competitions/${league.code}/standings`, {
                headers: { 'X-Auth-Token': API_TOKEN }
            });
            if (response.ok) {
                const data = await response.json();
                const total = (data.standings || []).find(s => s.type === 'TOTAL');
                if (total) {
                    standingsByLeague[key] = total.table;
                }
            }
        } catch (error) {
            console.error(`Erreur classement ${league.name}:`, error);
        }
    }
    standingsLoadedAt = now;
}

// Filtrer les matchs
function filterMatches() {
    filteredMatches = allMatches.filter(match => {
        const leagueMatch = !selectedLeague || match.competitionKey === selectedLeague;
        const statusMatch = !selectedStatus || match.normalizedStatus === selectedStatus;
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
    const status = getStatusDisplay(match.normalizedStatus);
    const date = new Date(match.utcDate);
    const dateStr = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;

    const scoreText = match.normalizedStatus === 'SCHEDULED'
        ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : `${match.score.fullTime.home ?? '-'} – ${match.score.fullTime.away ?? '-'}`;

    const predictions = calculatePredictions(match);

    return `
        <article class="match-card">
            <div class="match-header">
                <span class="match-date">${dateStr}</span>
                <span class="match-status status-${match.normalizedStatus.toLowerCase()}">
                    <span class="status-dot"></span>${status.text}
                </span>
            </div>
            <div class="match-league">${match.competitionName}</div>

            <div class="teams">
                <div class="team">
                    <div class="team-badge">${getInitials(homeTeam)}</div>
                    <div class="team-name">${homeTeam.name}</div>
                </div>
                <div class="score-tile">${scoreText}</div>
                <div class="team">
                    <div class="team-badge">${getInitials(awayTeam)}</div>
                    <div class="team-name">${awayTeam.name}</div>
                </div>
            </div>

            <div>
                <div class="prediction-labels">
                    <span>Victoire ${predictions.win.toFixed(0)}%</span>
                    <span>Nul ${predictions.draw.toFixed(0)}%</span>
                    <span>Défaite ${predictions.loss.toFixed(0)}%</span>
                </div>
                <div class="prediction-bar">
                    <div class="seg-win" style="width: ${predictions.win}%"></div>
                    <div class="seg-draw" style="width: ${predictions.draw}%"></div>
                    <div class="seg-loss" style="width: ${predictions.loss}%"></div>
                </div>
            </div>
        </article>
    `;
}

// Calculer les probabilités de résultat à partir du classement réel
// (points par match joué), plutôt qu'un tirage aléatoire.
function calculatePredictions(match) {
    const FALLBACK = { win: 45, draw: 27, loss: 28 }; // légitime avantage du terrain, faute de données

    const table = standingsByLeague[match.competitionKey];
    if (!table) return FALLBACK;

    const homeEntry = table.find(t => t.team.id === match.homeTeam.id);
    const awayEntry = table.find(t => t.team.id === match.awayTeam.id);
    if (!homeEntry || !awayEntry) return FALLBACK;

    const homeStrength = homeEntry.points / Math.max(homeEntry.playedGames, 1);
    const awayStrength = awayEntry.points / Math.max(awayEntry.playedGames, 1);

    const HOME_ADVANTAGE = 0.35; // points/match bonus pour l'équipe qui reçoit
    const diff = (homeStrength + HOME_ADVANTAGE) - awayStrength;

    // Probabilité de victoire *conditionnelle à un résultat décisif* (pas nul)
    const winProb = 1 / (1 + Math.exp(-diff * 1.2));

    // Plus les deux équipes sont proches, plus le nul est probable ; plus
    // l'écart est grand, plus il devient improbable.
    const drawProb = Math.max(8, Math.min(30, 26 - Math.abs(diff) * 5));
    const decisive = 100 - drawProb;

    return {
        win: decisive * winProb,
        draw: drawProb,
        loss: decisive * (1 - winProb)
    };
}

// Obtenir le statut du match
function getStatusDisplay(status) {
    const statuses = { SCHEDULED: 'À venir', LIVE: 'En direct', FINISHED: 'Terminé' };
    return { text: statuses[status] || status };
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

// Afficher une erreur
function showError(message) {
    document.getElementById('matchesGrid').innerHTML = `
        <div class="loading"><p>${message}</p></div>
    `;
}

// Mettre à jour les statistiques
function updateStats() {
    const live = allMatches.filter(m => m.normalizedStatus === 'LIVE').length;
    const scheduled = allMatches.filter(m => m.normalizedStatus === 'SCHEDULED').length;
    const finished = allMatches.filter(m => m.normalizedStatus === 'FINISHED').length;

    document.getElementById('liveCount').textContent = live;
    document.getElementById('scheduledCount').textContent = scheduled;
    document.getElementById('finishedCount').textContent = finished;
}

// Mettre à jour les prochains matchs
function updateUpcoming() {
    const upcoming = allMatches
        .filter(m => m.normalizedStatus === 'SCHEDULED')
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

// Thème clair/sombre persistant (remplace l'ancien filter: invert(1))
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? ICON_MOON : ICON_SUN;
    }
}
