const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const socialMediaRoutes = require("./routes/socialMediaRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const hotspotRoutes = require("./routes/hotspotRoutes");
const incoisRoutes = require("./routes/incoisRoutes");
const verifyIncoisApiKey = require('./middleware/verifyIncoisApiKey');
const { startScheduler } = require('../scheduler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

connectDB();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  return next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ocean Hazard Backend API',
      version: '1.0.0',
      description: 'API documentation for the Ocean Hazard project',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:5000',
        description: 'API Server'
      }
    ],
  },
  apis: [path.join(__dirname, './routes/*.js')],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/socialmedia", socialMediaRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api/hotspots", hotspotRoutes);
app.use("/api/incois", verifyIncoisApiKey, incoisRoutes);

app.get("/", (req, res) => res.send("Ocean Hazard Backend is running 🌊"));

io.on('connection', (socket) => {
  console.log('🔌 A user connected to Socket.IO');
  socket.on('disconnect', () => console.log('🔌 A user disconnected'));
});

startScheduler();

// Vercel expects a handler export
module.exports = (req, res) => {
  return app(req, res);
};
