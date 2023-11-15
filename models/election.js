"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Election.belongsTo(models.OVAdmin, {
        foreignKey: "ovadminId",
        onDelete: "CASCADE",
      });
      Election.hasMany(models.Question, {
        foreignKey: "electionId",
        onDelete: "cascade",
      });
      Election.hasMany(models.Voter, {
        foreignKey: "electionId",
        onDelete: "cascade",
      });
    }
    static addTodo({ title, dueDate, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        userId: userId,
        completed: false,
      });
    }

    static addElection({
      electionName,
      electionDescription,
      status,
      ovadminId,
    }) {
      return this.create({
        electionName: electionName,
        electionDescription: electionDescription,
        status: status,
        ovadminId: ovadminId,
      });
    }

    static async newElection(ovadminId) {
      return await Election.findAll({
        where: {
          ovadminId: ovadminId,
          status: false,
          startDate: null,
          endDate: null,
        },
      });
    }

    static async activeElection(ovadminId) {
      return await Election.findAll({
        where: {
          ovadminId: ovadminId,
          status: true,
          endDate: null,
        },
      });
    }

    static async closedElection(ovadminId) {
      return await Election.findAll({
        where: {
          ovadminId: ovadminId,
          status: true,
          endDate: {
            [Op.lte]: new Date().toLocaleDateString("en-ca"),
          },
        },
      });
    }
  }
  Election.init(
    {
      electionName: DataTypes.STRING,
      electionDescription: DataTypes.TEXT,
      status: DataTypes.BOOLEAN,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Election",
    },
  );
  return Election;
};
