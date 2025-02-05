require("dotenv").config();
const express = require("express");
const { check, validationResult } = require("express-validator");
const connection = require("./db");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/users", (req, res) => {
  connection.query("SELECT * FROM user", (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

const userValidationMiddlewares = [
  check("email").isEmail(),
  check("password").isLength({ min: 8 }),
  check("name").isLength({ min: 2 }),
];

app.post("/api/users", userValidationMiddlewares, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return connection.query(
    "INSERT INTO user SET ?",
    req.body,
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      return connection.query(
        "SELECT * FROM user WHERE id = ?",
        results.insertId,
        (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
          const insertedUser = records[0];
          const { password, ...user } = insertedUser;
          const host = req.get("host");
          const location = `http://${host}${req.url}/${user.id}`;
          return res.status(201).set("Location", location).json(user);
        }
      );
    }
  );
});

app.put("/api/users/:id", userValidationMiddlewares, (req, res) => {
  const idUser = req.params.id;
  const newUser = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return connection.query(
    "UPDATE user SET ? WHERE id = ?",
    [newUser, idUser],
    (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "Email already exists",
          });
        }
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      return connection.query(
        "SELECT * FROM user WHERE id = ?",
        idUser,
        (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
          const insertedUser = records[0];
          const { password, ...user } = insertedUser;
          const host = req.get("host");
          const location = `http://${host}${req.url}/${user.id}`;
          return res.status(201).set("Location", location).json(user);
        }
      );
    }
  );
});

app.listen(process.env.PORT, (err) => {
  if (err) {
    throw new Error("Something bad happened...");
  }

  console.log(`Server is listening on ${process.env.PORT}`);
});
