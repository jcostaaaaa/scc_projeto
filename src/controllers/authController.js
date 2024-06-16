const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Login = require("../models/login");
const apiResponse = require("../utils/response");
const { generateAccessToken } = require("../utils/auth");
const { addToBlacklist } = require("../utils/blacklist");
const upload = require("../utils/upload");

exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const tokenWithBearer = req.headers["authorization"];

  try {
    if (!newPassword) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "All fields are required!")
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
          apiResponse.createModelRes(200, "Password changed successfully!")
        );
      } else {
        return apiResponse.send(
          res,
          apiResponse.createModelRes(400, "Failed to update password!")
        );
      }
    } else {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "User not found!")
      );
    }
  } catch (err) {
    console.error(err);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Password change error!")
    );
  }
};

exports.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const { userId } = req.body;

  try {
    if (!newPassword) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "All fields are required!")
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

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const loginToUpdate = await User.findOne({ _id: userId });

    if (loginToUpdate != null) {
      const filter = { _id: loginToUpdate.loginId };
      const update = { password: newHashedPassword };

      const userUpdated = await Login.findOneAndUpdate(filter, update, {
        new: true,
      });

      if (userUpdated) {
        return apiResponse.send(
          res,
          apiResponse.createModelRes(200, "Password changed successfully!")
        );
      } else {
        return apiResponse.send(
          res,
          apiResponse.createModelRes(400, "Failed to update password!")
        );
      }
    } else {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "User not found!")
      );
    }
  } catch (err) {
    console.error(err);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Password change error!")
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

    if (userLogged.isDeleted == true) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "user has been deleted")
      );
    }

    const id = userLogged?._id;
    const username = user?.username;
    const role = userLogged?.role;
    const idLogin = user?._id;
    const emailUser = email;
    const nameUser = userLogged?.firstName + " " + userLogged?.lastName;
    const nifUser = userLogged?.nif;
    try {
      const accessToken = generateAccessToken({
        id,
        username,
        role,
        idLogin,
        emailUser,
        nameUser,
        nifUser,
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

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    birthdate,
    role,
    address,
    nif,
    phoneNumber,
  } = req.body;
  const birthdateDateObject = new Date(birthdate);

  // Validate required fields
  if (
    !username ||
    !password ||
    !firstName ||
    !lastName ||
    !birthdate ||
    !email ||
    !role ||
    !address ||
    !nif ||
    !phoneNumber
  ) {
    apiResponse.send(
      res,
      apiResponse.createModelRes(400, "All fields are required")
    );
  }

  // Validate password length
  if (password.length < 6) {
    const passwordLengthError = apiResponse.createModelRes(
      400,
      "The password must be at least 6 characters"
    );
    return apiResponse.send(res, passwordLengthError);
  }

  if (!email.includes("@")) {
    const errorEmail = apiResponse.createModelRes(400, {
      message: "Invalid email",
      status: 422,
    });
    return apiResponse.send(res, errorEmail);
  }

  try {
    const existingLogin = await Login.findOne({ email });
    if (existingLogin) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "Email already exists")
      );
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(400, "Username already exists")
      );
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
            address,
            phoneNumber,
            nif,
          },
        ],
        { session }
      );

      console.log(newUser, newLogin);

      await session.commitTransaction();
      session.endSession();

      apiResponse.send(res, apiResponse.createModelRes(200, "User created"));
    } catch (err) {
      console.error(err);

      await session.abortTransaction();
      session.endSession();

      apiResponse.send(res, apiResponse.createModelRes(500, "Server error"));
    }
  } catch (err) {
    console.error(err);
    apiResponse.send(res, apiResponse.createModelRes(500, "Server error"));
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

exports.deleteAccount = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  const token = tokenWithBearer.split(" ")[1];

  const userLogged = jwt.verify(token, process.env.TOKEN_SECRET);

  try {
    const user = await User.findById(userLogged?.id);
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

    const deletedResponse = apiResponse.createModelRes(200, "UserDeleted", {});
    return apiResponse.send(res, deletedResponse);
  } catch (err) {
    console.error(err);

    const deletedErrorResponse = apiResponse.createModelRes(
      400,
      "Unhauthorized",
      {}
    );
    return apiResponse.send(res, deletedErrorResponse);
  }
};

exports.editUser = [
  upload.single("image"),
  async (req, res) => {
    const tokenWithBearer = req.headers["authorization"];
    const token = tokenWithBearer.split(" ")[1];

    const { email, firstName, lastName, username, address, phoneNumber } =
      req.body;

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
      user.address = address;
      user.phoneNumber = phoneNumber;
      loginOfUser.email = email;

      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        user.image = {
          data: base64Image,
          contentType: req.file.mimetype,
        };
      }

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
  },
];

exports.editUserSemFoto = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  const token = tokenWithBearer.split(" ")[1];

  const { email, username, address, phoneNumber } =
    req.body;

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

    user.username = username;
    user.address = address;
    user.phoneNumber = phoneNumber;
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
      const filter = { role: role, isDeleted: false };
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
exports.getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const tokenWithBearer = req.headers["authorization"];

    if (!tokenWithBearer) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(
          401,
          "Unauthorized for this endpoint, check the token",
          {}
        )
      );
    }

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

    const filter = { _id: id, isDeleted: false };
    const user = await User.findOne(filter);

    if (!user) {
      return apiResponse.send(
        res,
        apiResponse.createModelRes(404, "UserNotFound", {})
      );
    }

    let userData = {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      birthdate: user.birthdate,
      role: user.role,
      loginId: user.loginId,
      isDeleted: user.isDeleted,
      address: user.address,
      phoneNumber: user.phoneNumber,
      nif: user.nif,
    };

    if (user.image && user.image.data) {
      userData.image = {
        contentType: user.image.contentType,
        data: user.image.data.toString("base64"), // Convert Buffer to base64 string
      };
    }

    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "User found", [userData]) // Retorna um array com um único usuário
    );
  } catch (error) {
    console.error(error);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Internal Server Error", {})
    );
  }
};

exports.getAllUsers = async (req, res) => {
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

    const filter = { isDeleted: false };
    const users = await User.find(filter);

    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "User founds", users)
    );
  } catch (error) {
    console.error(error);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Internal Server Error", {})
    );
  }
};

exports.getAllUsersWithoutToken = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    const users = await User.find(filter);

    return apiResponse.send(
      res,
      apiResponse.createModelRes(200, "User founds", users)
    );
  } catch (error) {
    console.error(error);
    return apiResponse.send(
      res,
      apiResponse.createModelRes(500, "Internal Server Error", {})
    );
  }
};
