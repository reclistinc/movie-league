// Each avatar archetype's "signature" movie (TMDb id). Its backdrop sets the scene when
// that player wins the season. Images come from TMDb like every other backdrop in the app.
export const AVATAR_FILMS: Record<string, { tmdb_id: number; title: string }> = {
  detective: { tmdb_id: 10528, title: "Sherlock Holmes" },
  wizard: { tmdb_id: 671, title: "Harry Potter and the Philosopher's Stone" },
  astronaut: { tmdb_id: 157336, title: "Interstellar" },
  robot: { tmdb_id: 10681, title: "WALL·E" },
  ghost: { tmdb_id: 620, title: "Ghostbusters" },
  alien: { tmdb_id: 601, title: "E.T. the Extra-Terrestrial" },
  cowboy: { tmdb_id: 429, title: "The Good, the Bad and the Ugly" },
  vampire: { tmdb_id: 628, title: "Interview with the Vampire" },
  ninja: { tmdb_id: 24, title: "Kill Bill: Vol. 1" },
  pirate: { tmdb_id: 22, title: "Pirates of the Caribbean: The Curse of the Black Pearl" },
  hero: { tmdb_id: 24428, title: "The Avengers" },
  scientist: { tmdb_id: 105, title: "Back to the Future" },
  explorer: { tmdb_id: 85, title: "Raiders of the Lost Ark" },
  knight: { tmdb_id: 762, title: "Monty Python and the Holy Grail" },
  monster: { tmdb_id: 808, title: "Shrek" },
  star: { tmdb_id: 313369, title: "La La Land" },
  rager: { tmdb_id: 1724, title: "The Incredible Hulk" },
  lizard: { tmdb_id: 124905, title: "Godzilla" },
  cyborg: { tmdb_id: 280, title: "Terminator 2: Judgment Day" },
  guardian: { tmdb_id: 98, title: "Gladiator" },
};
