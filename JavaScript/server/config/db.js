const mysql = require("mysql2/promise");
require("dotenv").config();

const connectionOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const database = process.env.DB_NAME;

const pool = mysql.createPool({
  ...connectionOptions,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDB() {
  if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error(
      "DB_NAME must contain only letters, numbers, or underscores.",
    );
  }

  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const connection = await mysql.createConnection(connectionOptions);

      try {
        await connection.query("CREATE DATABASE IF NOT EXISTS ??", [database]);
      } finally {
        await connection.end();
      }

      await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    bio TEXT DEFAULT NULL,
                    avatar VARCHAR(255) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

      await pool.query(`
                CREATE TABLE IF NOT EXISTS articles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    image VARCHAR(255) DEFAULT NULL,
                    user_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

      console.log("Database and tables initialized successfully.");
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }

      console.warn(
        `Database initialization failed (${attempt}/${maxAttempts}): ${err.code || err.message}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

module.exports = { pool, initDB };
