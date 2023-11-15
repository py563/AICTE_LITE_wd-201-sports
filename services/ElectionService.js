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
}

module.exports = ElectionService;
