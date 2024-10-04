const mongoose = require("mongoose");

const { Schema } = mongoose;

const TodoSchema = new Schema({
  author: {
    type: String,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  write_access: {
    type: Object,
    default: [],
  },
  read_access: {
    type: Object,
    default: [],
  },
  todos: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model("Todo", TodoSchema);
