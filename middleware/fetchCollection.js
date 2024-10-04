const jwt = require("jsonwebtoken");

export const maxDuration = 300;

const fetchCollection = (req, res, next) => {
  const token = req.header("auth-token-collection");
  if (!token) {
    return res
      .status(401)
      .send({ error: "Please authenticate using a valid token c" });
    console.log("Token Error: ", token);
  }
  try {
    const data = jwt.verify(token, "Bharat");
    req.collection = data.collection;
  } catch (error) {
    return res
      .status(401)
      .send({ error: "Please authenticate using a valid token c" });
    console.log(error);
  }

  next();
};

module.exports = fetchCollection;
