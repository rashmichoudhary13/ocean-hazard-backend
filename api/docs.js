import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { createServer } from "@vercel/node";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"], // adjust to where your route comments live
};

const swaggerSpec = swaggerJSDoc(options);

export default createServer((req, res) => {
  if (req.url === "/api-docs") {
    return swaggerUi.setup(swaggerSpec)(req, res);
  }
  res.statusCode = 404;
  res.end("Not Found");
});
