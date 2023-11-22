"use strict";
//database schema
const mongoose = require("mongoose");
const schema = mongoose.Schema;
const userSchema = new schema(
  {
    id: {
      type: String,
      autoIncrement: true,
      allowNull: false,
    },
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "estafeta"],
      default: "customer",
    },
    loginId: {
      type: schema.Types.ObjectId,
      required: true,
    },
  },
  { collection: "users" }
);
const User = mongoose.model("User", userSchema);

module.exports = User;
