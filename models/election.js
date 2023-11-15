"use strict";
const { Model } = require("sequelize");
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
