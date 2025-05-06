import { Player, Team, Tournament } from "../models/index.js";

export const createTournament = async (req, res) => {
  try {
    const { id, name, budget, createdBy, teams, players } = req.body;

    if (!name || !budget) {
      return res
        .status(400)
        .json({ message: "Tournament name and budget are required" });
    }

    const newTournament = await Tournament.create({
      id,
      name,
      budget,
      createdBy: createdBy,
    });

    await Team.update(
      { tournamentId: id, totalAmount: budget },
      { where: { name: teams } }
    );

    await Player.bulkCreate(players);

    res.status(201).json({
      message: "Tournament created successfully",
      tournament: newTournament,
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.findAll();
    res.status(200).json(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByPk(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.status(200).json(tournament);
  } catch (error) {
    console.error("Error fetching tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tournament = await Tournament.findByPk(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Update only the status field
    tournament.status = status;
    await tournament.save();

    res.status(200).json({ message: "Tournament status updated", tournament });
  } catch (error) {
    console.error("Error fetching tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};
