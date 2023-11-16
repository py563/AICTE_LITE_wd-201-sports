// eslint-disable-next-line no-unused-vars
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
}

module.exports = ElectionService;
