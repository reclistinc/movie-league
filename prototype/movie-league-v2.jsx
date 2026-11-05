import React, { useState, useEffect, useRef, useCallback } from "react";
import { Film, Ticket, Star, Trophy, Plus, Check, Users, Clapperboard, ChevronRight, RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Sample catalog (stand-in for a live TMDb search in the next iteration)
// ---------------------------------------------------------------------------
const MOVIES = [
  { id: "m1", title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy" },
  { id: "m2", title: "Parasite", year: 2019, genre: "Thriller" },
  { id: "m3", title: "Spirited Away", year: 2001, genre: "Animation" },
  { id: "m4", title: "Mad Max: Fury Road", year: 2015, genre: "Action" },
  { id: "m5", title: "Eternal Sunshine of the Spotless Mind", year: 2004, genre: "Romance" },
  { id: "m6", title: "The Thing", year: 1982, genre: "Horror" },
  { id: "m7", title: "Arrival", year: 2016, genre: "SciFi" },
  { id: "m8", title: "Whiplash", year: 2014, genre: "Drama" },
  { id: "m9", title: "Moonlight", year: 2016, genre: "Drama" },
  { id: "m10", title: "The Grand Illusion", year: 1937, genre: "Drama" },
  { id: "m11", title: "Everything Everywhere All at Once", year: 2022, genre: "SciFi" },
  { id: "m12", title: "Amelie", year: 2001, genre: "Romance" },
  { id: "m13", title: "No Country for Old Men", year: 2007, genre: "Thriller" },
  { id: "m14", title: "The Princess Bride", year: 1987, genre: "Fantasy" },
  { id: "m15", title: "Get Out", year: 2017, genre: "Horror" },
  { id: "m16", title: "La La Land", year: 2016, genre: "Musical" },
  { id: "m17", title: "The Good, the Bad and the Ugly", year: 1966, genre: "Western" },
  { id: "m18", title: "Sisu", year: 2022, genre: "Action" },
  { id: "m19", title: "Paddington 2", year: 2017, genre: "Comedy" },
  { id: "m20", title: "Blade Runner 2049", year: 2017, genre: "SciFi" },
  { id: "m21", title: "Portrait of a Lady on Fire", year: 2019, genre: "Romance" },
  { id: "m22", title: "Hereditary", year: 2018, genre: "Horror" },
  { id: "m23", title: "Coco", year: 2017, genre: "Animation" },
  { id: "m24", title: "The Fall", year: 2006, genre: "Fantasy" },
  { id: "m25", title: "Free Solo", year: 2018, genre: "Documentary" },
  { id: "m26", title: "The Man from Earth", year: 2007, genre: "SciFi" },
  { id: "m27", title: "In the Mood for Love", year: 2000, genre: "Romance" },
  { id: "m28", title: "John Wick", year: 2014, genre: "Action" },
  { id: "m29", title: "Knives Out", year: 2019, genre: "Thriller" },
  { id: "m30", title: "Big Fish", year: 2003, genre: "Fantasy" },
  { id: "m31", title: "Waking Life", year: 2001, genre: "Animation" },
  { id: "m32", title: "The Lighthouse", year: 2019, genre: "Horror" },
  { id: "m33", title: "Chef", year: 2014, genre: "Comedy" },
  { id: "m34", title: "Dazed and Confused", year: 1993, genre: "Comedy" },
  { id: "m35", title: "Stalker", year: 1979, genre: "SciFi" },
  { id: "m36", title: "The Umbrellas of Cherbourg", year: 1964, genre: "Musical" },
  { id: "m37", title: "Kill Bill: Vol. 1", year: 2003, genre: "Action" },
  { id: "m38", title: "Fantastic Mr. Fox", year: 2009, genre: "Animation" },
  { id: "m39", title: "Michael Clayton", year: 2007, genre: "Thriller" },
  { id: "m40", title: "The Truman Show", year: 1998, genre: "Drama" },
  // Star Wars
  { id: "sw1", title: "Star Wars: Episode IV - A New Hope", year: 1977, genre: "SciFi" },
  { id: "sw2", title: "Star Wars: Episode V - The Empire Strikes Back", year: 1980, genre: "SciFi" },
  { id: "sw3", title: "Star Wars: Episode VI - Return of the Jedi", year: 1983, genre: "SciFi" },
  { id: "sw4", title: "Star Wars: Episode I - The Phantom Menace", year: 1999, genre: "SciFi" },
  { id: "sw5", title: "Star Wars: Episode II - Attack of the Clones", year: 2002, genre: "SciFi" },
  { id: "sw6", title: "Star Wars: Episode III - Revenge of the Sith", year: 2005, genre: "SciFi" },
  { id: "sw7", title: "Star Wars: The Force Awakens", year: 2015, genre: "SciFi" },
  { id: "sw8", title: "Star Wars: The Last Jedi", year: 2017, genre: "SciFi" },
  { id: "sw9", title: "Star Wars: The Rise of Skywalker", year: 2019, genre: "SciFi" },
  { id: "sw10", title: "Rogue One: A Star Wars Story", year: 2016, genre: "SciFi" },
  // Marvel / MCU
  { id: "mcu1", title: "Iron Man", year: 2008, genre: "Action" },
  { id: "mcu2", title: "The Avengers", year: 2012, genre: "Action" },
  { id: "mcu3", title: "Avengers: Infinity War", year: 2018, genre: "Action" },
  { id: "mcu4", title: "Avengers: Endgame", year: 2019, genre: "Action" },
  { id: "mcu5", title: "Black Panther", year: 2018, genre: "Action" },
  { id: "mcu6", title: "Guardians of the Galaxy", year: 2014, genre: "SciFi" },
  { id: "mcu7", title: "Spider-Man: Into the Spider-Verse", year: 2018, genre: "Animation" },
  { id: "mcu8", title: "Captain America: The Winter Soldier", year: 2014, genre: "Action" },
  { id: "mcu9", title: "Thor: Ragnarok", year: 2017, genre: "Comedy" },
  { id: "mcu10", title: "Doctor Strange", year: 2016, genre: "Fantasy" },
  // DC
  { id: "dc1", title: "The Dark Knight", year: 2008, genre: "Action" },
  { id: "dc2", title: "The Dark Knight Rises", year: 2012, genre: "Action" },
  { id: "dc3", title: "Batman Begins", year: 2005, genre: "Action" },
  { id: "dc4", title: "Joker", year: 2019, genre: "Drama" },
  { id: "dc5", title: "Wonder Woman", year: 2017, genre: "Action" },
  { id: "dc6", title: "The Batman", year: 2022, genre: "Thriller" },
  // Harry Potter
  { id: "hp1", title: "Harry Potter and the Sorcerer's Stone", year: 2001, genre: "Fantasy" },
  { id: "hp2", title: "Harry Potter and the Chamber of Secrets", year: 2002, genre: "Fantasy" },
  { id: "hp3", title: "Harry Potter and the Prisoner of Azkaban", year: 2004, genre: "Fantasy" },
  { id: "hp4", title: "Harry Potter and the Goblet of Fire", year: 2005, genre: "Fantasy" },
  { id: "hp5", title: "Harry Potter and the Deathly Hallows: Part 2", year: 2011, genre: "Fantasy" },
  // Lord of the Rings / Hobbit
  { id: "lotr1", title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, genre: "Fantasy" },
  { id: "lotr2", title: "The Lord of the Rings: The Two Towers", year: 2002, genre: "Fantasy" },
  { id: "lotr3", title: "The Lord of the Rings: The Return of the King", year: 2003, genre: "Fantasy" },
  { id: "lotr4", title: "The Hobbit: An Unexpected Journey", year: 2012, genre: "Fantasy" },
  // Pixar / Animation
  { id: "an1", title: "Toy Story", year: 1995, genre: "Animation" },
  { id: "an2", title: "Toy Story 3", year: 2010, genre: "Animation" },
  { id: "an3", title: "Finding Nemo", year: 2003, genre: "Animation" },
  { id: "an4", title: "Up", year: 2009, genre: "Animation" },
  { id: "an5", title: "Inside Out", year: 2015, genre: "Animation" },
  { id: "an6", title: "WALL-E", year: 2008, genre: "Animation" },
  { id: "an7", title: "Ratatouille", year: 2007, genre: "Animation" },
  { id: "an8", title: "Shrek", year: 2001, genre: "Comedy" },
  { id: "an9", title: "How to Train Your Dragon", year: 2010, genre: "Animation" },
  { id: "an10", title: "The Lion King", year: 1994, genre: "Animation" },
  { id: "an11", title: "Frozen", year: 2013, genre: "Musical" },
  { id: "an12", title: "The Iron Giant", year: 1999, genre: "Animation" },
  { id: "an13", title: "Princess Mononoke", year: 1997, genre: "Animation" },
  { id: "an14", title: "My Neighbor Totoro", year: 1988, genre: "Animation" },
  // Bond
  { id: "bond1", title: "Goldfinger", year: 1964, genre: "Action" },
  { id: "bond2", title: "Casino Royale", year: 2006, genre: "Action" },
  { id: "bond3", title: "Skyfall", year: 2012, genre: "Action" },
  { id: "bond4", title: "No Time to Die", year: 2021, genre: "Action" },
  // Jurassic / Indiana Jones
  { id: "jp1", title: "Jurassic Park", year: 1993, genre: "Action" },
  { id: "jp2", title: "Jurassic World", year: 2015, genre: "Action" },
  { id: "ij1", title: "Raiders of the Lost Ark", year: 1981, genre: "Action" },
  { id: "ij2", title: "Indiana Jones and the Last Crusade", year: 1989, genre: "Action" },
  // Fast & Furious
  { id: "ff1", title: "The Fast and the Furious", year: 2001, genre: "Action" },
  { id: "ff2", title: "Fast Five", year: 2011, genre: "Action" },
  { id: "ff3", title: "Furious 7", year: 2015, genre: "Action" },
  // Terminator / Alien / Matrix / Rocky
  { id: "term1", title: "The Terminator", year: 1984, genre: "SciFi" },
  { id: "term2", title: "Terminator 2: Judgment Day", year: 1991, genre: "SciFi" },
  { id: "alien1", title: "Alien", year: 1979, genre: "Horror" },
  { id: "alien2", title: "Aliens", year: 1986, genre: "Action" },
  { id: "matrix1", title: "The Matrix", year: 1999, genre: "SciFi" },
  { id: "matrix2", title: "The Matrix Reloaded", year: 2003, genre: "SciFi" },
  { id: "rocky1", title: "Rocky", year: 1976, genre: "Drama" },
  { id: "rocky2", title: "Creed", year: 2015, genre: "Drama" },
  // Classics & modern favorites
  { id: "c1", title: "The Godfather", year: 1972, genre: "Drama" },
  { id: "c2", title: "The Godfather Part II", year: 1974, genre: "Drama" },
  { id: "c3", title: "Pulp Fiction", year: 1994, genre: "Thriller" },
  { id: "c4", title: "Fight Club", year: 1999, genre: "Thriller" },
  { id: "c5", title: "Forrest Gump", year: 1994, genre: "Drama" },
  { id: "c6", title: "The Shawshank Redemption", year: 1994, genre: "Drama" },
  { id: "c7", title: "Goodfellas", year: 1990, genre: "Drama" },
  { id: "c8", title: "Se7en", year: 1995, genre: "Thriller" },
  { id: "c9", title: "The Silence of the Lambs", year: 1991, genre: "Thriller" },
  { id: "c10", title: "Jaws", year: 1975, genre: "Horror" },
  { id: "c11", title: "E.T. the Extra-Terrestrial", year: 1982, genre: "SciFi" },
  { id: "c12", title: "Back to the Future", year: 1985, genre: "SciFi" },
  { id: "c13", title: "Ghostbusters", year: 1984, genre: "Comedy" },
  { id: "c14", title: "Die Hard", year: 1988, genre: "Action" },
  { id: "c15", title: "The Shining", year: 1980, genre: "Horror" },
  { id: "c16", title: "Psycho", year: 1960, genre: "Horror" },
  { id: "c17", title: "Casablanca", year: 1942, genre: "Romance" },
  { id: "c18", title: "Singin' in the Rain", year: 1952, genre: "Musical" },
  { id: "c19", title: "2001: A Space Odyssey", year: 1968, genre: "SciFi" },
  { id: "c20", title: "Apocalypse Now", year: 1979, genre: "Drama" },
  { id: "c21", title: "Gladiator", year: 2000, genre: "Action" },
  { id: "c22", title: "Titanic", year: 1997, genre: "Romance" },
  { id: "c23", title: "Inception", year: 2010, genre: "SciFi" },
  { id: "c24", title: "Interstellar", year: 2014, genre: "SciFi" },
  { id: "c25", title: "Oppenheimer", year: 2023, genre: "Drama" },
  { id: "c26", title: "Barbie", year: 2023, genre: "Comedy" },
  { id: "c27", title: "Dune", year: 2021, genre: "SciFi" },
  { id: "c28", title: "Dune: Part Two", year: 2024, genre: "SciFi" },
  { id: "c29", title: "Napoleon", year: 2023, genre: "Drama" },
  { id: "c30", title: "Anatomy of a Fall", year: 2023, genre: "Thriller" },
  { id: "c31", title: "Poor Things", year: 2023, genre: "Fantasy" },
  { id: "c32", title: "The Substance", year: 2024, genre: "Horror" },
  { id: "c33", title: "Anora", year: 2024, genre: "Comedy" },
  { id: "c34", title: "Wicked", year: 2024, genre: "Musical" },
  { id: "c35", title: "Ratcatcher", year: 1999, genre: "Drama" },
  { id: "c36", title: "City of God", year: 2002, genre: "Drama" },
  { id: "c37", title: "Oldboy", year: 2003, genre: "Thriller" },
  { id: "c38", title: "Pan's Labyrinth", year: 2006, genre: "Fantasy" },
  { id: "c39", title: "The Prestige", year: 2006, genre: "Thriller" },
  { id: "c40", title: "There Will Be Blood", year: 2007, genre: "Drama" },
  { id: "c41", title: "Her", year: 2013, genre: "Romance" },
  { id: "c42", title: "Moonrise Kingdom", year: 2012, genre: "Comedy" },
  { id: "c43", title: "The Social Network", year: 2010, genre: "Drama" },
  { id: "c44", title: "Django Unchained", year: 2012, genre: "Western" },
  { id: "c45", title: "Once Upon a Time in Hollywood", year: 2019, genre: "Comedy" },
  { id: "c46", title: "The Wolf of Wall Street", year: 2013, genre: "Comedy" },
  { id: "c47", title: "Napoleon Dynamite", year: 2004, genre: "Comedy" },
  { id: "c48", title: "Superbad", year: 2007, genre: "Comedy" },
  { id: "c49", title: "Bridesmaids", year: 2011, genre: "Comedy" },
  { id: "c50", title: "Anchorman: The Legend of Ron Burgundy", year: 2004, genre: "Comedy" },
  { id: "c51", title: "The Hangover", year: 2009, genre: "Comedy" },
  { id: "c52", title: "Elf", year: 2003, genre: "Comedy" },
  { id: "c53", title: "Home Alone", year: 1990, genre: "Comedy" },
  { id: "c54", title: "The Nightmare Before Christmas", year: 1993, genre: "Fantasy" },
  { id: "c55", title: "Edward Scissorhands", year: 1990, genre: "Fantasy" },
  { id: "c56", title: "Beetlejuice", year: 1988, genre: "Comedy" },
  { id: "c57", title: "Groundhog Day", year: 1993, genre: "Comedy" },
  { id: "c59", title: "Requiem for a Dream", year: 2000, genre: "Drama" },
  { id: "c60", title: "American Beauty", year: 1999, genre: "Drama" },
  { id: "c61", title: "Trainspotting", year: 1996, genre: "Drama" },
  { id: "c62", title: "A Clockwork Orange", year: 1971, genre: "Thriller" },
  { id: "c63", title: "Taxi Driver", year: 1976, genre: "Drama" },
  { id: "c64", title: "Raging Bull", year: 1980, genre: "Drama" },
  { id: "c65", title: "Blade Runner", year: 1982, genre: "SciFi" },
  { id: "c66", title: "Children of Men", year: 2006, genre: "SciFi" },
  { id: "c67", title: "District 9", year: 2009, genre: "SciFi" },
  { id: "c68", title: "Ex Machina", year: 2014, genre: "SciFi" },
  { id: "c69", title: "Annihilation", year: 2018, genre: "SciFi" },
  { id: "c70", title: "The Fly", year: 1986, genre: "Horror" },
  { id: "c71", title: "Rosemary's Baby", year: 1968, genre: "Horror" },
  { id: "c72", title: "The Exorcist", year: 1973, genre: "Horror" },
  { id: "c73", title: "A Quiet Place", year: 2018, genre: "Horror" },
  { id: "c74", title: "Midsommar", year: 2019, genre: "Horror" },
  { id: "c75", title: "It Follows", year: 2014, genre: "Horror" },
  { id: "c76", title: "The Babadook", year: 2014, genre: "Horror" },
  { id: "c77", title: "Talk to Me", year: 2022, genre: "Horror" },
  { id: "c78", title: "Skinamarink", year: 2022, genre: "Horror" },
  { id: "c79", title: "Longlegs", year: 2024, genre: "Horror" },
  { id: "c80", title: "Nosferatu", year: 2024, genre: "Horror" },
  { id: "c81", title: "The Notebook", year: 2004, genre: "Romance" },
  { id: "c82", title: "Pride and Prejudice", year: 2005, genre: "Romance" },
  { id: "c83", title: "500 Days of Summer", year: 2009, genre: "Romance" },
  { id: "c84", title: "Call Me by Your Name", year: 2017, genre: "Romance" },
  { id: "c85", title: "Before Sunrise", year: 1995, genre: "Romance" },
  { id: "c86", title: "When Harry Met Sally", year: 1989, genre: "Romance" },
  { id: "c87", title: "Pretty Woman", year: 1990, genre: "Romance" },
  { id: "c88", title: "Mamma Mia!", year: 2008, genre: "Musical" },
  { id: "c89", title: "Chicago", year: 2002, genre: "Musical" },
  { id: "c90", title: "Moulin Rouge!", year: 2001, genre: "Musical" },
  { id: "c91", title: "West Side Story", year: 1961, genre: "Musical" },
  { id: "c92", title: "The Sound of Music", year: 1965, genre: "Musical" },
  { id: "c93", title: "A Star Is Born", year: 2018, genre: "Musical" },
  { id: "c94", title: "Unforgiven", year: 1992, genre: "Western" },
  { id: "c95", title: "True Grit", year: 2010, genre: "Western" },
  { id: "c96", title: "3:10 to Yuma", year: 2007, genre: "Western" },
  { id: "c98", title: "The Revenant", year: 2015, genre: "Western" },
  { id: "c99", title: "Won't You Be My Neighbor?", year: 2018, genre: "Documentary" },
  { id: "c100", title: "March of the Penguins", year: 2005, genre: "Documentary" },
  { id: "c101", title: "13th", year: 2016, genre: "Documentary" },
  { id: "c102", title: "Amy", year: 2015, genre: "Documentary" },
  { id: "c103", title: "The Act of Killing", year: 2012, genre: "Documentary" },
  { id: "c104", title: "My Octopus Teacher", year: 2020, genre: "Documentary" },
  { id: "c105", title: "20 Days in Mariupol", year: 2023, genre: "Documentary" },
  { id: "c106", title: "Spider-Man", year: 2002, genre: "Action" },
  { id: "c107", title: "Spider-Man: No Way Home", year: 2021, genre: "Action" },
  { id: "c108", title: "The Incredibles", year: 2004, genre: "Animation" },
  { id: "c109", title: "Monsters, Inc.", year: 2001, genre: "Animation" },
  { id: "c110", title: "Zootopia", year: 2016, genre: "Animation" },
  { id: "c111", title: "Klaus", year: 2019, genre: "Animation" },
  { id: "c112", title: "Flow", year: 2024, genre: "Animation" },
  { id: "c113", title: "The Boy and the Heron", year: 2023, genre: "Animation" },
  { id: "c114", title: "Akira", year: 1988, genre: "Animation" },
  { id: "c115", title: "Perfect Blue", year: 1997, genre: "Thriller" },
  { id: "c116", title: "Memento", year: 2000, genre: "Thriller" },
  { id: "c117", title: "Gone Girl", year: 2014, genre: "Thriller" },
  { id: "c118", title: "Zodiac", year: 2007, genre: "Thriller" },
  { id: "c119", title: "Prisoners", year: 2013, genre: "Thriller" },
  { id: "c120", title: "Nightcrawler", year: 2014, genre: "Thriller" },
];

const GENRE_STYLE = {
  Drama: { from: "#5b2333", to: "#211622", icon: "\u{1F3AD}" },
  Comedy: { from: "#f0b429", to: "#7a4a12", icon: "\u{1F3AA}" },
  SciFi: { from: "#0f5c66", to: "#141a3d", icon: "\u{1F6F8}" },
  Horror: { from: "#7a1f1f", to: "#120909", icon: "\u{1F52A}" },
  Action: { from: "#c0521f", to: "#2a1509", icon: "\u{1F4A5}" },
  Romance: { from: "#a83a63", to: "#3a1530", icon: "\u{1F339}" },
  Animation: { from: "#2fb3a3", to: "#3a1f6e", icon: "\u{1F3A8}" },
  Thriller: { from: "#3a4152", to: "#0b0c11", icon: "\u{1F0CF}" },
  Fantasy: { from: "#5b3fa0", to: "#1a1442", icon: "\u2728" },
  Documentary: { from: "#4a5568", to: "#1c2230", icon: "\u{1F3A5}" },
  Musical: { from: "#e0a13c", to: "#7a2e4d", icon: "\u{1F3B5}" },
  Western: { from: "#b5893a", to: "#3a2410", icon: "\u{1F335}" },
};

const AVATAR_OPTIONS = [
  { id: "detective", label: "Detective", color: "#3a2410", skin: "#d9a066" },
  { id: "wizard", label: "Wizard", color: "#1a1442", skin: "#d9a066" },
  { id: "astronaut", label: "Astronaut", color: "#0f5c66", skin: "#cfd8e3" },
  { id: "robot", label: "Robot", color: "#4a5568", skin: "#aab4c4" },
  { id: "ghost", label: "Ghost", color: "#3a4152", skin: "#eef1f6" },
  { id: "alien", label: "Alien", color: "#0f5c66", skin: "#7fd6c2" },
  { id: "cowboy", label: "Cowboy", color: "#7a4a12", skin: "#d9a066" },
  { id: "vampire", label: "Vampire", color: "#7a1f1f", skin: "#d8c6e0" },
  { id: "ninja", label: "Ninja", color: "#151821", skin: "#d9a066" },
  { id: "pirate", label: "Pirate", color: "#7a1f1f", skin: "#d9a066" },
  { id: "hero", label: "Hero", color: "#c0521f", skin: "#d9a066" },
  { id: "scientist", label: "Scientist", color: "#4a5568", skin: "#d9a066" },
  { id: "explorer", label: "Explorer", color: "#5a7a3a", skin: "#d9a066" },
  { id: "knight", label: "Knight", color: "#4a5568", skin: "#c9ccd1" },
  { id: "monster", label: "Monster", color: "#1a2e12", skin: "#6fae52" },
  { id: "star", label: "Star", color: "#111", skin: "#d9a066" },
  { id: "rager", label: "Rager", color: "#14210d", skin: "#4a8f3e" },
  { id: "lizard", label: "Lizard", color: "#3a4a12", skin: "#8fae52" },
  { id: "cyborg", label: "Cyborg", color: "#1c2230", skin: "#c9ccd1" },
  { id: "guardian", label: "Guardian", color: "#0c0f1a", skin: "#d9a066" },
];

const AVATAR_MAP = Object.fromEntries(AVATAR_OPTIONS.map((a) => [a.id, a]));

const ANGRY_BROWS = new Set(["rager", "monster", "lizard"]);
const NO_MOUTH = new Set(["robot", "knight", "cyborg", "lizard"]);

function CharacterFace({ type, skin, accent }) {
  const line = "#211a06";

  if (type === "ghost") {
    return (
      <>
        <path d="M20 90 V50 a30 30 0 0 1 60 0 V90 l-8 -8 -8 8 -8 -8 -8 8 -8 -8 -8 8 -8 -8Z" fill={skin} stroke={line} strokeWidth="2" />
        <ellipse cx="44" cy="40" rx="9" ry="6" fill="#fff" opacity="0.35" />
        <circle cx="42" cy="46" r="4.5" fill={line} />
        <circle cx="62" cy="46" r="4.5" fill={line} />
        <path d="M44 58 Q52 62 60 58" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  }

  const shoulders = <path d="M0 80 Q52 60 104 80 L104 100 L0 100 Z" fill="#242830" stroke={line} strokeWidth="1.5" />;

  let headShape;
  if (type === "robot" || type === "knight") {
    headShape = <rect x="20" y="18" width="64" height="60" rx="14" fill={skin} stroke={line} strokeWidth="2" />;
  } else if (type === "alien") {
    headShape = <ellipse cx="52" cy="48" rx="26" ry="34" fill={skin} stroke={line} strokeWidth="2" />;
  } else if (type === "lizard") {
    headShape = (
      <>
        <ellipse cx="50" cy="54" rx="32" ry="24" fill={skin} stroke={line} strokeWidth="2" />
        <ellipse cx="18" cy="58" rx="14" ry="11" fill={skin} stroke={line} strokeWidth="2" />
      </>
    );
  } else if (type === "rager") {
    headShape = <circle cx="52" cy="50" r="33" fill={skin} stroke={line} strokeWidth="2" />;
  } else {
    headShape = <circle cx="52" cy="50" r="30" fill={skin} stroke={line} strokeWidth="2" />;
  }

  const shading = (
    <>
      <ellipse cx="40" cy="36" rx="11" ry="7" fill="#fff" opacity="0.16" />
      <path d="M28 62 Q52 78 76 62 L76 72 Q52 84 28 72 Z" fill="#000" opacity="0.1" />
    </>
  );

  let eyes;
  if (type === "robot") {
    eyes = <><rect x="34" y="44" width="10" height="7" rx="2" fill={accent} /><rect x="60" y="44" width="10" height="7" rx="2" fill={accent} /></>;
  } else if (type === "alien") {
    eyes = <><ellipse cx="40" cy="48" rx="8" ry="12" fill={line} transform="rotate(-12 40 48)" /><ellipse cx="66" cy="48" rx="8" ry="12" fill={line} transform="rotate(12 66 48)" /><ellipse cx="37" cy="44" rx="2" ry="3" fill="#fff" opacity="0.6" /><ellipse cx="63" cy="44" rx="2" ry="3" fill="#fff" opacity="0.6" /></>;
  } else if (type === "knight") {
    eyes = <rect x="32" y="46" width="40" height="7" rx="2" fill={line} />;
  } else if (type === "lizard") {
    eyes = <><ellipse cx="34" cy="46" rx="3" ry="8" fill="#c8221a" transform="rotate(15 34 46)" /><ellipse cx="60" cy="40" rx="3.5" ry="9" fill="#c8221a" transform="rotate(15 60 40)" /></>;
  } else if (type === "monster") {
    eyes = <><circle cx="40" cy="46" r="6" fill={line} /><circle cx="66" cy="50" r="4" fill={line} /></>;
  } else if (type === "cyborg") {
    eyes = <circle cx="38" cy="48" r="4.5" fill={line} />;
  } else {
    eyes = <><circle cx="42" cy="50" r="4" fill={line} /><circle cx="64" cy="50" r="4" fill={line} /><circle cx="43.2" cy="48.5" r="1.1" fill="#fff" /><circle cx="65.2" cy="48.5" r="1.1" fill="#fff" /></>;
  }

  const brows = ANGRY_BROWS.has(type) ? (
    <>
      <path d="M32 40 L48 36" stroke={line} strokeWidth="3" strokeLinecap="round" />
      <path d="M56 36 L72 40" stroke={line} strokeWidth="3" strokeLinecap="round" />
    </>
  ) : type === "robot" || type === "cyborg" || type === "lizard" ? null : (
    <>
      <path d="M36 40 Q42 37 48 40" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M56 40 Q62 37 68 40" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );

  let mouth = null;
  if (!NO_MOUTH.has(type)) {
    if (type === "vampire") {
      mouth = (
        <>
          <path d="M44 62 Q52 66 60 62" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M46 63 L48 69 L50 63Z" fill="#fff" stroke={line} strokeWidth="1" />
          <path d="M54 63 L56 69 L58 63Z" fill="#fff" stroke={line} strokeWidth="1" />
        </>
      );
    } else if (type === "rager") {
      mouth = (
        <>
          <path d="M38 62 Q52 58 66 62 L64 70 Q52 74 40 70 Z" fill="#7a1f1f" stroke={line} strokeWidth="2" />
          <path d="M42 63 L44 68 M50 63 L50 69 M58 63 L56 68" stroke="#fff" strokeWidth="2" />
        </>
      );
    } else if (type === "pirate") {
      mouth = <path d="M42 62 Q52 70 62 60" stroke={line} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    } else if (type === "hero" || type === "guardian") {
      mouth = <path d="M42 62 Q52 67 62 62" stroke={line} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    } else {
      mouth = <path d="M44 64 Q52 68 60 64" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />;
    }
  }

  let extra = null;
  switch (type) {
    case "detective":
      extra = (
        <>
          <path d="M16 34 Q52 14 90 34 L86 40 Q52 24 20 40 Z" fill={accent} stroke={line} strokeWidth="2" />
          <rect x="30" y="18" width="46" height="16" rx="3" fill={accent} stroke={line} strokeWidth="2" />
          <rect x="30" y="30" width="46" height="4" fill="#8a6a3a" />
          <path d="M40 58 Q52 62 64 58 L62 61 Q52 65 42 61 Z" fill="#3a2a1a" stroke={line} strokeWidth="1" />
        </>
      );
      break;
    case "wizard":
      extra = (
        <>
          <path d="M52 4 L82 40 Q52 32 22 40 Z" fill={accent} stroke={line} strokeWidth="2" />
          <circle cx="60" cy="18" r="2" fill="#f0b429" />
          <circle cx="46" cy="26" r="1.6" fill="#f0b429" />
          <circle cx="52" cy="8" r="4" fill="#f0b429" />
          <path d="M30 68 Q52 84 74 68 L72 78 Q52 90 32 78 Z" fill="#eef1f6" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "astronaut":
      extra = (
        <>
          <circle cx="52" cy="48" r="34" fill="none" stroke={accent} strokeWidth="5" />
          <path d="M28 32 Q52 20 76 32" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" />
          <path d="M32 60 Q52 70 72 60" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" />
          <line x1="52" y1="18" x2="52" y2="6" stroke={accent} strokeWidth="3" />
          <circle cx="52" cy="4" r="4" fill={accent} />
        </>
      );
      break;
    case "robot":
      extra = (
        <>
          <line x1="52" y1="18" x2="52" y2="6" stroke={accent} strokeWidth="3" />
          <circle cx="52" cy="4" r="4" fill="#f0b429" />
          <rect x="14" y="40" width="8" height="16" rx="3" fill={skin} stroke={line} strokeWidth="2" />
          <rect x="82" y="40" width="8" height="16" rx="3" fill={skin} stroke={line} strokeWidth="2" />
          <path d="M38 62 L46 62 M50 62 L58 62 M62 62 L70 62" stroke={line} strokeWidth="2" />
          <path d="M26 26 L30 20 M78 26 L74 20" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "alien":
      extra = (
        <>
          <line x1="40" y1="16" x2="34" y2="4" stroke={accent} strokeWidth="3" />
          <circle cx="34" cy="4" r="4" fill={accent} />
          <line x1="64" y1="16" x2="70" y2="4" stroke={accent} strokeWidth="3" />
          <circle cx="70" cy="4" r="4" fill={accent} />
        </>
      );
      break;
    case "cowboy":
      extra = (
        <>
          <ellipse cx="52" cy="26" rx="42" ry="9" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M32 26 Q52 -2 72 26 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M32 26 Q52 20 72 26" fill="none" stroke="#4a2f0d" strokeWidth="2" />
          <path d="M20 78 Q52 88 84 78" fill="none" stroke="#7a4a12" strokeWidth="6" />
        </>
      );
      break;
    case "vampire":
      extra = (
        <>
          <path d="M44 22 L52 34 L60 22 Z" fill="#0c0c12" />
          <path d="M14 70 L30 46 L34 74 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M90 70 L74 46 L70 74 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M24 22 Q36 8 52 12 Q68 8 80 22 Q66 16 52 18 Q38 16 24 22 Z" fill="#0c0c12" />
        </>
      );
      break;
    case "ninja":
      extra = (
        <>
          <rect x="18" y="40" width="68" height="16" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M86 44 L98 40 L96 50 Z" fill={accent} stroke={line} strokeWidth="1.5" />
          <rect x="16" y="18" width="72" height="14" rx="4" fill={accent} stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "pirate":
      extra = (
        <>
          <path d="M18 32 Q52 14 86 32 L86 44 Q52 30 18 44 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M20 34 L14 30 M20 38 L14 40" stroke={accent} strokeWidth="2" />
          <circle cx="64" cy="50" r="9" fill="#151821" stroke={line} strokeWidth="2" />
          <line x1="73" y1="46" x2="90" y2="40" stroke="#151821" strokeWidth="2" />
          <circle cx="30" cy="56" r="2.5" fill="#f0b429" stroke={line} strokeWidth="1" />
        </>
      );
      break;
    case "hero":
      extra = (
        <>
          <path d="M20 44 Q52 34 84 44 L80 54 Q52 46 24 54 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M20 78 L28 66 L36 78 Z" fill={accent} />
          <path d="M68 78 L76 66 L84 78 Z" fill={accent} />
          <path d="M46 84 L52 76 L58 84 L52 90 Z" fill="none" stroke={accent} strokeWidth="2.5" />
        </>
      );
      break;
    case "scientist":
      extra = (
        <>
          <circle cx="42" cy="50" r="10" fill="none" stroke={accent} strokeWidth="3" />
          <circle cx="64" cy="50" r="10" fill="none" stroke={accent} strokeWidth="3" />
          <line x1="52" y1="50" x2="54" y2="50" stroke={accent} strokeWidth="3" />
          <path d="M18 26 Q30 8 52 14 Q74 8 86 26" fill="none" stroke={line} strokeWidth="3" />
          <path d="M30 80 L40 68 L64 68 L74 80" fill="#fff" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "explorer":
      extra = (
        <>
          <ellipse cx="52" cy="28" rx="40" ry="8" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 28 Q52 8 74 28 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 28 Q52 24 74 28" fill="none" stroke="#3d5228" strokeWidth="2" />
          <path d="M18 74 L34 84 L20 90 Z" fill="#7a5a2e" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "knight":
      extra = (
        <>
          <rect x="26" y="44" width="52" height="8" fill="#1c2230" />
          <path d="M20 30 Q52 16 84 30 L80 60 Q52 50 24 60 Z" fill="none" stroke={line} strokeWidth="2.5" />
          <line x1="52" y1="16" x2="52" y2="60" stroke={line} strokeWidth="2" />
          <path d="M18 76 Q52 68 86 76 L84 90 Q52 82 20 90 Z" fill={accent} stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "monster":
      extra = (
        <>
          <rect x="12" y="46" width="8" height="6" fill="#8a94a6" stroke={line} strokeWidth="1.5" />
          <rect x="84" y="46" width="8" height="6" fill="#8a94a6" stroke={line} strokeWidth="1.5" />
          <path d="M34 24 L40 30 L46 24 L52 30 L58 24 L64 30 L70 24" fill="none" stroke={line} strokeWidth="2" />
          <path d="M40 66 L44 70 L48 66 L52 70 L56 66 L60 70 L64 66" fill="none" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "star":
      extra = (
        <>
          <rect x="30" y="44" width="18" height="9" rx="4" fill="#111" />
          <rect x="56" y="44" width="18" height="9" rx="4" fill="#111" />
          <line x1="48" y1="48" x2="56" y2="48" stroke="#111" strokeWidth="2" />
          <ellipse cx="36" cy="46" rx="3" ry="1.6" fill="#fff" opacity="0.5" />
          <path d="M84 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#f0b429" />
          <path d="M20 20 Q30 6 46 12" fill="none" stroke="#3a2a10" strokeWidth="4" strokeLinecap="round" />
        </>
      );
      break;
    case "rager":
      extra = (
        <>
          <path d="M20 82 L26 74 L32 82 L38 74 L44 82" fill="none" stroke={line} strokeWidth="2" />
          <path d="M60 82 L66 74 L72 82 L78 74 L84 82" fill="none" stroke={line} strokeWidth="2" />
          <path d="M14 50 Q10 60 16 68" fill="none" stroke={line} strokeWidth="2" />
          <path d="M90 50 Q94 60 88 68" fill="none" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "lizard":
      extra = (
        <>
          <path d="M30 26 L34 16 L38 26 M46 22 L50 12 L54 22 M62 26 L66 16 L70 26" fill={skin} stroke={line} strokeWidth="1.5" />
          <path d="M4 56 L9 64 L14 56 L19 64 L24 56" fill="#fff" stroke={line} strokeWidth="1.5" />
          <path d="M20 70 Q30 76 40 72" fill="none" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "cyborg":
      extra = (
        <>
          <path d="M52 20 L84 22 Q92 50 84 78 L52 80 Z" fill="#3a4152" stroke={line} strokeWidth="2" />
          <circle cx="68" cy="50" r="6" fill="#e2472c" />
          <circle cx="68" cy="50" r="9" fill="none" stroke="#e2472c" strokeWidth="1.5" opacity="0.5" />
          <rect x="49" y="18" width="4" height="64" fill="#151821" />
          <path d="M74 34 L80 34 M74 66 L80 66" stroke="#151821" strokeWidth="2" />
          <line x1="20" y1="70" x2="14" y2="86" stroke="#8a94a6" strokeWidth="3" />
          <circle cx="13" cy="88" r="3" fill="#f0b429" />
        </>
      );
      break;
    case "guardian":
      extra = (
        <>
          <path d="M8 92 Q52 104 96 92 L96 58 Q52 46 8 58 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M40 20 Q52 8 64 20 L60 32 Q52 26 44 32 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 24 Q34 6 42 22 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M62 22 Q70 6 74 24 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M46 74 L52 68 L58 74 L52 80 Z" fill="none" stroke="#c9ccd1" strokeWidth="2" />
        </>
      );
      break;
    default:
      extra = null;
  }

  return (
    <>
      {shoulders}
      {headShape}
      {shading}
      {eyes}
      {brows}
      {mouth}
      {extra}
    </>
  );
}

function AvatarPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {AVATAR_OPTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          title={a.label}
          onClick={() => onChange(a.id)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: a.color,
            border: value === a.id ? "3px solid var(--marquee-gold)" : "3px solid transparent",
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 104 100" style={{ width: "100%", height: "100%" }}>
            <CharacterFace type={a.id} skin={a.skin} accent={a.color} />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Avatar({ avatarId, size = 28 }) {
  const a = AVATAR_MAP[avatarId] || AVATAR_OPTIONS[0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: a.color,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(107,111,138,0.4)",
      }}
    >
      <svg viewBox="0 0 104 100" style={{ width: "100%", height: "100%" }}>
        <CharacterFace type={a.id} skin={a.skin} accent={a.color} />
      </svg>
    </div>
  );

}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const THEMES = [
  { title: "Worst Vacation Ever", summary: "A trip that goes hilariously, catastrophically wrong." },
  { title: "A Meal You'd Regret Ordering", summary: "Something edible plays a bigger role than it should." },
  { title: "The Villain Had a Point", summary: "The bad guy's plan makes uncomfortable amounts of sense." },
  { title: "One-Star Yelp Review Energy", summary: "A place, person, or event that deserved harsh feedback." },
  { title: "Everyone's in Way Over Their Head", summary: "Nobody involved is remotely qualified for the situation." },
  { title: "This Would Never Fly at HR", summary: "Workplace behavior that should've triggered an investigation." },
  { title: "A Group Chat Waiting to Implode", summary: "An ensemble one bad text away from disaster." },
  { title: "Weather Ruins Everything", summary: "Mother Nature is basically a supporting cast member." },
  { title: "Should Have Read the Fine Print", summary: "A deal, contract, or wish goes badly sideways." },
  { title: "A Pet That's Smarter Than the Owner", summary: "An animal quietly running the show." },
  { title: "Peak Sibling Rivalry", summary: "Family competition escalates way past reasonable." },
  { title: "The Reunion Nobody Wanted", summary: "Old faces come back at the worst possible time." },
  { title: "A Plan That Was Doomed From Minute One", summary: "You can see the disaster coming from the opening scene." },
  { title: "Small Town, Big Secret", summary: "A quiet place hiding something it really shouldn't." },
  { title: "This Job Interview Went Poorly", summary: "Someone's professional life takes a hard left turn." },
  { title: "A Road Trip That Should've Stayed a Plan", summary: "The journey is the whole problem." },
  { title: "Everybody's Lying to Everybody", summary: "A web of deception nobody can keep straight." },
  { title: "A Party That Got Wildly Out of Hand", summary: "One night, way too many consequences." },
  { title: "The Neighbor Is Definitely Up to Something", summary: "Suburbia hides more than lawn care disputes." },
  { title: "Somebody Should Not Have Adopted That", summary: "A creature that was a terrible idea to bring home." },
  { title: "A Wedding Held Together by Duct Tape", summary: "Nothing about this ceremony is going smoothly." },
  { title: "The Group Project From Hell", summary: "Collaboration that should've stayed solo." },
  { title: "A Disguise That Fools No One", summary: "A cover story so bad it's almost impressive." },
  { title: "This Escape Room Got Real", summary: "Getting out is suddenly not optional." },
  { title: "A Diet That Went Too Far", summary: "Someone took 'clean eating' way past reasonable." },
  { title: "The Babysitter Bit Off More Than They Could Chew", summary: "One evening of childcare spirals completely out of control." },
  { title: "A Rivalry Over Something Genuinely Petty", summary: "Two people at war over almost nothing." },
  { title: "Retirement Didn't Go as Planned", summary: "Someone's quiet golden years get interrupted." },
  { title: "A Get-Rich-Quick Scheme That Wasn't", summary: "The money plan collapses spectacularly." },
  { title: "The Worst Possible Time for This to Happen", summary: "Terrible timing makes an already bad day worse." },
  { title: "A Costume That Ruined the Night", summary: "Wardrobe choices with real consequences." },
  { title: "Everyone Underestimated the New Kid", summary: "The newcomer turns out to be a serious problem." },
  { title: "A House That's Definitely Not Just Creaky", summary: "Something's off about this address." },
  { title: "The Company Retreat Nobody Survived Emotionally", summary: "Team building goes horribly, memorably wrong." },
  { title: "A Rumor That Snowballed Into Chaos", summary: "One whisper becomes a full-blown disaster." },
  { title: "Grandma Knows More Than She's Letting On", summary: "The sweet old relative has secrets." },
  { title: "A Heist That Was Obviously a Bad Idea", summary: "The plan has more holes than a heist should." },
  { title: "This Was Supposed to Be a Simple Errand", summary: "A quick task spirals into an odyssey." },
  { title: "The Best Man Speech Went Off the Rails", summary: "A toast that should never have happened live." },
  { title: "A Roommate Situation Gone Very Wrong", summary: "Shared living turns into shared trauma." },
  { title: "The Class Reunion Reveals Too Much", summary: "Old classmates, way too much unfinished business." },
  { title: "A Con Artist Meets Their Match", summary: "The scammer picked the wrong target this time." },
  { title: "Somebody Peaked in High School", summary: "Glory days that clearly never ended for them." },
  { title: "A Family Business That's a Front for Something", summary: "The shop downstairs isn't what it seems." },
  { title: "The Fire Drill That Wasn't a Drill", summary: "A routine precaution turns urgent fast." },
  { title: "A Bet That Escalated Way Too Far", summary: "A dare nobody should have taken this seriously." },
  { title: "The Intern Runs the Whole Place Now", summary: "Someone junior ends up holding it all together." },
  { title: "A Long-Lost Relative Shows Up Uninvited", summary: "Family history walks through the front door." },
  { title: "This Book Club Turned Into Something Else", summary: "A cozy gathering with an unexpected agenda." },
  { title: "The GPS Led Everyone Astray", summary: "Navigation failure becomes the whole plot." },
  { title: "A Talent Show With Way Too Much at Stake", summary: "The stakes of a school stage are oddly high." },
  { title: "Somebody's Secret Identity Slips", summary: "A double life starts to crack." },
  { title: "The Neighborhood Watch Took It Too Far", summary: "Community vigilance spirals into obsession." },
  { title: "A Cursed Object Nobody Should Have Bought", summary: "That flea-market find was a mistake." },
  { title: "The Office Holiday Party, Unfiltered", summary: "Workplace boundaries dissolve for one night." },
  { title: "A Prank That Went Way Too Far", summary: "A joke with real, lasting fallout." },
  { title: "Somebody's Ex Shows Up at the Worst Time", summary: "History reappears at exactly the wrong moment." },
  { title: "A Small Lie That Grew Legs", summary: "One fib spirals into an unmanageable mess." },
  { title: "The New Diet Guru Is Hiding Something", summary: "Wellness culture takes a sinister turn." },
  { title: "A Storm Traps Everyone Together", summary: "The weather forces an unlikely group to bond or clash." },
  { title: "This Field Trip Was Not on the Itinerary", summary: "A school outing goes seriously off script." },
  { title: "A Family Recipe With a Dark History", summary: "That secret ingredient has a backstory." },
  { title: "Somebody Faked Their Own Disappearance", summary: "Vanishing on purpose comes back to bite them." },
  { title: "The Support Group Gets Complicated", summary: "Healing turns messy fast." },
  { title: "A Sports Team of Total Misfits", summary: "Nobody on this roster should logically win." },
  { title: "The Landlord Is Genuinely Terrifying", summary: "Renting this place was a mistake." },
  { title: "A Karaoke Night That Changed Everything", summary: "Singing badly has unexpectedly high stakes." },
  { title: "Somebody's Side Hustle Got Out of Control", summary: "A little extra income becomes a full crisis." },
  { title: "The Babysitting Job Was Actually a Trap", summary: "This gig was too good to be true." },
  { title: "A Small Business Feud Turns Ugly", summary: "Two shops at war over the same block." },
  { title: "The Group Chat Screenshots Someone", summary: "Digital drama has real-world consequences." },
  { title: "A Cruise That Should Have Stayed Docked", summary: "Vacation at sea, disaster included." },
  { title: "Somebody's Fake ID Backfires Spectacularly", summary: "A little deception with big fallout." },
  { title: "The Summer Camp Counselor Has No Idea What They're Doing", summary: "Supervision is more theoretical than actual." },
  { title: "A Family Game Night Gets Way Too Competitive", summary: "Board games bring out everyone's worst instincts." },
  { title: "Somebody Inherited a House With Baggage", summary: "The will came with strings attached." },
  { title: "The Substitute Teacher Isn't Who They Say They Are", summary: "Classroom authority hides something odd." },
  { title: "A Road Sign Nobody Should Have Ignored", summary: "The warning was right there the whole time." },
  { title: "Somebody's Wellness Retreat Gets Weird", summary: "Finding yourself takes an unexpected turn." },
  { title: "The Family Dog Knows Something", summary: "The pet is onto the plot before anyone else." },
  { title: "A Blind Date That Should Have Been Cancelled", summary: "Two strangers, zero chemistry, plenty of chaos." },
  { title: "The Company Picnic Turns Into a Turf War", summary: "Departments clash over sack races and grudges." },
  { title: "Somebody's Garage Sale Sold the Wrong Thing", summary: "A stray item causes a whole ordeal." },
  { title: "The Tour Guide Doesn't Actually Know the Way", summary: "Confidence outpaces competence badly." },
  { title: "A Family Portrait Session Falls Apart", summary: "Smiling for the camera was never going to be easy." },
  { title: "Somebody's Side of the Story Doesn't Add Up", summary: "The narrator can't quite be trusted." },
  { title: "The Book Report That Ruined Someone's Week", summary: "A school assignment with unreasonable stakes." },
  { title: "A Wellness App That's Definitely Watching You", summary: "Self-improvement with a sinister subscription model." },
  { title: "The Family Reunion Softball Game Gets Intense", summary: "A casual game becomes a blood feud." },
  { title: "Somebody's Emotional Support Animal Causes a Scene", summary: "A creature that should've stayed home." },
  { title: "The Open Mic Night No One Will Forget", summary: "A stage debut that becomes local legend." },
  { title: "A Rideshare Driver With a Lot to Say", summary: "The commute becomes the whole story." },
  { title: "Somebody's New Year's Resolution Spirals", summary: "Self-improvement pursued way too intensely." },
  { title: "The Cul-de-Sac Has a Pecking Order", summary: "Suburban status games with real stakes." },
  { title: "A Wedding Toast That Says the Quiet Part Loud", summary: "Someone finally airs the family grievances." },
  { title: "The Vending Machine at Work Holds Secrets", summary: "An unassuming object becomes central to the plot." },
  { title: "Somebody's Improv Class Gets Too Real", summary: "Acting exercises reveal genuine feelings." },
  { title: "The Garden Gnome Situation Escalates", summary: "A lawn ornament rivalry spirals wildly." },
  { title: "A Group Vacation Rental Splits the Friend Group", summary: "Shared lodging exposes every fault line." },
  { title: "Somebody's Fantasy League Ruins Real Friendships", summary: "A game gets taken far too seriously." },
];

const sampleThemes = (n) => {
  const pool = [...THEMES];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
};

const emptyState = {
  members: [],
  rounds: [],
  queue: [],
  setupComplete: false,
  settings: { leagueName: "", voteBudget: 20 },
};
const DEFAULT_VOTE_BUDGET = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const SUBMIT_WINDOW_MS = 5 * DAY_MS;
const VOTE_WINDOW_MS = 5 * DAY_MS;

const formatCountdown = (deadline, now) => {
  if (!deadline) return null;
  const diff = deadline - now;
  if (diff <= 0) return "Deadline passed";
  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
};

const hashStr = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const wrapTitle = (title, maxChars = 11, maxLines = 3) => {
  const words = (title || "").split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    trimmed[maxLines - 1] = trimmed[maxLines - 1].slice(0, maxChars - 1) + "\u2026";
    return trimmed;
  }
  return lines;
};

function Poster({ genre, title, year, size = "normal" }) {
  const style = GENRE_STYLE[genre] || GENRE_STYLE.Drama;
  const seed = hashStr((title || genre || "movie") + (year || ""));
  const angle = 20 + (seed % 140);
  const spotX = 20 + (seed % 60);
  const spotY = 15 + ((seed >> 3) % 40);
  const shapeType = seed % 3;
  const uid2 = seed.toString(36);
  const lines = size === "small" ? [] : wrapTitle(title, 13, 3);

  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block", borderRadius: 6, overflow: "hidden" }}
    >
      <defs>
        <linearGradient id={`grad-${uid2}`} x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform={`rotate(${angle} 50 70)`}>
          <stop offset="0%" stopColor={style.from} />
          <stop offset="100%" stopColor={style.to} />
        </linearGradient>
        <radialGradient id={`spot-${uid2}`} cx={`${spotX}%`} cy={`${spotY}%`} r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`vig-${uid2}`} cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="100" height="140" fill={`url(#grad-${uid2})`} />
      <rect width="100" height="140" fill={`url(#spot-${uid2})`} />
      {shapeType === 0 && (
        <g opacity="0.25" stroke="#ffffff" fill="none" strokeWidth="1">
          <circle cx={spotX} cy={spotY} r="14" />
          <circle cx={spotX} cy={spotY} r="24" />
          <circle cx={spotX} cy={spotY} r="34" />
        </g>
      )}
      {shapeType === 1 && (
        <g opacity="0.16" stroke="#ffffff" strokeWidth="1.4">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={-10 + i * 30} y1="0" x2={-30 + i * 30} y2="140" />
          ))}
        </g>
      )}
      {shapeType === 2 && (
        <g opacity="0.2" fill="#ffffff">
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx={8 + (i % 4) * 28} cy={10 + Math.floor(i / 4) * 22} r="1.6" />
          ))}
        </g>
      )}
      {size !== "small" && (
        <text x="50" y="76" textAnchor="middle" fontSize="72" opacity="0.14" style={{ pointerEvents: "none" }}>{style.icon}</text>
      )}
      <rect width="100" height="140" fill={`url(#vig-${uid2})`} />
      <g fill="rgba(0,0,0,0.22)">
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x="0" y={6 + i * 19} width="6" height="10" rx="2" />
        ))}
      </g>
      <rect x="1.5" y="1.5" width="97" height="137" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <text x="94" y="14" textAnchor="end" fontSize={size === "small" ? 13 : 16}>{style.icon}</text>
      {size !== "small" && year && (
        <text x="6" y="14" fontFamily="'Space Mono', monospace" fontSize="7" fill="rgba(255,255,255,0.75)">{year}</text>
      )}
      {size !== "small" && lines.length > 0 && (
        <>
          <rect x="0" y={132 - lines.length * 13} width="100" height={140 - (132 - lines.length * 13)} fill="rgba(10,8,4,0.55)" />
          <line x1="10" y1={132 - lines.length * 13} x2="90" y2={132 - lines.length * 13} stroke={style.from} strokeWidth="1.2" opacity="0.9" />
          <text x="50" y={136 - (lines.length - 1) * 11} textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="10.5" fill="#fff" style={{ letterSpacing: "0.02em" }}>
            {lines.map((l, i) => (
              <tspan key={i} x="50" dy={i === 0 ? 0 : 12}>{l.toUpperCase()}</tspan>
            ))}
          </text>
        </>
      )}
    </svg>
  );
}

function Stars({ value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", padding: 2, cursor: disabled ? "default" : "pointer" }}
        >
          <Star
            size={20}
            fill={n <= value ? "var(--marquee-gold)" : "none"}
            color={n <= value ? "var(--marquee-gold)" : "var(--reel-grey)"}
          />
        </button>
      ))}
    </div>
  );
}

