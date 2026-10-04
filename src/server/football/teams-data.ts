import type { CompetitionCode } from "./competitions";

/**
 * Référentiel des clubs : noms d'affichage, abréviations, couleurs, force relative
 * (utilisée par le seed pour générer des scores réalistes) et variantes de noms
 * employées par API-Football et football-data.org (rapprochement lors des synchros).
 *
 * Les identifiants fournisseurs ne sont pas figés ici : ils sont appris
 * automatiquement à la première synchronisation.
 */
export type TeamSeed = {
  name: string;
  shortName: string;
  tla: string;
  primary: string;
  secondary: string;
  country: string;
  /** Force relative 50–95. */
  strength: number;
  /** Variantes de noms côté fournisseurs. */
  aliases: string[];
};

const t = (
  name: string,
  shortName: string,
  tla: string,
  primary: string,
  secondary: string,
  country: string,
  strength: number,
  aliases: string[] = [],
): TeamSeed => ({ name, shortName, tla, primary, secondary, country, strength, aliases });

export const LEAGUE_TEAMS: Record<Exclude<CompetitionCode, "CL">, TeamSeed[]> = {
  FL1: [
    t("Paris Saint-Germain", "Paris SG", "PSG", "#004170", "#DA291C", "France", 92, [
      "Paris Saint Germain",
      "Paris Saint-Germain FC",
      "PSG",
    ]),
    t("Olympique de Marseille", "Marseille", "OM", "#2FAEE0", "#FFFFFF", "France", 80, ["Marseille"]),
    t("AS Monaco", "Monaco", "ASM", "#E51B22", "#FFFFFF", "France", 79, ["Monaco", "AS Monaco FC"]),
    t("LOSC Lille", "Lille", "LOSC", "#E01E13", "#1B2A4E", "France", 77, ["Lille", "Lille OSC"]),
    t("Olympique Lyonnais", "Lyon", "OL", "#1C3F94", "#DA001A", "France", 76, ["Lyon"]),
    t("RC Lens", "Lens", "RCL", "#FFD100", "#E30613", "France", 75, ["Lens", "Racing Club de Lens"]),
    t("OGC Nice", "Nice", "OGCN", "#C8102E", "#111111", "France", 73, ["Nice"]),
    t("RC Strasbourg Alsace", "Strasbourg", "RCSA", "#009FE3", "#FFFFFF", "France", 72, [
      "Strasbourg",
      "RC Strasbourg",
    ]),
    t("Stade Rennais FC", "Rennes", "SRFC", "#E4002B", "#111111", "France", 72, [
      "Rennes",
      "Stade Rennais FC 1901",
      "Stade Rennais",
    ]),
    t("Stade Brestois 29", "Brest", "SB29", "#E30613", "#FFFFFF", "France", 68, ["Brest", "Stade Brestois"]),
    t("Toulouse FC", "Toulouse", "TFC", "#5B2A86", "#FFFFFF", "France", 67, ["Toulouse"]),
    t("FC Nantes", "Nantes", "FCN", "#FCD405", "#007A33", "France", 62, ["Nantes"]),
    t("Paris FC", "Paris FC", "PFC", "#002F6C", "#FFFFFF", "France", 62, []),
    t("AJ Auxerre", "Auxerre", "AJA", "#0055A4", "#FFFFFF", "France", 60, ["Auxerre"]),
    t("FC Lorient", "Lorient", "FCL", "#F58220", "#111111", "France", 59, ["Lorient"]),
    t("Angers SCO", "Angers", "SCO", "#111111", "#FFFFFF", "France", 58, ["Angers"]),
    t("Le Havre AC", "Le Havre", "HAC", "#1D428A", "#8CC9EA", "France", 58, ["Le Havre"]),
    t("FC Metz", "Metz", "FCM", "#7A1E3B", "#FFFFFF", "France", 57, ["Metz"]),
  ],
  PL: [
    t("Arsenal", "Arsenal", "ARS", "#EF0107", "#FFFFFF", "Angleterre", 90, ["Arsenal FC"]),
    t("Liverpool", "Liverpool", "LIV", "#C8102E", "#00B2A9", "Angleterre", 89, ["Liverpool FC"]),
    t("Manchester City", "Man City", "MCI", "#6CABDD", "#1C2C5B", "Angleterre", 88, [
      "Manchester City FC",
      "Man City",
    ]),
    t("Chelsea", "Chelsea", "CHE", "#034694", "#FFFFFF", "Angleterre", 85, ["Chelsea FC"]),
    t("Newcastle United", "Newcastle", "NEW", "#241F20", "#FFFFFF", "Angleterre", 81, [
      "Newcastle",
      "Newcastle United FC",
    ]),
    t("Aston Villa", "Aston Villa", "AVL", "#670E36", "#95BFE5", "Angleterre", 80, ["Aston Villa FC"]),
    t("Tottenham Hotspur", "Tottenham", "TOT", "#132257", "#FFFFFF", "Angleterre", 79, [
      "Tottenham",
      "Tottenham Hotspur FC",
      "Spurs",
    ]),
    t("Manchester United", "Man United", "MUN", "#DA291C", "#FBE122", "Angleterre", 78, [
      "Manchester United FC",
      "Man Utd",
    ]),
    t("Brighton & Hove Albion", "Brighton", "BHA", "#0057B8", "#FFFFFF", "Angleterre", 75, [
      "Brighton",
      "Brighton & Hove Albion FC",
      "Brighton and Hove Albion",
    ]),
    t("Nottingham Forest", "Nott. Forest", "NFO", "#DD0000", "#FFFFFF", "Angleterre", 74, [
      "Nottingham Forest FC",
    ]),
    t("Crystal Palace", "Crystal Palace", "CRY", "#1B458F", "#C4122E", "Angleterre", 74, [
      "Crystal Palace FC",
    ]),
    t("AFC Bournemouth", "Bournemouth", "BOU", "#DA291C", "#111111", "Angleterre", 72, ["Bournemouth"]),
    t("Brentford", "Brentford", "BRE", "#E30613", "#FFFFFF", "Angleterre", 72, ["Brentford FC"]),
    t("Fulham", "Fulham", "FUL", "#111111", "#FFFFFF", "Angleterre", 71, ["Fulham FC"]),
    t("Everton", "Everton", "EVE", "#003399", "#FFFFFF", "Angleterre", 70, ["Everton FC"]),
    t("West Ham United", "West Ham", "WHU", "#7A263A", "#1BB1E7", "Angleterre", 70, [
      "West Ham",
      "West Ham United FC",
    ]),
    t("Leeds United", "Leeds", "LEE", "#1D428A", "#FFCD00", "Angleterre", 66, ["Leeds", "Leeds United FC"]),
    t("Wolverhampton Wanderers", "Wolves", "WOL", "#FDB913", "#231F20", "Angleterre", 66, [
      "Wolves",
      "Wolverhampton Wanderers FC",
      "Wolverhampton",
    ]),
    t("Sunderland", "Sunderland", "SUN", "#EB172B", "#FFFFFF", "Angleterre", 64, ["Sunderland AFC"]),
    t("Burnley", "Burnley", "BUR", "#6C1D45", "#99D6EA", "Angleterre", 62, ["Burnley FC"]),
  ],
  PD: [
    t("Real Madrid", "Real Madrid", "RMA", "#00529F", "#FEBE10", "Espagne", 92, ["Real Madrid CF"]),
    t("FC Barcelona", "Barcelone", "FCB", "#A50044", "#004D98", "Espagne", 91, [
      "Barcelona",
      "FC Barcelona",
      "Barça",
    ]),
    t("Atlético de Madrid", "Atlético", "ATM", "#CB3524", "#272E61", "Espagne", 85, [
      "Atletico Madrid",
      "Club Atlético de Madrid",
      "Atlético Madrid",
    ]),
    t("Athletic Club", "Athletic", "ATH", "#EE2523", "#FFFFFF", "Espagne", 78, ["Athletic Bilbao"]),
    t("Villarreal CF", "Villarreal", "VIL", "#FFE667", "#005187", "Espagne", 78, ["Villarreal"]),
    t("Real Betis", "Betis", "BET", "#0BB363", "#FFFFFF", "Espagne", 74, [
      "Real Betis Balompié",
      "Real Betis Balompie",
    ]),
    t("Real Sociedad", "Real Sociedad", "RSO", "#0067B1", "#FFFFFF", "Espagne", 71, [
      "Real Sociedad de Fútbol",
    ]),
    t("RC Celta", "Celta Vigo", "CEL", "#8AC3EE", "#FFFFFF", "Espagne", 68, [
      "Celta Vigo",
      "RC Celta de Vigo",
    ]),
    t("Sevilla FC", "Séville", "SEV", "#D70F21", "#FFFFFF", "Espagne", 68, ["Sevilla"]),
    t("Valencia CF", "Valence", "VAL", "#FF7F00", "#111111", "Espagne", 66, ["Valencia"]),
    t("Girona FC", "Girona", "GIR", "#CD2534", "#FFFFFF", "Espagne", 66, ["Girona"]),
    t("CA Osasuna", "Osasuna", "OSA", "#D91A21", "#0A346F", "Espagne", 65, ["Osasuna"]),
    t("Getafe CF", "Getafe", "GET", "#005999", "#FFFFFF", "Espagne", 64, ["Getafe"]),
    t("Rayo Vallecano", "Rayo", "RAY", "#E53027", "#FFFFFF", "Espagne", 64, ["Rayo Vallecano de Madrid"]),
    t("RCD Espanyol", "Espanyol", "ESP", "#007FC8", "#FFFFFF", "Espagne", 63, [
      "Espanyol",
      "RCD Espanyol de Barcelona",
    ]),
    t("RCD Mallorca", "Majorque", "MLL", "#E20613", "#111111", "Espagne", 63, ["Mallorca"]),
    t("Deportivo Alavés", "Alavés", "ALA", "#0761AF", "#FFFFFF", "Espagne", 62, ["Alaves", "Alavés"]),
    t("Levante UD", "Levante", "LEV", "#004F9F", "#B4053F", "Espagne", 60, ["Levante"]),
    t("Elche CF", "Elche", "ELC", "#05642C", "#FFFFFF", "Espagne", 60, ["Elche"]),
    t("Real Oviedo", "Oviedo", "OVI", "#0033A0", "#FFFFFF", "Espagne", 58, ["Oviedo"]),
  ],
  SA: [
    t("Inter", "Inter", "INT", "#0068A8", "#111111", "Italie", 89, [
      "FC Internazionale Milano",
      "Internazionale",
      "Inter Milan",
    ]),
    t("SSC Napoli", "Naples", "NAP", "#12A0D7", "#FFFFFF", "Italie", 86, ["Napoli"]),
    t("Juventus", "Juventus", "JUV", "#111111", "#FFFFFF", "Italie", 84, ["Juventus FC"]),
    t("AC Milan", "Milan", "MIL", "#FB090B", "#111111", "Italie", 83, ["Milan"]),
    t("Atalanta", "Atalanta", "ATA", "#1E71B8", "#111111", "Italie", 80, ["Atalanta BC"]),
    t("AS Roma", "Roma", "ROM", "#8E1F2F", "#F0BC42", "Italie", 80, ["Roma"]),
    t("Bologna FC", "Bologne", "BOL", "#A21C26", "#1A2F48", "Italie", 75, ["Bologna", "Bologna FC 1909"]),
    t("SS Lazio", "Lazio", "LAZ", "#87D8F7", "#FFFFFF", "Italie", 75, ["Lazio"]),
    t("Como 1907", "Côme", "COM", "#0053A0", "#FFFFFF", "Italie", 72, ["Como"]),
    t("ACF Fiorentina", "Fiorentina", "FIO", "#482E92", "#FFFFFF", "Italie", 72, ["Fiorentina"]),
    t("Torino FC", "Torino", "TOR", "#881F19", "#FFFFFF", "Italie", 66, ["Torino"]),
    t("Udinese Calcio", "Udinese", "UDI", "#111111", "#FFFFFF", "Italie", 63, ["Udinese"]),
    t("Genoa CFC", "Genoa", "GEN", "#AD1919", "#002D62", "Italie", 63, ["Genoa"]),
    t("US Sassuolo", "Sassuolo", "SAS", "#00A650", "#111111", "Italie", 62, [
      "Sassuolo",
      "US Sassuolo Calcio",
    ]),
    t("Cagliari Calcio", "Cagliari", "CAG", "#A01D32", "#002350", "Italie", 60, ["Cagliari"]),
    t("Hellas Verona", "Vérone", "VER", "#002F6C", "#FFD200", "Italie", 60, ["Verona", "Hellas Verona FC"]),
    t("Parma Calcio", "Parme", "PAR", "#FFD200", "#1B4094", "Italie", 60, ["Parma", "Parma Calcio 1913"]),
    t("US Lecce", "Lecce", "LEC", "#FFD700", "#D71920", "Italie", 58, ["Lecce"]),
    t("US Cremonese", "Cremonese", "CRE", "#C8102E", "#9E9E9E", "Italie", 58, ["Cremonese"]),
    t("AC Pisa", "Pise", "PIS", "#002D72", "#111111", "Italie", 57, ["Pisa", "AC Pisa 1909", "Pisa SC"]),
  ],
  BL1: [
    t("Bayern Munich", "Bayern", "FCB", "#DC052D", "#0066B2", "Allemagne", 93, [
      "Bayern München",
      "FC Bayern München",
      "Bayern Munchen",
    ]),
    t("Borussia Dortmund", "Dortmund", "BVB", "#FDE100", "#111111", "Allemagne", 84, ["Dortmund"]),
    t("Bayer Leverkusen", "Leverkusen", "B04", "#E32221", "#111111", "Allemagne", 83, [
      "Bayer 04 Leverkusen",
    ]),
    t("RB Leipzig", "Leipzig", "RBL", "#DD0741", "#FFFFFF", "Allemagne", 82, ["Leipzig"]),
    t("Eintracht Frankfurt", "Francfort", "SGE", "#E1000F", "#111111", "Allemagne", 78, ["Frankfurt"]),
    t("VfB Stuttgart", "Stuttgart", "VFB", "#E32219", "#FFFFFF", "Allemagne", 78, ["Stuttgart"]),
    t("SC Freiburg", "Fribourg", "SCF", "#E2001A", "#111111", "Allemagne", 72, ["Freiburg"]),
    t("1. FSV Mainz 05", "Mayence", "M05", "#C3141E", "#FFFFFF", "Allemagne", 68, [
      "FSV Mainz 05",
      "Mainz 05",
      "Mainz",
    ]),
    t("SV Werder Bremen", "Brême", "SVW", "#1D9053", "#FFFFFF", "Allemagne", 68, ["Werder Bremen"]),
    t("TSG Hoffenheim", "Hoffenheim", "TSG", "#1961B5", "#FFFFFF", "Allemagne", 68, [
      "1899 Hoffenheim",
      "TSG 1899 Hoffenheim",
    ]),
    t("Borussia Mönchengladbach", "Gladbach", "BMG", "#111111", "#1A9F3E", "Allemagne", 67, [
      "Borussia Monchengladbach",
      "Borussia M.Gladbach",
      "M'gladbach",
    ]),
    t("VfL Wolfsburg", "Wolfsburg", "WOB", "#65B32E", "#FFFFFF", "Allemagne", 67, ["Wolfsburg"]),
    t("1. FC Union Berlin", "Union Berlin", "FCU", "#EB1923", "#FFD600", "Allemagne", 66, ["Union Berlin"]),
    t("Hamburger SV", "Hambourg", "HSV", "#0A3F86", "#FFFFFF", "Allemagne", 63, ["Hamburg"]),
    t("FC Augsburg", "Augsbourg", "FCA", "#BA3733", "#46714D", "Allemagne", 62, ["Augsburg"]),
    t("1. FC Köln", "Cologne", "KOE", "#ED1C24", "#FFFFFF", "Allemagne", 62, [
      "FC Köln",
      "1. FC Koln",
      "Köln",
      "FC Cologne",
    ]),
    t("FC St. Pauli", "St. Pauli", "STP", "#624839", "#FFFFFF", "Allemagne", 60, [
      "FC St. Pauli 1910",
      "St Pauli",
    ]),
    t("1. FC Heidenheim", "Heidenheim", "HDH", "#E30613", "#003E7E", "Allemagne", 60, [
      "1. FC Heidenheim 1846",
      "Heidenheim",
    ]),
  ],
};

