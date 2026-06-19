import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { recordQueryTiming } from "../utils/requestPerformance.js";

dotenv.config();

const requiredEnv = [
  "MYSQL_DB_NAME",
  "MYSQL_DB_USER",
  "MYSQL_DB_HOST",
];

const missingEnv = requiredEnv.filter(
  (name) => !process.env[name]
);

if (missingEnv.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

const sequelize = new Sequelize(
  process.env.MYSQL_DB_NAME,
  process.env.MYSQL_DB_USER,
  process.env.MYSQL_DB_PASSWORD ?? "",
  {
    host: process.env.MYSQL_DB_HOST,
    port: Number(process.env.MYSQL_DB_PORT || 3306),
    dialect: "mysql",
    benchmark: process.env.NODE_ENV !== "production",
    logging:
      process.env.NODE_ENV === "production"
        ? false
        : (sql, durationMs) => recordQueryTiming(sql, durationMs),

    dialectOptions: {
      ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
      },
    },
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL Database Connected!");
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

export default sequelize;
