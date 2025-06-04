import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/db.js";
import routes from "./routes.js";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';

import { createServer } from 'http';
import { initializeSocket } from './socket.js';

dotenv.config({ path: "./.env" });

const app = express();
const httpServer = createServer(app);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  "http://localhost:3000",  // Frontend URL from .env
  "http://localhost:5173",   // Alternative frontend URL
  "https://netzero-backend-ne4a.onrender.com", // Deployed frontend
  "https://netzero-frontend.onrender.com",
  "http://localhost:5000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Initialize socket.io
initializeSocket(httpServer);

app.use("/api", routes);

connectDB();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import connectDB from "./db/db.js";
// import routes from "./routes.js";
// import cookieParser from "cookie-parser";

// dotenv.config({ path: "./.env" });

// const app = express();

// const allowedOrigins = [
//   "http://localhost:5173", // Local development
//   "https://net-zero-three.vercel.app" // Deployed frontend
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, origin);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
//     credentials: true,
//   })
// );

// app.use(express.json());
// app.use(cookieParser());

// app.get("/", (req, res) => {
//   res.send("Hello World");
// });

// app.use("/api", routes);

// connectDB();

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
