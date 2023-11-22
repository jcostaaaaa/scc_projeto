const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Login = require("../models/login");
const apiResponse = require("../utils/response");
const { certifyAccessToken } = require("../utils/auth");

exports.changePassword = async (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body;
    certifyAccessToken(token);

    if (!oldPassword || !newPassword) {
      return apiResponse.send(res, apiResponse(400, "all fields are required"));
    }

    if (newPassword.length < 6) {
      return apiResponse.send(
        res,
        apiResponse(400, "password must be at least 6 characters")
      );
    }

    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    const _id = user.id;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne({ _id }, { password: hashedPassword });

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
//console.log(username);
 // console.log(password);
  if (!username || !password) {
    const passwordError = apiResponse(400, "all fields are required");
    return apiResponse.send(res, passwordError);
  }

  const user = await Login.findOne({ username }).lean();
 // console.log(user);
  if (!user) {
    const UserNotFound = apiResponse.createModelRes(404, "user not found");
    return apiResponse.send(res, UserNotFound);
  }
  if (await bcrypt.compare(password, user.password)) {
    const idUserLogged = user._id;
    const userLogged = await User.findOne({ loginId: idUserLogged }).lean();

    try {
      const token = jwt.sign(
        {
          id: userLogged.id,
          username: userLogged.username,
          role: userLogged.role,
        },
        process.env.TOKEN_SECRET,
        { expiresIn: "24h" }
      );
      const loginDone = apiResponse.createModelRes(200, "login success", {
        token,
      });

      //console.log(userLogged);
      //console.log(user.username);
      //console.log(userLogged.role);
      //console.log(userLogged._id);
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

exports.deleteUser = async (id) => {
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      const errorFind = apiResponse.createModelRes(404, "UserNotFound", {});
      return apiResponse.send(res, errorFind);
    }

    const deletedResponse = apiResponse.createModelRes(200, "UserDeleted", {});
    return apiResponse.send(res, deletedResponse);
  } catch (err) {
    console.error(err);

    const deletedErrorResponse = apiResponse.createModelRes(
      400,
      "Eror deleting user",
      {}
    );
    return apiResponse.send(res, deletedErrorResponse);
  }
};

exports.editUser = async (res, id, userData) => {
  try {
    const user = await User.findById(id);

    if (!user) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(404, "UserNotFound", {})
      );
    }

    user.firstName = userData.firstName || user.firstName;
    user.lastName = userData.lastName || user.lastName;
    user.email = userData.email || user.email;
    user.username = userData.username || user.username;
    user.birthdate = userData.birthdate || user.birthdate;

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
  const { token } = req.body;
};
