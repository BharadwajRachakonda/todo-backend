const mongoose = require("mongoose");
const mongodb_uri =
  "mongodb+srv://rbharadwaj022:svJcNl3qOLY80Gfa@learningmongo.aspvevn.mongodb.net/ToDo";
export const maxDuration = 300;

const connection = async () => {
  await mongoose
    .connect(mongodb_uri)
    .then(() => console.log("Connected to Mongo Successfully"))
    .catch((err) => console.log(err));
};

module.exports = connection;
