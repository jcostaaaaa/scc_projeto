'use strict';


const mongoose = require("mongoose");

const schema = mongoose.Schema;
const loginSchema = new schema(
  {
    id: {
      type: schema.Types.ObjectId,
      autoIncrement: true,
      allowNull: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  { collection: "login" }
);
const Login = mongoose.model("Login", loginSchema);

module.exports = Login;
