// eslint-disable-next-line no-unused-vars
const e = require("connect-flash");
const { Question, Election, Option } = require("../models");

class ElectionService {
  constructor() {
    this.elecQuestionAndOptions = [];
  }

  async viewElectionQuestions(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      const questions = await election.getQuestions();
      for (let question of questions) {
        const options = await question.getOptions();
        this.elecQuestionAndOptions.push({
          question: question,
          options: options,
        });
      }
      return this.elecQuestionAndOptions;
    } catch (error) {
      console.log(error);
    }
  }

  static async getVotersByElectionId(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      const voters = await election.getVoters();
      return voters;
    } catch (error) {
      throw new Error(`Could not get voters: ${error.message}`);
    }
  }

  static async getElectionById(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      return election;
    } catch (error) {
      throw new Error(`Could not get election: ${error.message}`);
    }
  }

  static async getQuestionById(questionId) {
    try {
      const question = await Question.findByPk(questionId);
      return question;
    } catch (error) {
      throw new Error(`Could not get question: ${error.message}`);
    }
  }

  static async addQuestionToElection(
    electionId,
    questionText,
    questionDescription,
  ) {
    try {
      const election = await Election.findByPk(electionId);
      const question = await Question.create({
        qsText: questionText,
        description: questionDescription,
      });
      await election.addQuestion(question);
      return question;
    } catch (error) {
      throw new Error(`Could not add question: ${error.message}`);
    }
  }

  static async addOptionToQuestion(questionId, optionText) {
    try {
      const question = await Question.findByPk(questionId);
      const option = await Option.create({
        optText: optionText,
      });
      await question.addOption(option);
      return option;
    } catch (error) {
      throw new Error(`Could not add option: ${error.message}`);
    }
  }

  // launching an election

  async launchPreviewElection(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      // run Luanch Checks on election
      // check if election is already active or closed
      if (election.status === true) {
        throw new Error("Election is already active");
      }
      //check if election has questions
      const questions = await election.getQuestions();
      if (questions.length === 0) {
        throw new Error(
          "Election has No Questions, Please add atleast a question",
        );
      }
      //check if election has voters
      const voters = await election.getVoters();
      if (voters.length === 0) {
        throw new Error(
          "Election has No Voters, Please assign atleast a voter",
        );
      }
      //check if election has questions with aleast two options respectively
      for (let question of questions) {
        if ((await question.countOptions()) < 2) {
          throw new Error("Election has a question with less than two options");
        }
      }
      return election;
    } catch (error) {
      throw new Error(`Could not launch election: ${error.message}`);
    }
  }

  static async launchConfirmElection(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      election.status = true;
      election.startDate = new Date();
      await election.save();
      return election;
    } catch (error) {
      throw new Error(`Could not launch election: ${error.message}`);
    }
  }

  static async deleteElection(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      await election.destroy();
      return election;
    } catch (error) {
      throw new Error(`Could not delete election: ${error.message}`);
    }
  }

  static async addElection(electionName, electionDescription, ovadminId) {
    try {
      const election = await Election.create({
        electionName: electionName,
        electionDescription: electionDescription,
        status: false,
        ovadminId: ovadminId,
      });
      return election;
    } catch (error) {
      throw new Error(`Could not add election: ${error.message}`);
    }
  }

  async checkElectionLaunchable(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      // run Luanch Checks on election
      // check if election is already active or closed
      if (election.status === true) {
        return true;
      }
      //check if election has questions or voters
      const questions = await election.getQuestions();
      if (
        questions.length === 0 ||
        (await election.getVoters().length) === 0 ||
        questions === null
      ) {
        return false;
      }
      //check if election has questions with aleast two options respectively
      for (let question of questions) {
        if ((await question.countOptions()) < 2) {
          return false;
        }
      }
      return true;
    } catch (error) {
      throw new Error(`Could not find election: ${error.message}`);
    }
  }
}

module.exports = ElectionService;
