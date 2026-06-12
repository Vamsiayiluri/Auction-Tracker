import { Sport } from "../models/index.js";

export const getSports = async (req, res) => {
  try {
    const sports = await Sport.findAll({
      where: { isActive: true },
      order: [["name", "ASC"]],
    });
    res.status(200).json(sports);
  } catch (error) {
    console.error("Error fetching sports:", error);
    res.status(500).json({ message: "Server error" });
  }
};