/** Clubs européens hors des 5 grands championnats (Ligue des Champions). */
export const EUROPE_TEAMS: TeamSeed[] = [
  t("SL Benfica", "Benfica", "BEN", "#E31B23", "#FFFFFF", "Portugal", 79, [
    "Benfica",
    "Sport Lisboa e Benfica",
  ]),
  t("Sporting CP", "Sporting", "SCP", "#008057", "#FFFFFF", "Portugal", 78, [
    "Sporting Clube de Portugal",
    "Sporting Lisbon",
  ]),
  t("PSV Eindhoven", "PSV", "PSV", "#ED1C24", "#FFFFFF", "Pays-Bas", 77, ["PSV"]),
  t("Galatasaray", "Galatasaray", "GAL", "#A90432", "#FDB912", "Turquie", 76, ["Galatasaray SK"]),
  t("AFC Ajax", "Ajax", "AJA", "#D2122E", "#FFFFFF", "Pays-Bas", 74, ["Ajax"]),
  t("Club Brugge", "Bruges", "CLU", "#0065B3", "#111111", "Belgique", 74, ["Club Brugge KV"]),
  t("Olympiacos", "Olympiakos", "OLY", "#ED1C24", "#FFFFFF", "Grèce", 72, [
    "Olympiakos Piraeus",
    "PAE Olympiakos SFP",
    "Olympiacos FC",
  ]),
  t("Union Saint-Gilloise", "Union SG", "USG", "#FFD200", "#003DA5", "Belgique", 70, [
    "Union St. Gilloise",
    "Royale Union Saint-Gilloise",
  ]),
  t("SK Slavia Prague", "Slavia Prague", "SLA", "#E30613", "#FFFFFF", "Tchéquie", 70, [
    "Slavia Praha",
    "SK Slavia Praha",
  ]),
  t("FC Copenhague", "Copenhague", "FCK", "#004B93", "#FFFFFF", "Danemark", 70, [
    "FC Copenhagen",
    "FC København",
  ]),
  t("FK Bodø/Glimt", "Bodø/Glimt", "BOD", "#FFD700", "#111111", "Norvège", 70, [
    "Bodo/Glimt",
    "FK Bodo/Glimt",
  ]),
  t("Qarabağ FK", "Qarabağ", "QAR", "#111111", "#FFFFFF", "Azerbaïdjan", 64, ["Qarabag", "Qarabağ Ağdam FK"]),
  t("Pafos FC", "Pafos", "PAF", "#0055A5", "#FFFFFF", "Chypre", 62, ["Pafos"]),
  t("FC Kairat", "Kairat", "KAI", "#FFD200", "#111111", "Kazakhstan", 60, ["Kairat Almaty"]),
];