export default function MovieLeague() {
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newPlayerInput, setNewPlayerInput] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [state, setState] = useState(emptyState);
  const [themeInput, setThemeInput] = useState("");
  const [themeSummary, setThemeSummary] = useState("");
  const [showThemeBrowser, setShowThemeBrowser] = useState(false);
  const [browserSample, setBrowserSample] = useState(() => sampleThemes(8));
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null);
  const [blurb, setBlurb] = useState("");
  const [draftVotes, setDraftVotes] = useState({});
  const [draftComments, setDraftComments] = useState({});
  const [voteShuffleOrder, setVoteShuffleOrder] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());
  const [gateDismissed, setGateDismissed] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(false);
  const [viewingRoundId, setViewingRoundId] = useState(null);
  const [setupLeagueName, setSetupLeagueName] = useState("");
  const [setupVoteBudget, setSetupVoteBudget] = useState(DEFAULT_VOTE_BUDGET);
  const [inviteAck, setInviteAck] = useState(false);
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const [page, setPage] = useState("home");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [joinAvatar, setJoinAvatar] = useState(AVATAR_OPTIONS[0].id);
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(AVATAR_OPTIONS[0].id);

  const finishSetup = () => {
    if (state.queue.length === 0) return;
    setState((s) => ({
      ...s,
      setupComplete: true,
      settings: { leagueName: setupLeagueName.trim(), voteBudget: setupVoteBudget },
    }));
  };

  const startOverSetup = () => {
    setState(emptyState);
    setSetupLeagueName("");
    setSetupVoteBudget(DEFAULT_VOTE_BUDGET);
    setThemeInput("");
    setThemeSummary("");
    setInviteAck(false);
  };

  const joinLeague = () => {
    const name = nameInput.trim();
    if (!name) return;
    const meObj = { name, avatar: joinAvatar };
    setMe(meObj);
    setState((s) => {
      if (s.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return s;
      return { ...s, members: [...s.members, { name, avatar: joinAvatar }] };
    });
    setNameInput("");
  };

  const switchPlayer = (name) => {
    const existing = state.members.find((m) => m.name === name);
    setMe({ name, avatar: existing?.avatar || AVATAR_OPTIONS[0].id });
    setPicked(null);
    setBlurb("");
    setSearch("");
    setDraftVotes({});
    setDraftComments({});
  };

  const addPlayer = () => {
    const name = newPlayerInput.trim();
    if (!name) return;
    setState((s) => {
      if (s.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return s;
      return { ...s, members: [...s.members, { name, avatar: newPlayerAvatar }] };
    });
    switchPlayer(name);
    setNewPlayerInput("");
    setNewPlayerAvatar(AVATAR_OPTIONS[0].id);
    setAddingPlayer(false);
  };

  const voteBudget = state.settings?.voteBudget || DEFAULT_VOTE_BUDGET;
  const activeRound = state.rounds[state.rounds.length - 1] || null;
  const roundOpen = activeRound && activeRound.phase !== "results";

  useEffect(() => {
    if (!me || !activeRound) return;
    const needsSubmit = activeRound.phase === "submitting" && !activeRound.submissions.some((s) => s.by === me.name);
    const othersSubs = activeRound.submissions.filter((s) => s.by !== me.name);
    const needsVote = activeRound.phase === "voting" && othersSubs.length > 0 && !othersSubs.every((s) => s.votes?.[me.name] != null);
    if (needsSubmit || needsVote) setPage("round");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    setGateDismissed(false);
    setEditingSubmission(false);
    setPicked(null);
    setBlurb("");
    setSearch("");
  }, [me, activeRound?.id, activeRound?.phase]);

  useEffect(() => {
    if (activeRound && activeRound.phase === "voting") {
      const ids = activeRound.submissions.map((s) => s.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setVoteShuffleOrder(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound?.id, activeRound?.phase, me?.name]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeRound || activeRound.phase !== "submitting") return;
    const deadlinePassed = activeRound.submissionsDueAt && nowTick > activeRound.submissionsDueAt;
    if (deadlinePassed && activeRound.submissions.length >= 2) {
      setState((s) => ({
        ...s,
        rounds: s.rounds.map((r) => (r.id === activeRound.id ? { ...r, phase: "voting", votingDueAt: Date.now() + VOTE_WINDOW_MS } : r)),
      }));
    }
  }, [activeRound, nowTick]);

  useEffect(() => {
    if (!activeRound || activeRound.phase !== "voting" || state.members.length === 0) return;
    const allLocked = state.members.every((m) => {
      const theirTargets = activeRound.submissions.filter((s) => s.by !== m.name);
      return theirTargets.length === 0 || theirTargets.every((s) => s.votes?.[m.name] != null);
    });
    const deadlinePassed = activeRound.votingDueAt && nowTick > activeRound.votingDueAt;
    if (allLocked || deadlinePassed) {
      setState((s) => ({
        ...s,
        rounds: s.rounds.map((r) => (r.id === activeRound.id ? { ...r, phase: "results" } : r)),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound, state.members, nowTick]);

  useEffect(() => {
    if (page !== "round" && editingSubmission) {
      setEditingSubmission(false);
      setPicked(null);
      setBlurb("");
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const myActionNeeded = (() => {
    if (!me || !activeRound) return false;
    if (activeRound.phase === "submitting") return !activeRound.submissions.some((s) => s.by === me.name);
    if (activeRound.phase === "voting") {
      const othersSubs = activeRound.submissions.filter((s) => s.by !== me.name);
      return othersSubs.length > 0 && !othersSubs.every((s) => s.votes?.[me.name] != null);
    }
    return false;
  })();

  const pickTheme = (t) => {
    setThemeInput(t.title);
    setThemeSummary(t.summary);
    setShowThemeBrowser(false);
  };

  const surpriseMe = () => {
    const t = THEMES[Math.floor(Math.random() * THEMES.length)];
    pickTheme(t);
  };

  const rerollBrowser = () => setBrowserSample(sampleThemes(8));

  const addToQueue = () => {
    const theme = themeInput.trim();
    if (!theme) return;
    const item = { id: uid(), theme, summary: themeSummary };
    setState((s) => ({ ...s, queue: [...s.queue, item] }));
    setThemeInput("");
    setThemeSummary("");
  };

  const removeFromQueue = (id) => {
    setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
  };

  const startSeason = () => {
    if (!me) return;
    setState((s) => {
      if (s.queue.length === 0) return s;
      const [first, ...rest] = s.queue;
      const round = { id: uid(), theme: first.theme, createdBy: me.name, phase: "submitting", submissions: [], submissionsDueAt: Date.now() + SUBMIT_WINDOW_MS };
      return { ...s, queue: rest, rounds: [...s.rounds, round] };
    });
  };

  const startNextRound = () => {
    if (!me) return;
    setState((s) => {
      if (s.queue.length > 0) {
        const [first, ...rest] = s.queue;
        const round = { id: uid(), theme: first.theme, createdBy: me.name, phase: "submitting", submissions: [], submissionsDueAt: Date.now() + SUBMIT_WINDOW_MS };
        return { ...s, queue: rest, rounds: [...s.rounds, round] };
      }
      const theme = themeInput.trim();
      if (!theme) return s;
      const round = { id: uid(), theme, createdBy: me.name, phase: "submitting", submissions: [], submissionsDueAt: Date.now() + SUBMIT_WINDOW_MS };
      return { ...s, rounds: [...s.rounds, round] };
    });
    setThemeInput("");
    setThemeSummary("");
  };

  const mySubmission = activeRound?.submissions.find((s) => s.by === me?.name);

  const submitMovie = () => {
    if (!picked || !activeRound || !me) return;
    if (activeRound.submissions.some((s) => s.movieId === picked.id && s.by !== me.name)) {
      setPicked(null);
      return;
    }
    const sub = { id: uid(), by: me.name, movieId: picked.id, title: picked.title, year: picked.year, genre: picked.genre, blurb: blurb.trim(), votes: {} };
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.id === activeRound.id ? { ...r, submissions: [...r.submissions, sub] } : r)),
    }));
    setPicked(null);
    setBlurb("");
    setSearch("");
  };

  const startEditSubmission = () => {
    if (!mySubmission) return;
    setPicked({ id: mySubmission.movieId, title: mySubmission.title, year: mySubmission.year, genre: mySubmission.genre });
    setBlurb(mySubmission.blurb || "");
    setSearch("");
    setEditingSubmission(true);
  };

  const cancelEditSubmission = () => {
    setEditingSubmission(false);
    setPicked(null);
    setBlurb("");
    setSearch("");
  };

  const updateSubmission = () => {
    if (!picked || !activeRound || !me || activeRound.phase !== "submitting") return;
    if (activeRound.submissions.some((s) => s.movieId === picked.id && s.by !== me.name)) {
      setPicked(null);
      return;
    }
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => {
        if (r.id !== activeRound.id) return r;
        return {
          ...r,
          submissions: r.submissions.map((sub) =>
            sub.by === me.name
              ? { ...sub, movieId: picked.id, title: picked.title, year: picked.year, genre: picked.genre, blurb: blurb.trim() }
              : sub
          ),
        };
      }),
    }));
    setEditingSubmission(false);
    setPicked(null);
    setBlurb("");
    setSearch("");
  };

  const startVoting = () => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.id === activeRound.id ? { ...r, phase: "voting", votingDueAt: Date.now() + VOTE_WINDOW_MS } : r)),
    }));
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !me) return;
    setMessages((m) => [...m, { by: me.name, text, ts: Date.now() }]);
    setChatInput("");
  };

  const submitVotes = () => {
    if (!activeRound || !me) return;
    const used = Object.values(draftVotes).reduce((a, b) => a + (b || 0), 0);
    if (used !== voteBudget) return;
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => {
        if (r.id !== activeRound.id) return r;
        return {
          ...r,
          submissions: r.submissions.map((sub) => {
            if (sub.by === me.name) return sub;
            const pts = draftVotes[sub.id] || 0;
            const comment = (draftComments[sub.id] || "").trim();
            const nextSub = { ...sub, votes: { ...sub.votes, [me.name]: pts } };
            if (comment) nextSub.comments = { ...sub.comments, [me.name]: comment };
            return nextSub;
          }),
        };
      }),
    }));
    setDraftVotes({});
    setDraftComments({});
  };

  const roundVotesComplete = (round) => {
    if (!round || round.phase === "submitting") return false;
    return state.members.every((m) => {
      const theirTargets = round.submissions.filter((s) => s.by !== m.name);
      return theirTargets.length === 0 || theirTargets.every((s) => s.votes?.[m.name] != null);
    });
  };

  const scoreOf = (sub) => Object.values(sub.votes || {}).reduce((a, b) => a + b, 0);

  const leaderboard = (() => {
    const totals = {};
    state.members.forEach((m) => (totals[m.name] = 0));
    state.rounds.forEach((r) => {
      if (r.phase === "results" || roundVotesComplete(r)) {
        r.submissions.forEach((sub) => {
          totals[sub.by] = (totals[sub.by] || 0) + scoreOf(sub);
        });
      }
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  })();

  const remainingPoints = voteBudget - Object.values(draftVotes).reduce((a, b) => a + (b || 0), 0);
  const myVotesLocked = activeRound && me
    ? (() => {
        const othersSubs = activeRound.submissions.filter((s) => s.by !== me.name);
        return othersSubs.length > 0 && othersSubs.every((s) => s.votes?.[me.name] != null);
      })()
    : false;
  const votersLockedCount = activeRound
    ? state.members.filter((m) => {
        const theirTargets = activeRound.submissions.filter((s) => s.by !== m.name);
        return theirTargets.length > 0 && theirTargets.every((s) => s.votes?.[m.name] != null);
      }).length
    : 0;

  const takenMovieIds = new Set((activeRound?.submissions || []).filter((s) => s.by !== me?.name).map((s) => s.movieId));
  const filteredMovies = MOVIES.filter(
    (m) => m.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');`;

  const css = `
    ${fontImport}
    .ml-root { --midnight:#12131f; --velvet:#1c1e33; --marquee-gold:#f0b429; --ticket-red:#e2472c; --screen-white:#f5f1e6; --reel-grey:#6b6f8a;
      background: var(--midnight); color: var(--screen-white); font-family: 'Inter', -apple-system, sans-serif; min-height: 100%; }
    .display { font-family: 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.04em; }
    .mono { font-family: 'Space Mono', monospace; }
    .marquee { position: relative; border: 2px solid var(--marquee-gold); border-radius: 10px; padding: 22px 20px; overflow: hidden; }
    .bulb { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--marquee-gold); box-shadow: 0 0 6px 2px rgba(240,180,41,0.6); animation: twinkle 1.6s infinite ease-in-out; }
    @keyframes twinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
    .ticket { position: relative; background: var(--velvet); border-radius: 10px; display: flex; overflow: hidden; border: 1px solid rgba(107,111,138,0.35); }
    .ticket::before, .ticket::after { content: ''; position: absolute; width: 16px; height: 16px; background: var(--midnight); border-radius: 50%; top: 50%; transform: translateY(-50%); z-index: 2; }
    .ticket::before { left: -8px; } .ticket::after { right: -8px; }
    .stub-divider { border-left: 2px dashed rgba(107,111,138,0.4); }
    .btn-primary { background: var(--marquee-gold); color: #211a06; font-weight: 700; }
    .btn-primary:hover { filter: brightness(1.08); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-ghost { border: 1px solid rgba(107,111,138,0.5); color: var(--screen-white); }
    .card { background: var(--velvet); border-radius: 10px; border: 1px solid rgba(107,111,138,0.25); }
    ::selection { background: var(--marquee-gold); color: #211a06; }
  `;

  const Marquee = ({ children }) => (
    <div className="marquee">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 2 * Math.PI;
        const rx = 49, ry = 46;
        const cx = 50 + rx * Math.cos(angle);
        const cy = 50 + ry * Math.sin(angle);
        return (
          <span
            key={i}
            className="bulb"
            style={{ left: `${cx}%`, top: `${cy}%`, animationDelay: `${(i % 8) * 0.18}s` }}
          />
        );
      })}
      {children}
    </div>
  );

  if (!state.setupComplete) {
    return (
      <div className="ml-root" style={{ padding: "20px 16px 60px", maxWidth: 640, margin: "0 auto" }}>
        <style>{css}</style>
        <Marquee>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 34, color: "var(--marquee-gold)" }}>CREATE YOUR GAME</div>
            <div style={{ color: "var(--reel-grey)", fontSize: 13, marginTop: -4 }}>Set everything up before anyone gets an invite</div>
          </div>
        </Marquee>

        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>League name (optional)</div>
          <input
            value={setupLeagueName}
            onChange={(e) => setSetupLeagueName(e.target.value)}
            placeholder="e.g. The Sunday Night Movie League"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
          />
        </div>

        <div className="card" style={{ marginTop: 14, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Points per voter</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSetupVoteBudget((v) => Math.max(5, v - 5))} className="btn-ghost mono" style={{ width: 36, height: 36, borderRadius: 8, background: "transparent" }}>&minus;</button>
            <span className="mono" style={{ fontSize: 20, width: 50, textAlign: "center" }}>{setupVoteBudget}</span>
            <button onClick={() => setSetupVoteBudget((v) => Math.min(100, v + 5))} className="btn-ghost mono" style={{ width: 36, height: 36, borderRadius: 8, background: "transparent" }}>+</button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--reel-grey)" }}>Each voter distributes this many points across other players' picks every round.</div>
        </div>

        <div className="card" style={{ marginTop: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Clapperboard size={16} color="var(--marquee-gold)" />
            <span className="display" style={{ fontSize: 18 }}>BUILD THE SEASON</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--reel-grey)", marginBottom: 14 }}>
            Queue every round's theme now &mdash; players won't be invited until this is done.
          </div>

          {state.queue.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {state.queue.map((q, i) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                  <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)", width: 20 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{q.theme}</div>
                    {q.summary && <div style={{ fontSize: 12, color: "var(--reel-grey)" }}>{q.summary}</div>}
                  </div>
                  <button onClick={() => removeFromQueue(q.id)} className="btn-ghost" style={{ background: "transparent", padding: "4px 8px", borderRadius: 6, color: "var(--ticket-red)" }}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={themeInput}
              onChange={(e) => { setThemeInput(e.target.value); setThemeSummary(""); }}
              placeholder="e.g. a movie set in one location"
              style={{ flex: 1, minWidth: 180, padding: "12px 14px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
            />
            <button onClick={surpriseMe} title="Surprise me" className="btn-ghost" style={{ padding: "0 14px", borderRadius: 8, background: "transparent", fontSize: 18 }}>
              &#127922;
            </button>
            <button onClick={addToQueue} disabled={!themeInput.trim()} className="btn-primary" style={{ padding: "0 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={16} /> Add round
            </button>
          </div>
          <select
            value=""
            onChange={(e) => { const t = THEMES.find((x) => x.title === e.target.value); if (t) pickTheme(t); }}
            className="mono"
            style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
          >
            <option value="">Or pick from all 100 theme ideas...</option>
            {THEMES.map((t) => (
              <option key={t.title} value={t.title}>{t.title}</option>
            ))}
          </select>
          {themeSummary && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--marquee-gold)", fontStyle: "italic" }}>{themeSummary}</div>
          )}
          <button
            onClick={() => { setShowThemeBrowser((v) => !v); if (!showThemeBrowser) rerollBrowser(); }}
            className="btn-ghost"
            style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 12, color: "var(--reel-grey)" }}
          >
            {showThemeBrowser ? "Hide idea cards" : "Browse theme ideas"}
          </button>
          {showThemeBrowser && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {browserSample.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => pickTheme(t)}
                    style={{ textAlign: "left", background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px", color: "var(--screen-white)", cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "var(--reel-grey)", marginTop: 2 }}>{t.summary}</div>
                  </button>
                ))}
              </div>
              <button onClick={rerollBrowser} className="btn-ghost mono" style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 12 }}>
                Show 8 more
              </button>
            </div>
          )}
        </div>

        <button
          onClick={finishSetup}
          disabled={state.queue.length === 0}
          className="btn-primary"
          style={{ marginTop: 18, width: "100%", padding: "14px 18px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16 }}
        >
          <ChevronRight size={18} /> Finish Setup &amp; Send Invites
        </button>
        {state.queue.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--reel-grey)", textAlign: "center" }}>Queue at least one round to continue.</div>
        )}
      </div>
    );
  }

  if (!me && !inviteAck) {
    return (
      <div className="ml-root" style={{ minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <style>{css}</style>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <Marquee>
            <div>
              <div className="display" style={{ fontSize: 34, color: "var(--marquee-gold)" }}>GAME'S READY</div>
              <div style={{ color: "var(--reel-grey)", fontSize: 13, marginTop: -4 }}>{state.settings.leagueName || "Your Movie League"}</div>
            </div>
          </Marquee>
          <div className="card" style={{ marginTop: 18, padding: 20, textAlign: "left" }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              <strong>{state.queue.length}</strong> round{state.queue.length === 1 ? "" : "s"} queued, <strong>{voteBudget}</strong> points per voter.
            </div>
            <div style={{ fontSize: 13, color: "var(--reel-grey)" }}>
              Invites are open now &mdash; share this app's link with your friends and family. Everyone (including you) joins by picking a name on the next screen.
            </div>
          </div>
          <button onClick={() => setInviteAck(true)} className="btn-primary" style={{ marginTop: 18, width: "100%", padding: "14px 18px", borderRadius: 8, fontSize: 16 }}>
            Continue to Join
          </button>
          {confirmingStartOver ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                onClick={startOverSetup}
                className="btn-primary"
                style={{ flex: 1, padding: "10px 18px", borderRadius: 8, fontSize: 13, background: "var(--ticket-red)", color: "#fff" }}
              >
                Yes, clear everything
              </button>
              <button
                onClick={() => setConfirmingStartOver(false)}
                className="btn-ghost"
                style={{ flex: 1, padding: "10px 18px", borderRadius: 8, background: "transparent", fontSize: 13 }}
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingStartOver(true)}
              className="btn-ghost"
              style={{ marginTop: 10, width: "100%", padding: "10px 18px", borderRadius: 8, background: "transparent", fontSize: 13, color: "var(--reel-grey)" }}
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="ml-root" style={{ minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <style>{css}</style>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <Marquee>
            <div style={{ textAlign: "center" }}>
              <div className="display" style={{ fontSize: 42, color: "var(--marquee-gold)" }}>{state.settings.leagueName || "MOVIE LEAGUE"}</div>
              <div style={{ color: "var(--reel-grey)", fontSize: 13, marginTop: -6 }}>pick a name to step up to the box office</div>
            </div>
          </Marquee>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, textAlign: "center" }}>
              Pick your avatar
            </div>
            <AvatarPicker value={joinAvatar} onChange={setJoinAvatar} />
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinLeague()}
              placeholder="Your name"
              className="mono"
              style={{ flex: 1, padding: "12px 14px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--velvet)", color: "var(--screen-white)" }}
            />
            <button onClick={joinLeague} className="btn-primary" style={{ padding: "0 18px", borderRadius: 8 }}>
              Join
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--reel-grey)", textAlign: "center" }}>
            Prototype mode: this session lives in your browser tab only. Use "switch player" up top to simulate friends.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-root" style={{ padding: "20px 16px 60px", maxWidth: 720, margin: "0 auto" }}>
      <style>{css}</style>

      <Marquee>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div className="display" style={{ fontSize: 32, color: "var(--marquee-gold)" }}>{state.settings.leagueName || "MOVIE LEAGUE"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--reel-grey)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={14} /> {state.members.length}</span>
            <select
              value={me.name}
              onChange={(e) => switchPlayer(e.target.value)}
              className="mono"
              style={{ background: "var(--velvet)", color: "var(--screen-white)", border: "1px solid var(--reel-grey)", borderRadius: 6, padding: "4px 8px" }}
            >
              {state.members.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
            {addingPlayer ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  title="Tap to change avatar"
                  onClick={() => {
                    const idx = AVATAR_OPTIONS.findIndex((a) => a.id === newPlayerAvatar);
                    setNewPlayerAvatar(AVATAR_OPTIONS[(idx + 1) % AVATAR_OPTIONS.length].id);
                  }}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <Avatar avatarId={newPlayerAvatar} size={26} />
                </button>
                <input
                  autoFocus
                  value={newPlayerInput}
                  onChange={(e) => setNewPlayerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPlayer(); if (e.key === "Escape") setAddingPlayer(false); }}
                  placeholder="New name"
                  className="mono"
                  style={{ width: 100, background: "var(--midnight)", color: "var(--screen-white)", border: "1px solid var(--reel-grey)", borderRadius: 6, padding: "4px 6px" }}
                />
                <button onClick={addPlayer} className="btn-primary" style={{ borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>Add</button>
              </span>
            ) : (
              <button onClick={() => setAddingPlayer(true)} className="btn-ghost" style={{ borderRadius: 6, padding: "4px 8px", background: "transparent", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <Plus size={13} /> player
              </button>
            )}
          </div>
        </div>
      </Marquee>

      {/* Page tabs */}
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        {[
          { id: "home", label: "Home", icon: Users },
          { id: "round", label: "Round", icon: Clapperboard },
          { id: "standings", label: "Standings", icon: Trophy },
          { id: "chat", label: "Chat", icon: Ticket },
        ].map((tab) => {
          const Icon = tab.icon;
          const activeTab = page === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={activeTab ? "" : "mono"}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 8,
                border: activeTab ? "1px solid var(--marquee-gold)" : "1px solid rgba(107,111,138,0.3)",
                background: activeTab ? "rgba(240,180,41,0.12)" : "transparent",
                color: activeTab ? "var(--marquee-gold)" : "var(--reel-grey)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: activeTab ? 700 : 400,
                position: "relative",
              }}
            >
              <Icon size={14} /> {tab.label}
              {tab.id === "round" && myActionNeeded && (
                <span style={{ position: "absolute", top: 4, right: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--ticket-red)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Home page */}
      {page === "home" && (
        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Users size={16} color="var(--marquee-gold)" />
              <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>THE LEAGUE</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {state.members.map((m) => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>
                  <Avatar avatarId={m.avatar} size={28} />
                  <span style={{ fontWeight: m.name === me.name ? 700 : 400 }}>{m.name}{m.name === me.name ? " (you)" : ""}</span>
                </div>
              ))}
              {state.members.length === 0 && <div style={{ color: "var(--reel-grey)", fontSize: 13 }}>Nobody's joined yet.</div>}
            </div>
          </div>

          <div className="card" style={{ marginTop: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Clapperboard size={16} color="var(--marquee-gold)" />
              <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>CURRENT ROUND</span>
            </div>
            {activeRound ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--reel-grey)" }}>Round {state.rounds.length} &middot; {activeRound.phase === "submitting" ? "Submitting" : activeRound.phase === "voting" ? "Voting" : "Results"}</div>
                <div className="display" style={{ fontSize: 22, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
                {(activeRound.phase === "submitting" ? activeRound.submissionsDueAt : activeRound.phase === "voting" ? activeRound.votingDueAt : null) && (
                  <div className="mono" style={{ fontSize: 12, color: nowTick > (activeRound.phase === "submitting" ? activeRound.submissionsDueAt : activeRound.votingDueAt) ? "var(--ticket-red)" : "var(--reel-grey)", marginBottom: 10 }}>
                    {activeRound.phase === "submitting" ? "Submissions" : "Voting"} {formatCountdown(activeRound.phase === "submitting" ? activeRound.submissionsDueAt : activeRound.votingDueAt, nowTick)}
                  </div>
                )}
                {activeRound.phase !== "results" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {state.members.map((m) => {
                      let done;
                      if (activeRound.phase === "submitting") {
                        done = activeRound.submissions.some((s) => s.by === m.name);
                      } else {
                        const theirTargets = activeRound.submissions.filter((s) => s.by !== m.name);
                        done = theirTargets.length > 0 && theirTargets.every((s) => s.votes?.[m.name] != null);
                      }
                      return (
                        <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                          <Avatar avatarId={m.avatar} size={22} />
                          {done ? <Check size={15} color="var(--marquee-gold)" /> : <span style={{ width: 15, height: 15, borderRadius: "50%", border: "1px solid var(--reel-grey)", display: "inline-block" }} />}
                          <span style={{ color: done ? "var(--screen-white)" : "var(--reel-grey)" }}>
                            {m.name}{m.name === me.name ? " (you)" : ""} &mdash; {activeRound.phase === "submitting" ? (done ? "submitted" : "hasn't submitted yet") : (done ? "voted" : "hasn't voted yet")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeRound.phase === "results" && (
                  <div style={{ fontSize: 13, color: "var(--reel-grey)" }}>This round wrapped up &mdash; check the Round tab for the breakdown or Standings for the leaderboard.</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--reel-grey)" }}>
                {state.rounds.length === 0 ? "The season hasn't started yet." : "No round in progress right now."}
              </div>
            )}
          </div>

          {state.queue.length > 0 && (
            <div className="card" style={{ marginTop: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Ticket size={16} color="var(--marquee-gold)" />
                <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>UPCOMING ROUNDS</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {state.queue.map((q, i) => (
                  <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                    <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)", width: 24 }}>{state.rounds.length + i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{q.theme}</div>
                      {q.summary && <div style={{ fontSize: 12, color: "var(--reel-grey)" }}>{q.summary}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.rounds.some((r) => r.phase === "results") && (
            <div className="card" style={{ marginTop: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Trophy size={16} color="var(--marquee-gold)" />
                <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>COMPLETED ROUNDS</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {state.rounds.map((r, i) => (r.phase === "results" ? { r, i } : null)).filter(Boolean).reverse().map(({ r, i }) => {
                  const winner = [...r.submissions].sort((a, b) => scoreOf(b) - scoreOf(a))[0];
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setViewingRoundId(r.id); setPage("pastRound"); }}
                      style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px", color: "var(--screen-white)", cursor: "pointer" }}
                    >
                      <span className="mono" style={{ color: "var(--reel-grey)", width: 24 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.theme}</div>
                        {winner && <div style={{ fontSize: 12, color: "var(--reel-grey)" }}>Won by {winner.title} &middot; picked by {winner.by}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--reel-grey)" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past round detail page */}
      {page === "pastRound" && viewingRoundId && (() => {
        const round = state.rounds.find((r) => r.id === viewingRoundId);
        if (!round) return null;
        return (
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => { setPage("home"); setViewingRoundId(null); }}
              className="btn-ghost"
              style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 13, marginBottom: 12 }}
            >
              &larr; Back to Home
            </button>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Completed round &middot; theme</div>
              <div className="display" style={{ fontSize: 26, color: "var(--marquee-gold)", marginTop: 2 }}>{round.theme}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {[...round.submissions].sort((a, b) => scoreOf(b) - scoreOf(a)).map((sub, i) => (
                <div key={sub.id} className="ticket">
                  <div style={{ width: 80, height: 112, padding: 10, boxSizing: "border-box" }}>
                    <Poster genre={sub.genre} title={sub.title} year={sub.year} />
                  </div>
                  <div className="stub-divider" style={{ flex: 1, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontWeight: 700 }}>
                        <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>#{i + 1}</span>{" "}
                        {sub.title} <span className="mono" style={{ color: "var(--reel-grey)", fontWeight: 400 }}>{sub.year}</span>
                      </div>
                      <span className="mono" style={{ color: "var(--marquee-gold)" }}>{scoreOf(sub)} pts</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--reel-grey)", marginTop: 4 }}>picked by {sub.by}</div>
                    {sub.blurb && <div style={{ fontSize: 13, marginTop: 4 }}>{sub.blurb}</div>}
                    {Object.keys(sub.votes || {}).length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {Object.entries(sub.votes)
                          .sort((a, b) => b[1] - a[1])
                          .map(([voter, pts]) => (
                            <span
                              key={voter}
                              className="mono"
                              style={{ fontSize: 11, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 20, padding: "2px 8px", color: "var(--reel-grey)" }}
                            >
                              {voter}: <span style={{ color: "var(--marquee-gold)" }}>{pts}</span>
                            </span>
                          ))}
                      </div>
                    )}
                    {Object.keys(sub.comments || {}).length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {Object.entries(sub.comments).map(([voter, comment]) => (
                          <div key={voter} style={{ fontSize: 13, color: "var(--screen-white)", background: "var(--midnight)", borderRadius: 8, padding: "6px 10px", borderLeft: "2px solid var(--marquee-gold)" }}>
                            <span className="mono" style={{ color: "var(--marquee-gold)" }}>{voter}:</span> {comment}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Standings page */}
      {page === "standings" && (
      <div className="card" style={{ marginTop: 18, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Trophy size={16} color="var(--marquee-gold)" />
          <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>STANDINGS</span>
        </div>
        {leaderboard.length === 0 ? (
          <div style={{ color: "var(--reel-grey)", fontSize: 13 }}>No scores yet &mdash; finish a round to see the board light up.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {leaderboard.map(([name, pts], i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px", borderBottom: i === leaderboard.length - 1 ? "none" : "1px solid rgba(107,111,138,0.15)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)", width: 18 }}>{i + 1}</span>
                  <Avatar avatarId={state.members.find((m) => m.name === name)?.avatar} size={24} />
                  <span style={{ fontWeight: name === me.name ? 700 : 400 }}>{name}{name === me.name ? " (you)" : ""}</span>
                </span>
                <span className="mono" style={{ color: "var(--marquee-gold)" }}>{pts} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Round page */}
      {page === "round" && (
      <div style={{ marginTop: 18 }}>

        {roundOpen && activeRound.phase === "submitting" && !mySubmission && !gateDismissed && (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <Clapperboard size={22} color="var(--marquee-gold)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Round {state.rounds.length} &middot; theme</div>
            <div className="display" style={{ fontSize: 24, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
            <div style={{ marginTop: 10, color: "var(--screen-white)" }}>Hi {me.name} &mdash; you haven't submitted a movie yet.</div>
            <button onClick={() => setGateDismissed(true)} className="btn-primary" style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8 }}>
              Start My Submission
            </button>
          </div>
        )}

        {roundOpen && activeRound.phase === "submitting" && (mySubmission || gateDismissed) && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Now showing &middot; theme</div>
            <div className="display" style={{ fontSize: 26, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
            {activeRound.submissionsDueAt && (
              <div className="mono" style={{ fontSize: 12, color: nowTick > activeRound.submissionsDueAt ? "var(--ticket-red)" : "var(--reel-grey)", marginTop: 4 }}>
                Submissions {formatCountdown(activeRound.submissionsDueAt, nowTick)}
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 13, color: "var(--reel-grey)" }}>
              {activeRound.submissions.length} of {state.members.length} member{state.members.length === 1 ? "" : "s"} have submitted
              {state.members.length > activeRound.submissions.length && (
                <span> &mdash; waiting on {state.members.filter((m) => !activeRound.submissions.some((s) => s.by === m.name)).map((m) => m.name).join(", ")}</span>
              )}
            </div>

            {mySubmission && !editingSubmission ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--screen-white)" }}>
                  <Check size={16} color="var(--marquee-gold)" /> You submitted <strong>{mySubmission.title}</strong>.{" "}
                  {activeRound.submissions.length >= state.members.length ? "Everyone's in." : "Waiting on the rest of the crowd."}
                </div>
                {activeRound.submissions.length < state.members.length && (
                  <button onClick={startEditSubmission} className="btn-ghost" style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "transparent", fontSize: 13 }}>
                    Change my submission
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {picked ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--midnight)", border: "1px solid var(--marquee-gold)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ width: 44, height: 62, flexShrink: 0 }}>
                      <Poster genre={picked.genre} title={picked.title} year={picked.year} size="small" />
                    </div>
                    <span style={{ flex: 1, fontWeight: 700 }}>{picked.title} <span style={{ color: "var(--reel-grey)", fontWeight: 400 }}>&middot; {picked.year}</span></span>
                    <button onClick={() => setPicked(null)} className="btn-ghost" style={{ background: "transparent", padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search the catalog for your pick..."
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
                    />
                    {search && (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                        {filteredMovies.map((m) => {
                          const taken = takenMovieIds.has(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => { if (!taken) { setPicked(m); setSearch(""); } }}
                              disabled={taken}
                              style={{
                                textAlign: "left",
                                background: "var(--midnight)",
                                border: "1px solid rgba(107,111,138,0.3)",
                                borderRadius: 8,
                                padding: "8px 12px",
                                color: taken ? "var(--reel-grey)" : "var(--screen-white)",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: taken ? "not-allowed" : "pointer",
                                opacity: taken ? 0.55 : 1,
                              }}
                            >
                              <div style={{ width: 44, height: 62, flexShrink: 0, filter: taken ? "grayscale(0.6)" : "none" }}>
                                <Poster genre={m.genre} title={m.title} year={m.year} size="small" />
                              </div>
                              <span style={{ flex: 1 }}>
                                {m.title} <span style={{ color: "var(--reel-grey)" }}>&middot; {m.year}</span>
                                {taken && <div style={{ fontSize: 11, color: "var(--ticket-red)", marginTop: 2 }}>Already picked this round</div>}
                              </span>
                            </button>
                          );
                        })}
                        {filteredMovies.length === 0 && <div style={{ color: "var(--reel-grey)", fontSize: 13, padding: 6 }}>Nothing in the catalog matches &mdash; try another title.</div>}
                      </div>
                    )}
                  </>
                )}

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Why this pick fits the theme (optional)
                  </div>
                  <textarea
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value)}
                    placeholder="Say a word or two about why you picked this..."
                    rows={2}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {picked && (
                    <button onClick={editingSubmission ? updateSubmission : submitMovie} className="btn-primary" style={{ padding: "10px 18px", borderRadius: 8 }}>
                      {editingSubmission ? "Update submission" : "Lock in submission"}
                    </button>
                  )}
                  {editingSubmission && (
                    <button onClick={cancelEditSubmission} className="btn-ghost" style={{ padding: "10px 18px", borderRadius: 8, background: "transparent" }}>
                      Cancel
                    </button>
                  )}
                </div>
                {!picked && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--reel-grey)" }}>Pick a movie above to finish your submission.</div>
                )}
              </div>

            )}

            {activeRound.submissions.length >= 2 && activeRound.submissions.length >= state.members.length && (
              <button onClick={startVoting} className="btn-primary" style={{ marginTop: 18, padding: "10px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                Everyone's in &mdash; start voting <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}

        {roundOpen && activeRound.phase === "voting" && !myVotesLocked && !gateDismissed && (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <Ticket size={22} color="var(--marquee-gold)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Round {state.rounds.length} &middot; theme</div>
            <div className="display" style={{ fontSize: 24, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
            <div style={{ marginTop: 10, color: "var(--screen-white)" }}>Hi {me.name} &mdash; you haven't voted on this round yet.</div>
            <button onClick={() => setGateDismissed(true)} className="btn-primary" style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8 }}>
              Begin Voting
            </button>
          </div>
        )}

        {roundOpen && activeRound.phase === "voting" && (myVotesLocked || gateDismissed) && (
          <div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Voting now &middot; theme</div>
              <div className="display" style={{ fontSize: 26, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
              {activeRound.votingDueAt && (
                <div className="mono" style={{ fontSize: 12, color: nowTick > activeRound.votingDueAt ? "var(--ticket-red)" : "var(--reel-grey)", marginTop: 4 }}>
                  Voting {formatCountdown(activeRound.votingDueAt, nowTick)}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--reel-grey)" }}>
                You have <strong style={{ color: remainingPoints === 0 ? "var(--marquee-gold)" : "var(--screen-white)" }}>{remainingPoints}</strong> of {voteBudget} points left to hand out. Names stay hidden until results are revealed.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {(() => {
                let ordered;
                if (myVotesLocked) {
                  ordered = [...activeRound.submissions].sort((a, b) => scoreOf(b) - scoreOf(a));
                } else if (voteShuffleOrder.length === activeRound.submissions.length) {
                  ordered = voteShuffleOrder.map((id) => activeRound.submissions.find((s) => s.id === id)).filter(Boolean);
                } else {
                  ordered = activeRound.submissions;
                }
                return ordered;
              })().map((sub) => {
                const isMine = sub.by === me.name;
                const locked = myVotesLocked;
                const current = draftVotes[sub.id] || 0;
                return (
                  <div key={sub.id} className="ticket">
                    <div style={{ width: 80, height: 112, padding: 10, boxSizing: "border-box" }}>
                      <Poster genre={sub.genre} title={sub.title} year={sub.year} />
                    </div>
                    <div className="stub-divider" style={{ flex: 1, padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700 }}>{sub.title} <span className="mono" style={{ color: "var(--reel-grey)", fontWeight: 400 }}>{sub.year}</span></div>
                      {sub.blurb && <div style={{ fontSize: 13, color: "var(--reel-grey)", marginTop: 4 }}>{sub.blurb}</div>}
                      <div style={{ marginTop: 10 }}>
                        {isMine ? (
                          <span style={{ fontSize: 12, color: "var(--reel-grey)" }}>This is your submission &mdash; you can't allocate points to it</span>
                        ) : locked ? (
                          <span style={{ fontSize: 12, color: "var(--marquee-gold)", display: "flex", alignItems: "center", gap: 6 }}><Check size={14} /> You gave this {sub.votes?.[me.name] || 0} pts</span>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => setDraftVotes((d) => ({ ...d, [sub.id]: Math.max(0, current - 1) }))}
                                disabled={current === 0}
                                className="btn-ghost mono"
                                style={{ width: 30, height: 30, borderRadius: 6, background: "transparent" }}
                              >&minus;</button>
                              <span className="mono" style={{ width: 28, textAlign: "center", fontSize: 16 }}>{current}</span>
                              <button
                                type="button"
                                onClick={() => setDraftVotes((d) => ({ ...d, [sub.id]: current + 1 }))}
                                disabled={remainingPoints === 0}
                                className="btn-ghost mono"
                                style={{ width: 30, height: 30, borderRadius: 6, background: "transparent" }}
                              >+</button>
                              <span style={{ fontSize: 12, color: "var(--reel-grey)" }}>pts</span>
                            </div>
                            <input
                              value={draftComments[sub.id] || ""}
                              onChange={(e) => setDraftComments((d) => ({ ...d, [sub.id]: e.target.value }))}
                              placeholder="Add a comment (optional)"
                              style={{ marginTop: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(107,111,138,0.4)", background: "var(--midnight)", color: "var(--screen-white)", fontSize: 13 }}
                            />
                          </div>
                        )}
                      </div>
                      {locked && (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(107,111,138,0.25)", fontSize: 12, color: "var(--reel-grey)" }}>
                          Current total so far: <span className="mono" style={{ color: "var(--marquee-gold)" }}>{scoreOf(sub)} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!myVotesLocked && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={submitVotes}
                  disabled={remainingPoints !== 0}
                  className="btn-primary"
                  style={{ padding: "10px 18px", borderRadius: 8 }}
                >
                  {remainingPoints === 0 ? "Lock in my votes" : `Use all ${voteBudget} points to submit`}
                </button>
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--reel-grey)" }}>
              {votersLockedCount} of {state.members.length} voter{state.members.length === 1 ? "" : "s"} have locked in their points
              {votersLockedCount < state.members.length ? (
                <span> &mdash; names and comments stay hidden until everyone's voted</span>
              ) : (
                <span> &mdash; tallying up the results...</span>
              )}
            </div>
          </div>
        )}

        {activeRound && activeRound.phase === "results" && (
          <div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Final cut &middot; theme</div>
              <div className="display" style={{ fontSize: 26, color: "var(--marquee-gold)", marginTop: 2 }}>{activeRound.theme}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {[...activeRound.submissions].sort((a, b) => scoreOf(b) - scoreOf(a)).map((sub, i) => (
                <div key={sub.id} className="ticket">
                  <div style={{ width: 80, height: 112, padding: 10, boxSizing: "border-box" }}>
                    <Poster genre={sub.genre} title={sub.title} year={sub.year} />
                  </div>
                  <div className="stub-divider" style={{ flex: 1, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontWeight: 700 }}>
                        <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>#{i + 1}</span>{" "}
                        {sub.title} <span className="mono" style={{ color: "var(--reel-grey)", fontWeight: 400 }}>{sub.year}</span>
                      </div>
                      <span className="mono" style={{ color: "var(--marquee-gold)" }}>{scoreOf(sub)} pts</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--reel-grey)", marginTop: 4 }}>picked by {sub.by}</div>
                    {sub.blurb && <div style={{ fontSize: 13, marginTop: 4 }}>{sub.blurb}</div>}
                    {Object.keys(sub.votes || {}).length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {Object.entries(sub.votes)
                          .sort((a, b) => b[1] - a[1])
                          .map(([voter, pts]) => (
                            <span
                              key={voter}
                              className="mono"
                              style={{ fontSize: 11, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 20, padding: "2px 8px", color: "var(--reel-grey)" }}
                            >
                              {voter}: <span style={{ color: "var(--marquee-gold)" }}>{pts}</span>
                            </span>
                          ))}
                      </div>
                    )}
                    {Object.keys(sub.comments || {}).length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {Object.entries(sub.comments).map(([voter, comment]) => (
                          <div key={voter} style={{ fontSize: 13, color: "var(--screen-white)", background: "var(--midnight)", borderRadius: 8, padding: "6px 10px", borderLeft: "2px solid var(--marquee-gold)" }}>
                            <span className="mono" style={{ color: "var(--marquee-gold)" }}>{voter}:</span> {comment}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!roundOpen && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Clapperboard size={16} color="var(--marquee-gold)" />
              <span className="display" style={{ fontSize: 18 }}>
                {state.rounds.length === 0 ? "PLAN YOUR SEASON" : "UP NEXT"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--reel-grey)", marginBottom: 14 }}>
              {state.rounds.length === 0
                ? "Queue up every round's theme before anyone submits a single movie."
                : "Round " + (state.rounds.length) + " is done. Ready for the next one."}
            </div>

            {state.queue.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {state.queue.map((q, i) => (
                  <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                    <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)", width: 20 }}>
                      {state.rounds.length + i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{q.theme}</div>
                      {q.summary && <div style={{ fontSize: 12, color: "var(--reel-grey)" }}>{q.summary}</div>}
                    </div>
                    <span title="Finalized during setup" style={{ fontSize: 11, color: "var(--reel-grey)" }}>
                      &#128274;
                    </span>
                  </div>
                ))}
              </div>
            )}

            {state.queue.length > 0 && (
              <button
                onClick={state.rounds.length === 0 ? startSeason : startNextRound}
                className="btn-primary"
                style={{ padding: "10px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}
              >
                <ChevronRight size={16} />
                {state.rounds.length === 0 ? `Start the season (${state.queue.length} round${state.queue.length === 1 ? "" : "s"} queued)` : `Start round ${state.rounds.length + 1}: ${state.queue[0].theme}`}
              </button>
            )}

            {state.rounds.length === 0 && (
            <div style={{ borderTop: "1px solid rgba(107,111,138,0.2)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--reel-grey)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Add a round to the queue
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={themeInput}
                  onChange={(e) => { setThemeInput(e.target.value); setThemeSummary(""); }}
                  placeholder="e.g. a movie set in one location"
                  style={{ flex: 1, minWidth: 180, padding: "12px 14px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
                />
                <button onClick={surpriseMe} title="Surprise me" className="btn-ghost" style={{ padding: "0 14px", borderRadius: 8, background: "transparent", fontSize: 18 }}>
                  &#127922;
                </button>
                <button onClick={addToQueue} disabled={!themeInput.trim()} className="btn-primary" style={{ padding: "0 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={16} /> Add to queue
                </button>
              </div>
              <select
                value=""
                onChange={(e) => { const t = THEMES.find((x) => x.title === e.target.value); if (t) pickTheme(t); }}
                className="mono"
                style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
              >
                <option value="">Or pick from all 100 theme ideas...</option>
                {THEMES.map((t) => (
                  <option key={t.title} value={t.title}>{t.title}</option>
                ))}
              </select>
              {themeSummary && (
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--marquee-gold)", fontStyle: "italic" }}>{themeSummary}</div>
              )}
              <button
                onClick={() => { setShowThemeBrowser((v) => !v); if (!showThemeBrowser) rerollBrowser(); }}
                className="btn-ghost"
                style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 12, color: "var(--reel-grey)" }}
              >
                {showThemeBrowser ? "Hide idea cards" : "Browse theme ideas"}
              </button>
              {showThemeBrowser && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {browserSample.map((t) => (
                      <button
                        key={t.title}
                        onClick={() => pickTheme(t)}
                        style={{ textAlign: "left", background: "var(--midnight)", border: "1px solid rgba(107,111,138,0.3)", borderRadius: 8, padding: "8px 12px", color: "var(--screen-white)", cursor: "pointer" }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: "var(--reel-grey)", marginTop: 2 }}>{t.summary}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={rerollBrowser} className="btn-ghost mono" style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 12 }}>
                    Show 8 more
                  </button>
                </div>
              )}
              {state.queue.length === 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--reel-grey)" }}>
                  Queue is empty. Add at least one theme to start the season.
                </div>
              )}
            </div>
            )}
            {state.rounds.length > 0 && state.queue.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--reel-grey)" }}>
                No more rounds queued. The season was fully planned before kickoff, so new rounds can't be added mid-season.
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Chat page */}
      {page === "chat" && (
        <div className="card" style={{ marginTop: 18, padding: 16, display: "flex", flexDirection: "column", height: 440 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ticket size={16} color="var(--marquee-gold)" />
            <span className="display" style={{ fontSize: 18, letterSpacing: "0.06em" }}>LOBBY CHAT</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
            {messages.length === 0 && (
              <div style={{ color: "var(--reel-grey)", fontSize: 13 }}>No messages yet &mdash; say hi before the next round kicks off.</div>
            )}
            {messages.map((msg, i) => {
              const mine = msg.by === me.name;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: 11, color: "var(--reel-grey)", marginBottom: 2 }}>{msg.by}</div>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: mine ? "rgba(240,180,41,0.15)" : "var(--midnight)",
                      border: mine ? "1px solid var(--marquee-gold)" : "1px solid rgba(107,111,138,0.3)",
                      fontSize: 14,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Message as ${me.name}...`}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--reel-grey)", background: "var(--midnight)", color: "var(--screen-white)" }}
            />
            <button onClick={sendMessage} disabled={!chatInput.trim()} className="btn-primary" style={{ padding: "0 16px", borderRadius: 8 }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
