import sequelizeDb from "../config/dbconfig.js";
import User from "./user.model.js";
import Auction from "./auction.model.js";
import Bid from "./bid.model.js";
import Team from "./team.model.js";
import Player from "./player.model.js";
import Tournament from "./tournment.model.js";

await sequelizeDb.sync({ force: false, alter: true });
console.log("Database and tables are synced");
export { User, Team, Player, Auction, Bid, Tournament };
