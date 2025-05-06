import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Team, User } from "../models/index.js";

dotenv.config();

export const registerUser = async (req, res) => {
  try {
    let parsed = req.body;

    if (!parsed.id) {
      parsed = JSON.parse(Object.keys(req.body)[0]);
    }
    let { id, name, email, password, role } = parsed;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      id,
      name,
      email,
      password: hashedPassword,
      role,
    });
    if (role === "team_owner" && req.body.teamName) {
      await Team.create({
        name: req.body.teamName,
        ownerId: id,
        id: req.body.teamId,
      });
    }
    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    console.log("check ");
    let parsed = req.body;

    if (!parsed.email) {
      parsed = JSON.parse(Object.keys(req.body)[0]);
    }
    let { email, password } = parsed;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", token: "" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", token: "" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
