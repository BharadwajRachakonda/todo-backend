const { body, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const User = require("../database/models/Schemas/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middleware/fetchUser");

const JWT_SECRET = "Bharat";

export const maxDuration = 300;

//Create a user using: POST --> "api/authentication"

const validation = () => {
  return [
    body("name", "Note: Name must contain atleat be four letters")
      .isString()
      .isLength({ min: 4 }),

    body(
      "password",
      "Note: Password must contain atleast four characters and atleast each of a Lower Case, Upper Case, Number, Symbols"
    ).isStrongPassword({
      minLength: 4,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    }),
  ];
};

//ROUTE 1 : new user --> /api/authentication/createuser

router.post("/createuser", validation(), async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const salt = await bcrypt.genSalt(10);

    const secPass = await bcrypt.hash(req.body.password, salt);

    const user = await User.create({
      name: req.body.name,
      password: secPass,
    });

    const data = {
      user: {
        id: user.id,
        name: user.name,
      },
    };

    const authToken = jwt.sign(data, JWT_SECRET);

    res.json({ authToken });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ errors: "User already exists" });
    }

    console.error(error);

    res.status(500).json({ errors: "Server error" });
  }
});

//ROUTE 2 : user login --> /api/auth/login

router.post("/login", validation(), async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, password } = req.body;

  try {
    let user = await User.findOne({ name });
    if (!user) {
      return res.status(400).json({ errors: "Login with right credentials" });
    }

    const passwordCompare = await bcrypt.compare(password, user.password);

    if (!passwordCompare) {
      return res.status(400).json({ errors: "Login with right credentials" });
    }

    const data = {
      user: {
        id: user.id,
        name: user.name,
      },
    };
    const authToken = jwt.sign(data, JWT_SECRET);
    res.json({ authToken });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ errors: "Some Error Occured" });
  }
});

//ROUTE 3 : loggedin user details --> api/auth/getuser. --> Login required

router.post("/getuser", fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ errors: "Some Error Occured" });
  }
});

module.exports = router;
