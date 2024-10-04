const express = require("express");
const fetchUser = require("../middleware/fetchUser");
const Todo = require("../database/models/Schemas/Todo");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchCollection = require("../middleware/fetchCollection");
const { Collection } = require("mongoose");

const JWT_SECRET = "Bharat";
const router = express.Router();

const validation = () => {
  return [
    body("title", "Title length must be at least 4").isLength({ min: 4 }),
    body(
      "password",
      "Note: Password must contain at least four characters and at least each of a Lower Case, Upper Case, Number, Symbols"
    ).isStrongPassword({
      minLength: 4,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    }),
  ];
};

// ROUTE 1 : Get all collections --> /api/collection/fetchallcollections
router.get("/fetchallcollections", fetchUser, async (req, res) => {
  try {
    const collections = await Todo.find({ author: req.user.name });
    res.json(collections);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ errors: "Some Error Occurred" });
  }
});

// ROUTE 2 : Add a collection --> /api/collection/addcollection
router.post("/addcollection", fetchUser, validation(), async (req, res) => {
  try {
    const { title, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const salt = await bcrypt.genSalt(10);

    const secPass = await bcrypt.hash(password, salt);

    const collection = await Todo.create({
      title,
      password: secPass,
      author: req.user.name,
      write_access: {},
      read_access: {},
      todos: {},
    });

    const data = {
      collection: {
        id: collection.id,
        author: collection.author,
      },
    };

    const authToken = jwt.sign(data, JWT_SECRET);

    res.json({ authToken });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ errors: "Collection already exists" });
    }
    console.error(error.message);
    res.status(500).json({ errors: "Some Error Occurred" });
  }
});

// ROUTE 3 : collection login --> /api/collection/collectionlogin
router.post(
  "/collectionlogin",
  fetchUser,
  [
    body("title", "Title length must be at least 4").isLength({ min: 4 }),
    body(
      "password",
      "Note: Password must contain at least four characters and at least each of a Lower Case, Upper Case, Number, Symbols"
    ).isStrongPassword({
      minLength: 4,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    }),
    body("author").isLength({ min: 4 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, password, author } = req.body;

    try {
      let collection = await Todo.findOne({ author, title });
      if (!collection) {
        return res.status(400).json({ errors: "Login with right credentials" });
      }

      const passwordCompare = await bcrypt.compare(
        password,
        collection.password
      );

      if (!passwordCompare) {
        return res.status(400).json({ errors: "Login with right credentials" });
      }

      const data = {
        collection: {
          id: collection.id,
          author: collection.author,
        },
      };

      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ authToken });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ errors: "Some Error Occured" });
    }
  }
);

// ROUTE 4 : Access a collection --> /api/collection/getcollection
router.post(
  "/getcollection",
  fetchUser,
  fetchCollection,
  validation(),
  async (req, res) => {
    try {
      const collectionId = req.collection.id;
      const collection = await Todo.findById(collectionId).select("-password");
      if (
        req.user.name !== collection.author.toString() &&
        !collection.read_access.includes(req.user.name) &&
        !collection.write_access.includes(req.user.name)
      ) {
        console.log(req.user.name === collection.author.toString());

        return res.status(401).json({ errors: "You don't have access" });
      }
      res.send(collection);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ errors: "Some Error Occured" });
    }
  }
);

// ROUTE 5 : Update (or) add a todo --> /api/collection/getcollection/addtodo

router.post(
  "/getcollection/addtodo",
  fetchUser,
  fetchCollection,
  [
    body("todo_title", "Title length must be at least 4 characters").isLength({
      min: 4,
    }),
    body("value", "Value can't be empty").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { todo_title, value } = req.body;
      const collectionId = req.collection.id;

      const collection = await Todo.findById(collectionId).select("-password");

      if (!collection) {
        return res.status(404).json({ errors: "Collection not found" });
      }

      if (
        req.user.name !== collection.author.toString() &&
        !collection.write_access.includes(req.user.name)
      ) {
        return res
          .status(401)
          .json({ errors: "You don't have access to write" });
      }

      const update = {};
      update[`todos.${todo_title}`] = value;

      const updatedCollection = await Todo.findByIdAndUpdate(
        collectionId,
        { $set: update },
        { new: true }
      ).select("-password");

      res.json(updatedCollection);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ errors: "Server error" });
    }
  }
);

// ROUTE 6 : add readers and writers --> /api/collection/getcollection/updateaccess

router.post(
  "/getcollection/updateaccess",
  fetchUser,
  fetchCollection,
  async (req, res) => {
    try {
      const collectionId = req.collection.id;
      const collection = await Todo.findById(collectionId).select("-password");

      if (req.user.name !== collection.author.toString()) {
        return res
          .status(401)
          .json({ errors: "Only the author has the access to update" });
      }

      const { read_access: newReader, write_access: newWriter } = req.body;

      if (newReader && !collection.read_access.includes(newReader)) {
        collection.read_access = [...collection.read_access, newReader];
      }

      if (newWriter && !collection.write_access.includes(newWriter)) {
        collection.write_access = [...collection.write_access, newWriter];
      }

      await collection.save();

      res.json(collection);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ errors: "Some error occurred" });
    }
  }
);

// ROUTE 7 : delete a todo --> /api/collection/getcollection/deletetodo

router.delete(
  "/getcollection/deletetodo",
  fetchUser,
  fetchCollection,
  [
    body("todo_title", "Title length must be at least 4 characters").isLength({
      min: 4,
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { todo_title } = req.body;
      const collectionId = req.collection.id;
      const collection = await Todo.findById(collectionId).select("-password");

      if (!collection) {
        return res.status(404).json({ errors: "Collection not found" });
      }

      if (req.user.name !== collection.author.toString()) {
        return res
          .status(401)
          .json({ errors: "Only the author has the access to update" });
      }

      if (!collection.todos || !collection.todos.hasOwnProperty(todo_title)) {
        return res
          .status(404)
          .json({ errors: "No such ToDo exists in the Collection" });
      }

      const update = {};
      update[`todos.${todo_title}`] = "";

      await Todo.updateOne({ _id: collectionId }, { $unset: update });

      const updatedCollection = await Todo.findById(collectionId).select(
        "-password"
      );

      return res.json({ collection: updatedCollection });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ errors: "Server Error" });
    }
  }
);

// ROUTE 8 : delete a  collection --> /api/collection/deletecollection

router.delete(
  "/deletecollection",
  fetchUser,
  [
    body("title", "Title length must be at least 4 characters").isLength({
      min: 4,
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title } = req.body;
      const userId = req.user.name;

      const result = await Todo.deleteOne({ author: userId, title: title });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          errors:
            "Collection not found or you don't have permission to delete it",
        });
      }

      return res.json({ message: "deleted successfully" });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ errors: "Server Error" });
    }
  }
);

module.exports = router;
