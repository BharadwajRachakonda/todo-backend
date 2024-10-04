const mongoose = require("mongoose");
const mongodb_uri = "mongodb://localhost:27017/ToDo";

const connection = async () => {
  await mongoose
    .connect(mongodb_uri)
    .then(() => console.log("Connected to Mongo Successfully"))
    .catch((err) => console.log(err));
};

module.exports = connection;
