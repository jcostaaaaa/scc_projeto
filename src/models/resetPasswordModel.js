"use strict";
const mongoose = require("mongoose");

const { Schema } = mongoose;

const requestPasswordChangeSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
    },
    expiryTime: {
      type: Date,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User", 
    },
  },
  {
    collection: "resetPassword", 
  }
);

const ResetPassword = mongoose.model(
  "ResetPassword",
  requestPasswordChangeSchema
);

module.exports = ResetPassword;