/** Participants de la phase de ligue (noms canoniques). */
export const CL_PARTICIPANTS = [
  "Paris Saint-Germain",
  "Real Madrid",
  "FC Barcelona",
  "Bayern Munich",
  "Liverpool",
  "Arsenal",
  "Manchester City",
  "Chelsea",
  "Newcastle United",
  "Tottenham Hotspur",
  "Inter",
  "SSC Napoli",
  "Juventus",
  "Atalanta",
  "Borussia Dortmund",
  "Bayer Leverkusen",
  "Eintracht Frankfurt",
  "Atlético de Madrid",
  "Athletic Club",
  "Villarreal CF",
  "Olympique de Marseille",
  "AS Monaco",
  "SL Benfica",
  "Sporting CP",
  "PSV Eindhoven",
  "AFC Ajax",
  "Club Brugge",
  "Union Saint-Gilloise",
  "Galatasaray",
  "Olympiacos",
  "SK Slavia Prague",
  "FC Copenhague",
  "FK Bodø/Glimt",
  "Qarabağ FK",
  "Pafos FC",
  "FC Kairat",
] as const;

export const ALL_TEAMS: TeamSeed[] = [...Object.values(LEAGUE_TEAMS).flat(), ...EUROPE_TEAMS];

const STOP_WORDS = new Set([
  "fc",
  "cf",
  "afc",
  "ac",
  "as",
  "sc",
  "ssc",
  "rc",
  "sv",
  "vfb",
  "vfl",
  "tsg",
  "fsv",
  "bv",
  "cd",
  "ud",
  "rcd",
  "ca",
  "sd",
  "us",
  "ogc",
  "sco",
  "fk",
  "sk",
  "kv",
  "bc",
  "cfc",
  "sfp",
  "pae",
  "calcio",
  "club",
  "de",
  "del",
  "and",
  "the",
]);

/** Nom normalisé servant de clé de rapprochement entre fournisseurs. */
export function normalizeTeamName(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((tok) => tok && !STOP_WORDS.has(tok) && !/^\d+$/.test(tok));
  return tokens.join("-") || name.toLowerCase();
}

/** Slug canonique d'un club du référentiel. */
export const teamSlug = (team: Pick<TeamSeed, "name">) => normalizeTeamName(team.name);

/** Index variante normalisée → slug canonique. */
export const TEAM_ALIAS_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const team of ALL_TEAMS) {
    const slug = teamSlug(team);
    for (const variant of [team.name, team.shortName, ...team.aliases]) {
      const key = normalizeTeamName(variant);
      if (!index.has(key)) index.set(key, slug);
    }
  }
  return index;
})();

/** Slug canonique d'un nom de club reçu d'un fournisseur. */
export function resolveTeamSlug(providerName: string): string {
  const key = normalizeTeamName(providerName);
  return TEAM_ALIAS_INDEX.get(key) ?? key;
}
