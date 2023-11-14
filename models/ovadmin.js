"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class OVAdmin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  OVAdmin.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      emailAddress: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "OVAdmin",
    },
  );
  return OVAdmin;
};
