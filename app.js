const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const { OVAdmin } = require("./models");
const cookieParser = require("cookie-parser");
const path = require("path");

//authentication
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const flash = require("connect-flash");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const saltRounds = 10;

//middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("c00kie_secret_12345"));
app.use(csrf("0123456789iamthesecret9876543210", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-secret-key-176172672",
    cookie: { maxAge: 24 * 60 * 60000 },
  })
);
//connect - flash middleware
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

//passport.js initialization
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "emailAddress",
      passwordField: "password",
    },
    (username, password, done) => {
      console.log("Authenticating Admin: ", username);
      OVAdmin.findOne({ where: { emailAddress: username } })
        .then(async (adminuser) => {
          const matchPassword = await bcrypt.compare(
            password,
            adminuser.password
          );
          if (matchPassword) {
            return done(null, adminuser);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch((error) => {
          return done(null, false, {
            message: "Account doesn't exist, Please Signup",
          });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user: ", user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  OVAdmin.findByPk(id)
    .then((adminuser) => {
      done(null, adminuser);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", function (request, response) {
  response.render("index", {
    title: "Online Voting App",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "Sign-up",
    csrfToken: request.csrfToken(),
  });
});

app.post("/adminUsers", async function (request, response) {
  try {
    console.log("Creating Admin User: ", request.body.firstName);
    const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
    const firstName = request.body.firstName;
    const lastName = request.body.lastName;
    const emailAddress = request.body.emailAddress;

    // First Name and Last Name must be at least 2 characters long
    if (request.body.firstName.length < 2 || request.body.lastName.length < 2) {
      request.flash(
        "error",
        "First Name and Last Name must be at least 2 characters long"
      );
      return response.redirect("/signup");
    }

    if (request.body.password.length < 4) {
      request.flash("error", "Password must be at least 4 characters long");
      return response.redirect("/signup");
    }

    const adminUser = await OVAdmin.create({
      firstName: firstName,
      lastName: lastName,
      emailAddress: emailAddress,
      password: hashedPassword,
    });
    request.login(adminUser, (error) => {
      if (error) {
        return console.log(error);
      }
      response.redirect("/elections");
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      request.flash(
        "error",
        "Email already exists, Please login or signup with a different email"
      );
      return response.redirect("/signup");
    }
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/admin-login", (request, response) => {
  response.render("adminLogin", {
    csrfToken: request.csrfToken(),
    title: "Login",
  });
});

app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    if (request.accepts("html")) {
      response.render("elections", {
        title: "Online Voting App",
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({ status: "Not Acceptable" });
    }
  }
);

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/admin-login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/elections");
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

module.exports = app;
