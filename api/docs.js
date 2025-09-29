import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const app = express();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ocean Hazard API Docs",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.js"], // adjust if your route files are elsewhere
};

const swaggerSpec = swaggerJSDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Vercel requires default export
export default app;
