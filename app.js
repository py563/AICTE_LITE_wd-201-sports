// Description: This file contains the main application logic for the Online Voting App
const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const { OVAdmin, Election } = require("./models");
const ElectionService = require("./services/ElectionService");
const cookieParser = require("cookie-parser");
const path = require("path");

// authentication
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const flash = require("connect-flash");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const VoterService = require("./services/VoterService");
const saltRounds = 10;

// middleware
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
  }),
);
// connect - flash middleware
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

// passport.js initialization
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
            adminuser.password,
          );
          if (matchPassword) {
            return done(null, adminuser);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        // eslint-disable-next-line no-unused-vars
        .catch((error) => {
          return done(null, false, {
            message: "Account doesn't exist, Please Signup",
          });
        });
    },
  ),
);

passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
      passReqToCallback: true,
    },
    (request, username, password, done) => {
      VoterService.getVoterByVoterId(username)
        .then(async function (user) {
          if (!user) {
            return done(null, false, {
              message:
                "An Account with this voter id does not exist or not assigned for this election id",
            });
          }
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            session.role = "voter";
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          console.log("Could not get voter:" + error.message);
          return done(null, false, { message: "Invalid Voter-Id" });
        });
    },
  ),
);

passport.serializeUser((user, done) => {
  console.log("Serializing user: ", user);
  done(null, user.id);
});

passport.deserializeUser((req, id, done) => {
  if (session.role === "voter") {
    VoterService.getVoterById(id)
      .then((user) => {
        done(null, user, req);
      })
      .catch((error) => {
        done(error, null);
      });
  } else {
    OVAdmin.findByPk(id)
      .then((adminuser) => {
        done(null, adminuser);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

app.get("/", function (request, response) {
  response.render("index", {
    title: "Online Voting App",
    csrfToken: request.csrfToken(),
    loggedIn: false,
  });
});

app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "Sign-up",
    csrfToken: request.csrfToken(),
    loggedIn: false,
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
    if (firstName.length < 2 || lastName.length < 2) {
      request.flash(
        "error",
        "First Name and Last Name must be at least 2 characters long",
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
        "Email already exists, Please login or signup with a different email",
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
    loggedIn: false,
  });
});

app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    console.log("Admin User: ", request.user.firstName);
    const loggedInUser = request.user.id;
    const welcomeMessage = "Welcome " + request.user.firstName;
    const newElections = await Election.newElection(loggedInUser);
    const activeElections = await Election.activeElection(loggedInUser);
    const completedElections = await Election.closedElection(loggedInUser);
    if (request.accepts("html")) {
      response.render("elections", {
        title: "Online Voting App",
        csrfToken: request.csrfToken(),
        welcomeMessage: welcomeMessage,
        loggedIn: true,
        newElections: newElections,
        activeElections: activeElections,
        completedElections: completedElections,
      });
    } else {
      response.json({ Message: welcomeMessage, Status: "Signed In" });
    }
  },
);

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/admin-login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/elections");
  },
);

app.get(
  "/create-election",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    console.log("Admin User: ", request.user.firstName);
    const welcomeMessage = "Welcome " + request.user.firstName;
    if (request.accepts("html")) {
      response.render("createElection", {
        title: "Create Election",
        csrfToken: request.csrfToken(),
        welcomeMessage: welcomeMessage,
        loggedIn: true,
      });
    } else {
      response.json({ Message: welcomeMessage, Status: "Signed In" });
    }
  },
);

app.post(
  "/create-election",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    console.log(
      "Creating Election for: ",
      request.user.firstName + " with title as " + request.body.electionName,
    );
    const loggedInUser = request.user.id;
    // const welcomeMessage = "Welcome " + request.user.firstName;
    const electionName = request.body.electionName;
    const electionDescription = request.body.electionDescription;
    if (!electionName || electionName.length < 3) {
      request.flash(
        "error",
        "Please make sure you enter title of the election and it is at least 3 characters long",
      );
      return response.redirect("/create-election");
    }
    if (!electionDescription || electionDescription.length < 3) {
      request.flash(
        "error",
        "Please make sure you enter description of the election and it is at least 3 characters long",
      );
      return response.redirect("/create-election");
    }
    try {
      const election = await ElectionService.addElection(
        electionName,
        electionDescription,
        loggedInUser,
      );
      console.log("Election created: ", election.id);
      return response.redirect("/elections");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  },
);

