export const SPORTS = Object.freeze([
  { id: "cricket", code: "cricket", name: "Cricket", isActive: true },
  { id: "tt", code: "tt", name: "Table Tennis", isActive: true },
  { id: "volleyball", code: "volleyball", name: "Volleyball", isActive: true },
  { id: "badminton", code: "badminton", name: "Badminton", isActive: true },
  { id: "chess", code: "chess", name: "Chess", isActive: true },
  { id: "carrom", code: "carrom", name: "Carrom", isActive: true },
  { id: "throwball", code: "throwball", name: "Throwball", isActive: true },
  { id: "other", code: "other", name: "Other", isActive: true },
]);

export const SPORT_IDS = Object.freeze(SPORTS.map((sport) => sport.id));
export const CRICKET_SPORT_ID = "cricket";

export const CRICKET_PLAYER_ROLES = Object.freeze([
  "Batsman",
  "Bowler",
  "All-rounder",
  "Wicketkeeper",
]);

export const isCricketSport = (sportId) => sportId === CRICKET_SPORT_ID;
