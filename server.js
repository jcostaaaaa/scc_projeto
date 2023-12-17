const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const winston = require("winston");
require("winston-mongodb");
const jwt = require("jsonwebtoken");
const swaggerUi = require("swagger-ui-express"); // Using require for swagger-ui-express
const swaggerDocument = require("./swagger.json"); // Using require for swagger.json

require("dotenv").config();

const uri = process.env.ATLAS_URI;
const uriLogs = process.env.ATLAS_URI_LOGS;
const app = express();

mongoose.Promise = global.Promise;
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
  });

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.MongoDB({
      db: uriLogs,
      options: { useNewUrlParser: true, useUnifiedTopology: true },
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
});

app.use((req, res, next) => {
  const authorizationHeader = req.headers["authorization"];
  const userToken = authorizationHeader
    ? authorizationHeader.split(" ")[1]
    : "N/A";

  console.log(userToken);
  if (userToken !== "N/A") {
    const userLogged = jwt.verify(userToken, process.env.TOKEN_SECRET);
    const idUserLogged = userLogged?.id;

    const logMessage =
      userToken === "N/A"
        ? `HTTP ${req.method} request - Path: ${req.path}`
        : `HTTP ${req.method} request - Path: ${req.path}, UserID: ${idUserLogged},User Token: ${userToken}`;
    logger.info(logMessage);
  } else {
    const logMessage = `HTTP ${req.method} request - Path: ${req.path}`;
    logger.info(logMessage);
  }

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/user", require("./src/routes/authRoutes"));

// swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/apidocjs", express.static(path.join(__dirname, "apidoc")));

let port = 9999;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