app.get(
  "/edit-election/:id",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    console.log("Admin User: ", request.user.firstName);
    const welcomeMessage = "Welcome " + request.user.firstName;
    const electionId = request.params.id;
    const electionServiceInstance = new ElectionService();
    const isLaunchable =
      await electionServiceInstance.checkElectionLaunchable(electionId);
    const activeQuestions =
      await electionServiceInstance.viewElectionQuestions(electionId);
    const activeVoters =
      await ElectionService.getVotersByElectionId(electionId);
    console.log("Active Questions: ", activeQuestions.length);
    //todo: add flash message for launched election check
    if (request.accepts("html")) {
      response.render("editElection", {
        title: "Edit Elections",
        csrfToken: request.csrfToken(),
        welcomeMessage: welcomeMessage,
        loggedIn: true,
        electionId: electionId,
        isLaunchable: isLaunchable,
        activeQuestions: activeQuestions,
        activeVoters: activeVoters,
      });
    } else {
      response.json({ Message: welcomeMessage, Status: "Signed In" });
    }
  },
);

app.get(
  "/edit-election/:id/add-question",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    const welcomeMessage = "Welcome " + request.user.firstName;
    response.render("addQuestion", {
      title: "Add Question",
      csrfToken: request.csrfToken(),
      welcomeMessage: welcomeMessage,
      loggedIn: true,
      electionId: electionId,
    });
  },
);

app.post(
  "/edit-election/:id/add-question",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    const questionText = request.body.qsText;
    const questionDescription = request.body.description;
    const question = await ElectionService.addQuestionToElection(
      electionId,
      questionText,
      questionDescription,
    );
    console.log("Question added: ", question.id);
    response.redirect("/edit-question/" + question.id + "/add-option");
  },
);

app.get("/edit-question/:id/add-option", async function (request, response) {
  const questionId = request.params.id;
  const question = await ElectionService.getQuestionById(questionId);
  const addedOptions = await question.getOptions();
  response.render("addOptions", {
    title: "Add Options",
    welcomeMessage: "Welcome " + request.user.firstName,
    csrfToken: request.csrfToken(),
    loggedIn: true,
    question: question,
    addedOptions: addedOptions,
  });
});

app.post(
  "/edit-question/:id/add-option",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const questionId = request.params.id;
    const optionText = request.body.optText;
    const option = await ElectionService.addOptionToQuestion(
      questionId,
      optionText,
    );
    console.log("Option added: ", option.id);
    response.redirect("/edit-question/" + questionId + "/add-option");
  },
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

// voting routes

app.get("/voter-login", (request, response) => {
  response.render("voterLogin", {
    csrfToken: request.csrfToken(),
    title: "Voter Login",
    loggedIn: false,
  });
});

app.post(
  "/voter-session",
  passport.authenticate("voter-local", {
    failureRedirect: "/voter-login/",
    failureFlash: true,
  }),
  (request, response) => {
    console.log("Voter Login successful");
    response.redirect("/voter-home/");
  },
);

app.get(
  "/voter-home",
  connectEnsureLogin.ensureLoggedIn("/voter-login"),
  async function (request, response) {
    const welcomeMessage = "Welcome " + request.user.vID;
    response.render("voterHome", {
      title: "Voter Home",
      csrfToken: request.csrfToken(),
      welcomeMessage: welcomeMessage,
      loggedIn: true,
    });
  },
);

app.get(
  "/edit-election/:id/add-voter",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    const welcomeMessage = "Welcome " + request.user.firstName;
    const voterServiceInstance = new VoterService();
    const activeVoters =
      await voterServiceInstance.viewElectionVoters(electionId);
    response.render("addVoter", {
      title: "Add Voter",
      csrfToken: request.csrfToken(),
      welcomeMessage: welcomeMessage,
      loggedIn: true,
      electionId: electionId,
      countOfactiveVoters: activeVoters.length,
    });
  },
);

