const mongoose = require("mongoose");
const schema = mongoose.Schema;
const userSchema = new schema(
  {
    id: {
      type: String,
      autoIncrement: true,
      allowNull: false,
    },
    username: {
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
    image: {
      data: String, 
      contentType: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      required: false,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    nif: {
      type: String,
      required: false,
    },
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
