const { Voter, Election } = require("../models");

class VoterService {
  constructor() {
    this.elecVoters = [];
  }

  static async getVoterById(voterId) {
    try {
      const voter = await Voter.findByPk(voterId);
      return voter;
    } catch (error) {
      throw new Error(`Could not get voter: ${error.message}`);
    }
  }

  static async deleteVoter(voterId) {
    try {
      const voter = await Voter.findByIdAndDelete(voterId);
      return voter;
    } catch (error) {
      throw new Error(`Could not delete voter: ${error.message}`);
    }
  }

  async viewElectionVoters(electionId) {
    try {
      const election = await Election.findByPk(electionId);
      this.elecVoters = await election.getVoters();
      return this.elecVoters;
    } catch (error) {
      console.log(error);
    }
  }

  // TODO: find a way to add voters to an election after checking if voter exists
  async checkVoter(electionId, voterId) {
    try {
      await this.viewElectionVoters(electionId);
      await this.elecVoters.forEach(async (voter) => {
        if (voter.vID === voterId) {
          console.log("vid:" + voter.vID + "requ vid" + voterId);
          return true;
        }
      });
      return false;
    } catch (error) {
      console.log(error);
    }
  }

  static async addVoter(electionId, voterId, password) {
    try {
      const election = await Election.findByPk(electionId);
      const voter = await Voter.create({
        vID: voterId,
        password: password,
      });
      await election.addVoter(voter);
      return voter;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = VoterService;
