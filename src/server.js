/**
 * @file server.js
 * @description Main server file for the Ocean Hazard backend.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// --- Import Swagger Packages ---
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const socialMediaRoutes = require("./routes/socialMediaRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const hotspotRoutes = require("./routes/hotspotRoutes");
const incoisRoutes = require("./routes/incoisRoutes");

// --- Import Middleware ---
const verifyIncoisApiKey = require('./middleware/verifyIncoisApiKey');

// --- Import Scheduler ---
const { startScheduler } = require('../scheduler');

const app = express();


// --- Setup Socket.IO ---
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// --- Connect to Database ---
connectDB();

// --- Middleware ---
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    return next();
});

// --- Swagger Configuration & UI Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ocean Hazard Backend API',
            version: '1.0.0',
            description: 'API documentation for the Ocean Hazard project, providing access to social media data and hazard hotspots for INCOIS.',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development Server'
            },
        ],
        // ✨ Central definitions for tags, security, and schemas
        tags: [
            { name: 'Auth', description: 'Authentication and user management' },
            { name: 'Reports', description: 'Crowdsourced hazard report endpoints' },
            { name: 'Social Media', description: 'Endpoints for social media posts' },
            { name: 'Dashboard', description: 'Analytics and dashboard endpoints' },
            { name: 'Hotspots', description: 'Hazard hotspots' },
            { name: 'INCOIS', description: 'Partner APIs for INCOIS consumers' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                SocialMediaPost: {
                    type: "object",
                    properties: {
                        _id: { type: "string", description: "The unique DB identifier." },
                        tweetId: { type: "string", description: "The ID from Twitter/X." },
                        text: { type: "string", description: "The content of the post." },
                        author: { type: "object", properties: { name: {type: "string"}, username: {type: "string"} } },
                        sentiment: { type: "string", description: "Analyzed sentiment." },
                        keywords: { type: "array", items: { type: "string" } },
                        tweetedAt: { type: "string", format: "date-time", description: "Original tweet timestamp." }
                    }
                }
            }
        }
    },
    // This tells swagger-jsdoc where to find your API documentation comments
    apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// --- Define API Routes ---
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/socialmedia", socialMediaRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api/hotspots", hotspotRoutes);
app.use("/api/incois", verifyIncoisApiKey, incoisRoutes);

// Simple root route
app.get("/", (req, res) => {
    res.send("Ocean Hazard Backend is running 🌊");
});

// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
    console.log('🔌 A user connected to Socket.IO');
    socket.on('disconnect', () => {
        console.log('🔌 A user disconnected');
    });
});

// --- Start Background Scheduler ---
startScheduler();

// --- Start Server ---
const PORT = process.env.PORT || 5000;
module.exports = app;