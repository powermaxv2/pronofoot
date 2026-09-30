/** Joueurs du jeu de données de démonstration. */
export type SeedPlayer = {
  username: string;
  name: string;
  /** Club favori (nom canonique du référentiel). */
  favorite: string;
  /** Avatar de la galerie (numéro de maillot) ou null → initiales. */
  avatar: number | null;
  /** Probabilité de pronostiquer un match de ses compétitions préférées. */
  activity: number;
  /** 0 = pronostics au hasard, 1 = suit fidèlement la hiérarchie. */
  skill: number;
  /** Tendance à parier sur l'outsider ou le nul. */
  boldness: number;
  /** Probabilité de préciser un score exact. */
  exactRate: number;
  /** Probabilité d'utiliser son joker sur une journée jouée. */
  jokerRate: number;
  competitions: string[];
};

const p = (
  username: string,
  name: string,
  favorite: string,
  avatar: number | null,
  [activity, skill, boldness, exactRate, jokerRate]: [number, number, number, number, number],
  competitions: string[],
): SeedPlayer => ({
  username,
  name,
  favorite,
  avatar,
  activity,
  skill,
  boldness,
  exactRate,
  jokerRate,
  competitions,
});

export const SEED_PLAYERS: SeedPlayer[] = [
  p("lecoach", "Le Coach", "Paris Saint-Germain", 1, [0.8, 0.7, 0.2, 0.9, 0.7], ["FL1", "PL", "CL", "PD"]),
  p("lea_ol", "Léa", "Olympique Lyonnais", 5, [0.9, 0.78, 0.15, 0.95, 0.8], ["FL1", "CL", "SA"]),
  p("karim10", "Karim", "Paris Saint-Germain", 3, [0.85, 0.72, 0.25, 0.9, 0.75], ["FL1", "PL", "PD", "CL"]),
  p("juliefcn", "Julie", "FC Nantes", null, [0.75, 0.66, 0.2, 0.85, 0.6], ["FL1", "CL"]),
  p("tom_kop", "Tom", "Liverpool", 10, [0.8, 0.7, 0.3, 0.8, 0.65], ["PL", "CL"]),
  p(
    "ines_bvb",
    "Inès",
    "Borussia Dortmund",
    11,
    [0.7, 0.62, 0.35, 0.8, 0.55],
    ["BL1", "CL", "PL", "FL1", "PD", "SA"],
  ),
  p("hugo_om", "Hugo", "Olympique de Marseille", 4, [0.65, 0.55, 0.45, 0.7, 0.5], ["FL1", "CL"]),
  p("sarah_losc", "Sarah", "LOSC Lille", null, [0.6, 0.68, 0.2, 0.75, 0.5], ["FL1", "PL"]),
  p("nico_rcl", "Nicolas", "RC Lens", 2, [0.7, 0.6, 0.3, 0.9, 0.6], ["FL1", "BL1"]),
  p("camille_asm", "Camille", "AS Monaco", 9, [0.55, 0.64, 0.25, 0.6, 0.4], ["FL1", "CL", "SA"]),
  p("yanis_barca", "Yanis", "FC Barcelona", 6, [0.75, 0.66, 0.3, 0.85, 0.7], ["PD", "CL", "PL"]),
  p("manon_juve", "Manon", "Juventus", null, [0.6, 0.63, 0.2, 0.7, 0.45], ["SA", "CL"]),
  p("lucas_gunners", "Lucas", "Arsenal", 8, [0.85, 0.69, 0.25, 0.9, 0.7], ["PL", "CL", "FL1"]),
  p("chloe_ogcn", "Chloé", "OGC Nice", 12, [0.5, 0.58, 0.3, 0.65, 0.4], ["FL1"]),
  p("theo_srfc", "Théo", "Stade Rennais FC", null, [0.65, 0.6, 0.4, 0.8, 0.55], ["FL1", "PD"]),
  p("emma_real", "Emma", "Real Madrid", 7, [0.7, 0.71, 0.15, 0.85, 0.6], ["PD", "CL"]),
  p("bastien_tfc", "Bastien", "Toulouse FC", null, [0.45, 0.52, 0.5, 0.6, 0.35], ["FL1", "SA"]),
  p("jade_inter", "Jade", "Inter", 3, [0.6, 0.67, 0.2, 0.75, 0.5], ["SA", "CL", "BL1"]),
  p("romain_rcsa", "Romain", "RC Strasbourg Alsace", null, [0.55, 0.57, 0.35, 0.7, 0.5], ["FL1", "BL1"]),
  p(
    "alice_citizen",
    "Alice",
    "Manchester City",
    1,
    [0.8, 0.74, 0.2, 0.9, 0.7],
    ["PL", "CL", "PD", "SA", "BL1", "FL1"],
  ),
];

export const SEED_LEAGUES = [
  {
    name: "Les Ultras du Bureau",
    emoji: "📣",
    color: "#e8ff3a",
    description: "Le classement officiel de l'open space. Le dernier paie les croissants.",
    owner: "karim10",
    members: [
      "karim10",
      "lea_ol",
      "juliefcn",
      "tom_kop",
      "ines_bvb",
      "hugo_om",
      "sarah_losc",
      "nico_rcl",
      "lecoach",
    ],
  },
  {
    name: "Famille & Crampons",
    emoji: "🏡",
    color: "#22c55e",
    description: "Cousins, oncles et belle-famille : que le meilleur gagne.",
    owner: "juliefcn",
    members: ["juliefcn", "camille_asm", "yanis_barca", "manon_juve", "lucas_gunners", "chloe_ogcn"],
  },
  {
    name: "Coloc FC",
    emoji: "🛋️",
    color: "#38bdf8",
    description: "Pronos du canapé, débats du frigo.",
    owner: "tom_kop",
    members: [
      "tom_kop",
      "theo_srfc",
      "emma_real",
      "bastien_tfc",
      "jade_inter",
      "romain_rcsa",
      "alice_citizen",
      "lea_ol",
    ],
  },
] as const;
