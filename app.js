const express = require("express");
const app = express();
const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (request, response) {
  response.render("index");
});

app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "Sign-up",
  });
});

app.get("/admin-login", (request, response) => {
  response.render("adminLogin", {
    title: "Login",
  });
});

module.exports = app;
