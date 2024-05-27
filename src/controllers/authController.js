const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Login = require("../models/login");
const apiResponse = require("../utils/response");
const { generateAccessToken } = require("../utils/auth");
const { addToBlacklist } = require("../utils/blacklist");

exports.recoverPassword = async (req, res) => {
  const { newPassword } = req.body;
  const tokenWithBearer = req.headers["authorization"];

  try {
    if (!newPassword) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "All fields are required")
      );
    }

    if (newPassword.length < 6) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(
          400,
          "Password must be at least 6 characters"
        )
      );
    }

    const token = tokenWithBearer.split(" ")[1];
    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    const idUserLogged = user.id;

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const loginToUpdate = await User.findOne({ _id: idUserLogged });

    if (loginToUpdate != null) {
      const filter = { _id: loginToUpdate.loginId };
      const update = { password: newHashedPassword };

      const userUpdated = await Login.findOneAndUpdate(filter, update, {
        new: true,
      });

      if (userUpdated) {
        return apiResponse.send(
          res,
          apiResponse.createModelRes(200, "Password changed successfully")
        );
      } else {
        return apiResponse.send(
          res,
          apiResponse.createModelRes(400, "Failed to update password")
        );
      }
    } else {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "User not found")
      );
    }
  } catch (err) {
    console.error(err);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Password change error")
    );
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const passwordError = apiResponse.createModelRes(
      400,
      "all fields are required"
    );
    return apiResponse.send(res, passwordError);
  }

  const user = await Login.findOne({ email }).lean();

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
    const emailUser = email;
    const nameUser = userLogged.firstName + " " + userLogged.lastName;

    try {
      const accessToken = generateAccessToken({
        id,
        username,
        role,
        idLogin,
        emailUser,
        nameUser,
      });
      const loginDone = apiResponse.createModelRes(200, "login success", {
        accessToken,
      });
      console.log(email);
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

  // Validate required fields
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

  // Validate password length
  if (password.length < 6) {
    const passwordLengthError = apiResponse.createModelRes(
      400,
      "The password must be at least 6 characters"
    );
    return apiResponse.send(res, passwordLengthError);
  }

  // Validate email format
  if (!email.includes("@")) {
    const errorEmail = apiResponse.createModelRes(400, "Invalid email");
    return apiResponse.send(res, errorEmail);
  }

  try {
    const existingLogin = await Login.findOne({ email });
    if (existingLogin) {
      return res.json({
        message: "Email already exists",
        status: 400,
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({
        message: "Username already exists",
        status: 400,
      });
    }

    const passwordEncrypted = await bcrypt.hash(password, 10);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const newLogin = await Login.create(
        [
          {
            email,
            password: passwordEncrypted,
          },
        ],
        { session }
      );

      console.log(newLogin);

      const newUser = await User.create(
        [
          {
            username,
            firstName,
            lastName,
            birthdate: birthdateDateObject,
            role,
            loginId: newLogin[0]._id,
          },
        ],
        { session }
      );

      console.log(newUser, newLogin);

      await session.commitTransaction();
      session.endSession();

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
  } catch (err) {
    console.error(err);
    return res.json({
      message: "Server error",
      status: 500,
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

    const loginOfUser = await Login.findById(user.loginId);

    if (!loginOfUser) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(404, "This user does not have login", {})
      );
    }
    user.firstName = firstName;
    user.lastName = lastName;
    user.username = username;
    loginOfUser.email = email;

    await user.save();
    await loginOfUser.save();

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
  try {
    const tokenWithBearer = req.headers["authorization"];

    const token = tokenWithBearer.split(" ")[1];

    if (!token) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(
          401,
          "Unauthorized for this endpoint, check the token",
          {}
        )
      );
    }

    const rolesToFind = ["admin", "estafeta", "customer"];
    const results = {};

    for (let i = 0; i < rolesToFind.length; i++) {
      const role = rolesToFind[i];
      const filter = { role };
      const users = await User.find(filter);
      const userCount = users.length;

      results[role] = {
        users,
        userCount,
      };
    }
    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "Users found", results)
    );
  } catch (error) {
    console.error(error);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Internal Server Error", {})
    );
  }
};
