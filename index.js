const express = require("express");
var cors = require("cors");
const dbconnection = require("./database/connection");
const app = express();
const port = 5000;

dbconnection();

//Redeploying
//Middle Wear
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// );
// app.options("*", cors());
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/authentication", require("./routes/auth"));
app.use("/api/collection", require("./routes/collection"));

app.get("/", (req, res) => {
  res.send("No route found");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

module.exports = app;
