const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $('[name="_csrf"]').val();
}
// eslint-disable-next-line no-unused-vars
const login = async (agent, username, password) => {
  let res = await agent.get("/admin-login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Online Voting Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(32564, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Create a admin user to setup elections", async () => {
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/adminUsers").send({
      firstName: "peter",
      lastName: "parker",
      email: "spider@man.com",
      password: "hashedPassword",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Signout from user account", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });
});
