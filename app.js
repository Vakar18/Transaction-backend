const express = require("express");
const connectDB = require("./config/db");
const transactionRoutes = require("./routes/transactionRoutes");
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use("/api", transactionRoutes);

connectDB();

module.exports = app;
