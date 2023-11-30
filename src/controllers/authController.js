const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Login = require("../models/login");
const apiResponse = require("../utils/response");
const { generateAccessToken } = require("../utils/auth");
const { addToBlacklist } = require("../utils/blacklist");

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const tokenWithBearer = req.headers["authorization"];

    console.log(oldPassword);
    console.log(newPassword);
    console.log(tokenWithBearer);

    if (!oldPassword || !newPassword) {
      console.log("all fields are required");
      return apiResponse.send(res, apiResponse(400, "all fields are required"));
    }

    if (newPassword.length < 6) {
      console.log("password must be at least 6 characters");
      return apiResponse.send(
        res,
        apiResponse(400, "password must be at least 6 characters")
      );
    }

    const token = tokenWithBearer.split(" ")[1];

    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    console.log(user);
    const id = user.id;
    console.log(id);

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const filter = { _id: user?.idLogin };
    const update = { password: newHashedPassword };

    const UserUpdated = await Login.findOneAndUpdate(filter, update, {
      new: true,
    });

    console.log(UserUpdated);
    console.log(update.password);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "password changed")
    );
  } catch (err) {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "password change error")
    );
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const passwordError = apiResponse.createModelRes(400, "all fields are required");
    return apiResponse.send(res, passwordError);
  }

  const user = await Login.findOne({ username }).lean();

  if (!user) {
    const UserNotFound = apiResponse.createModelRes(404, "user not found");
    return apiResponse.send(res, UserNotFound);
  }
  if (await bcrypt.compare(password, user.password)) {
    const idUserLogged = user._id;
    const userLogged = await User.findOne({ loginId: idUserLogged }).lean();

    const id = userLogged._id;
    const username = user.username;
    const role = userLogged.role;
    const idLogin = user._id;

    try {
      const accessToken = generateAccessToken({
        id,
        username,
        role,
        idLogin,
      });
      const loginDone = apiResponse.createModelRes(200, "login success", {
        accessToken,
      });
      return apiResponse.send(res, loginDone);
    } catch (err) {
      const loginError = apiResponse.createModelRes(500, "login error");
      return apiResponse.send(res, loginError);
    }
  } else {
    const passwordError = apiResponse.createModelRes(
      400,
      "invalid credentials"
    );
    return apiResponse.send(res, passwordError);
  }
};
exports.register = async (req, res) => {
  console.log(req.body);

  const { username, email, password, firstName, lastName, birthdate, role } =
    req.body;
  const birthdateDateObject = new Date(birthdate);

  if (password.length < 6) {
    const passwordLengthError = apiResponse.createModelRes(
      400,
      "The password must be at least 6 characters"
    );
    return apiResponse.send(res, passwordLengthError);
  }
  if (!email.includes("@")) {
    const errorEmail = apiResponse.createModelRes(400, "Invalid email");
    return apiResponse.send(res, errorEmail);
  }

  if (
    !username ||
    !password ||
    !firstName ||
    !lastName ||
    !birthdate ||
    !email ||
    !role
  ) {
    return res.json({
      message: "All fields are required",
      status: 400,
    });
  }

  const passwordEncrypted = await bcrypt.hash(password, 10); // Number of times to encrypt

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newLogin = await Login.create(
      [
        {
          username,
          password: passwordEncrypted,
        },
      ],
      { session }
    );

    console.log(newLogin);

    const newUser = await User.create(
      [
        {
          email,
          firstName,
          lastName,
          birthdate: birthdateDateObject,
          role,
          loginId: newLogin[0]._id,
        },
      ],
      { session }
    );

    console.log(newLogin);

    await session.commitTransaction();
    session.endSession();

    console.log(newUser, newLogin);

    res.json({
      message: "Register successful",
      status: 200,
    });
  } catch (err) {
    console.error(err);

    await session.abortTransaction();
    session.endSession();

    if (err.code === 11000) {
      return res.json({
        message: "User already exists",
        status: 400,
      });
    }

    return res.json({
      message: "Register error",
      status: 400,
    });
  }
};

exports.deleteUser = async (req, res) => {
  const id = req.body.id;
  const tokenWithBearer = req.headers["authorization"];
  const token = tokenWithBearer.split(" ")[1];

  const userLogged = jwt.verify(token, process.env.TOKEN_SECRET);
  const roleOfUser = userLogged.role;
  console.log(roleOfUser);
  console.log(id);

  if (roleOfUser == "admin") {
    try {
      const user = await User.findById(id);
      console.log(user);
      if (!user) {
        const errorFind = apiResponse.createModelRes(404, "UserNotFound", {});
        return apiResponse.send(res, errorFind);
      }
      if (user.isDeleted == true) {
        const errorFind = apiResponse.createModelRes(
          404,
          "UserAlreadyDeleted",
          {}
        );
        return apiResponse.send(res, errorFind);
      }

      user.isDeleted = true;
      user.save();

      const deletedResponse = apiResponse.createModelRes(
        200,
        "UserDeleted",
        {}
      );
      return apiResponse.send(res, deletedResponse);
    } catch (err) {
      console.error(err);
    }
  }
  const deletedErrorResponse = apiResponse.createModelRes(
    400,
    "Unhauthorized",
    {}
  );
  return apiResponse.send(res, deletedErrorResponse);
};

exports.editUser = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  const token = tokenWithBearer.split(" ")[1];

  const { email, firstName, lastName, username } = req.body;
  console.log(email);
  console.log(firstName);
  console.log(lastName);
  console.log(username);

  const userLogged = jwt.verify(token, process.env.TOKEN_SECRET);

  try {
    const user = await User.findById(userLogged.id);

    if (!user) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(404, "UserNotFound", {})
      );
    }
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.username = username;

    await user.save();

    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "UserUpdated", {})
    );
  } catch (err) {
    console.error(err);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Error updating user", {})
    );
  }
};

exports.logout = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  console.log(tokenWithBearer);
  addToBlacklist(tokenWithBearer);
};

exports.getAllUsersByRole = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  const token = tokenWithBearer.split(" ")[1];
  const { role } = req.body;

  const userLogged = jwt.verify(token, process.env.TOKEN_SECRET);
  const roleOfUser = userLogged.role;

  if (roleOfUser == "admin" || roleOfUser == "estafeta") {
    const filter = role ? { role } : {};
    const users = await User.find(filter);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "Users", users)
    );
  } else {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(401, "Unauthorized for this endpoint", {})
    );
  }
};
