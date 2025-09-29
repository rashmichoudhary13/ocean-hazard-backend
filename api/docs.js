import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import express from "express";

// Swagger config
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.js"], // adjust path to your JSDoc comments
};

const swaggerSpec = swaggerJSDoc(options);

// Create express app
const app = express();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Export as Vercel serverless handler
export default app;