app.post(
  "/edit-election/:id/add-voter",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    try {
      console.log("Creating Voter: ", request.body.vID);
      const voterId = request.body.vID;
      if (voterId.length < 2) {
        request.flash(
          "error",
          "Voter ID or Name should be at least 2 characters long",
        );
        return response.redirect("/edit-election/" + electionId + "/add-voter");
      }

      if (request.body.password.length < 4) {
        request.flash("error", "Password must be at least 4 characters long");
        return response.redirect("/edit-election/" + electionId + "/add-voter");
      }

      const hashedPassword = await bcrypt.hash(
        request.body.password,
        saltRounds,
      );
      const voterServiceInstance = new VoterService();
      const voterExists = voterServiceInstance.checkVoter(electionId, voterId);
      console.log("voter exists: " + voterExists);
      if (voterExists === true) {
        request.flash("error", "Voter Already Exists");
        return response.redirect("/edit-election/" + electionId + "/add-voter");
      }
      const voterUser = await VoterService.addVoter(
        electionId,
        voterId,
        hashedPassword,
      );
      console.log("Voter created: ", voterUser.id);
      request.flash("success", "Voter added"); //Todo: add sucess flash message in UI
      return response.redirect("/edit-election/" + electionId + "/add-voter");
    } catch (error) {
      console.log(error);
      request.flash("error", "Cannot add voter, Please try again");
      return response.redirect("/edit-election/" + electionId + "/add-voter");
    }
  },
);

//delete voter
app.delete(
  "/edit-election/:id/delete-voter/:voterId",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    const voterId = request.params.voterId;
    try {
      const isVoterDeleted = VoterService.deleteVoter(electionId, voterId);
      console.log("Voter: " + voterId + "deleted: " + isVoterDeleted);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      request.flash("error", "Cannot delete voter, Please try again");
      response.status(422).json(error);
    }
  },
);

//delete question
app.delete(
  "/edit-election/:id/delete-question/:questionId",
  connectEnsureLogin.ensureLoggedIn("/admin-login"),
  async function (request, response) {
    const electionId = request.params.id;
    const questionId = request.params.questionId;
    try {
      const isQuestionDeleted = await ElectionService.deleteQuestion(
        electionId,
        questionId,
      );
      console.log("Question: " + questionId + "deleted: " + isQuestionDeleted);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      request.flash("error", "Cannot delete question, Please try again");
      response.status(422).json(error);
    }
  },
);

//delete option

//launching an election
app.get(
  "/launched-election/:id/",
  connectEnsureLogin.ensureLoggedIn("/voter-login/"),
  async function (request, response) {
    const electionId = request.params.id;
    const welcomeMessage = "Voter can view election with id";
    console.log("Voting for: ", request.params.id);
    response.render("voteElections", {
      title: "Voting",
      csrfToken: request.csrfToken(),
      welcomeMessage: welcomeMessage,
      loggedIn: true,
      electionId: electionId,
    });
  },
);

app.get(
  "/preview-election/:id/",
  connectEnsureLogin.ensureLoggedIn("/admin-login/"),
  async function (request, response) {
    const electionId = request.params.id;
    try {
      const electionServiceInstance = new ElectionService();
      const election =
        await electionServiceInstance.launchPreviewElection(electionId);
      const electionStatus = election.status;
      console.log("election status: " + electionStatus);
      const activeQuestions =
        await electionServiceInstance.viewElectionQuestions(electionId);
      const adminInfoMessage =
        "http://<server-url>:<port>/launched-election/" + electionId + "/";
      const welcomeMessage =
        "Hi (Voter Name), Vote here for Election No: " + electionId + ".";
      response.render("previewElection", {
        title: "Preview Elections",
        csrfToken: request.csrfToken(),
        adminInfoMessage: adminInfoMessage,
        welcomeMessage: welcomeMessage,
        loggedIn: true,
        electionId: electionId,
        currentElection: election,
        activeQuestions: activeQuestions,
      });
    } catch (error) {
      console.log(error);
      request.flash("error", error.message);
      return response.redirect("/edit-election/" + electionId + "/");
    }
  },
);

app.get(
  "/preview-election/:id/confirm-launch/",
  connectEnsureLogin.ensureLoggedIn("/admin-login/"),
  async function (request, response) {
    const electionId = request.params.id;
    try {
      const election = await ElectionService.launchConfirmElection(electionId);
      const electionStatusMessage =
        "Election with id:" + electionId + " Launched Successfully.";
      console.log("election status: " + electionStatusMessage);
      console.log("election start date: " + election.startDate);
      request.flash("success", electionStatusMessage);
      return response.redirect("/elections/");
    } catch (error) {
      console.log(error);
      request.flash("error", error.message);
      return response.redirect("/edit-election/" + electionId + "/");
    }
  },
);
module.exports = app;
