const express = require("express");
const app = express();

app.get("/", function (request, response) {
  response.send("Welcome to Online Voting Platform!");
});

module.exports = app;
