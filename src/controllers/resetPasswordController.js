const apiResponse = require("../utils/response");
const ResetPassword = require("../models/resetPasswordModel.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

exports.create = async (req, res) => {
  const tokenWithBearer = req.headers["authorization"];
  if (!tokenWithBearer) {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(400, "Token not provided")
    );
  }

  const token = tokenWithBearer.split(" ")[1];
  let user;

  try {
    user = jwt.verify(token, process.env.TOKEN_SECRET);
  } catch (err) {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(400, "Invalid token")
    );
  }

  const expiryTime = new Date(Date.now() + 3600000);
  const idUserLogged = user.id;
  const emailUserLogged = user.emailUser;
  const nameUserLogged = user.nameUser;

  const tokenForPasswordChange = crypto.randomBytes(20).toString("hex");
  const codeForConfirmTheChangePassword = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  try {
    await ResetPassword.deleteMany({ userId: idUserLogged });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const newResetPassword = await ResetPassword.create(
        [
          {
            token: tokenForPasswordChange,
            expiryTime: expiryTime,
            code: codeForConfirmTheChangePassword,
            userId: idUserLogged,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "serviceswebappnoreply@gmail.com",
          pass: "nksvrkyatxniisda",
        },
      });

      const mailOptions = {
        from: "serviceswebappnoreply@gmail.com",
        to: emailUserLogged,
        subject: "Password reset",
        html: `<!DOCTYPE html>
          <html>
            <head>
              <title>Reset Password</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  background-color: #f2f2f2;
                  font-family: Arial, sans-serif;
                  font-size: 16px;
                  line-height: 1.6;
                  color: #555;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  width: 100%;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  box-sizing: border-box;
                  background-color: #fff;
                  border-radius: 5px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                }
                .header h1 {
                  font-size: 28px;
                  margin: 0;
                  color: #333;
                }
                .message {
                  margin-bottom: 20px;
                }
                .message p {
                  margin: 0 0 10px;
                }
                .btn {
                  display: block;
                  width: 100%;
                  max-width: 200px;
                  margin: 0 auto;
                  padding: 12px 20px;
                  box-sizing: border-box;
                  background-color: #fb8500;
                  color: #fff;
                  text-align: center;
                  text-decoration: none;
                  border-radius: 3px;
                  transition: background-color 0.3s;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Reset Your Password</h1>
                </div>
                <div class="message">
                  <p>Dear ${nameUserLogged},</p>
                  <p>You have requested to reset your password. Please fill the form with the code below to reset your password:</p>
                  <p>Code: ${codeForConfirmTheChangePassword}</p>
                </div>
                <div class="message">
                  <p>If you did not make this request, please ignore this email and your password will remain unchanged.</p>
                  <p>Best regards,</p>
                  <p>Your delivery team</p>
                </div>
              </div>
            </body>
          </html>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          const response = apiResponse.createModelRes(500, "server_error", {});
          return apiResponse.send(res, response);
        }

        const response = apiResponse.createModelRes(200, "created", {});
        return apiResponse.send(res, response);
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
      message: "Failed to delete existing reset password records",
      status: 500,
    });
  }
};

exports.checkCode = async (req, res) => {
  const code = req.body.code;

  const tokenWithBearer = req.headers["authorization"];
  if (!tokenWithBearer) {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(400, "Token not provided")
    );
  }

  const token = tokenWithBearer.split(" ")[1];
  var user;

  try {
    user = jwt.verify(token, process.env.TOKEN_SECRET);
  } catch (err) {
    return apiResponse.send(
      res,
      apiResponse.createModelRes(400, "Invalid token")
    );
  }
  const codeOfPasswordChange = await ResetPassword.findOne({
    code: code,
    userId: user.id,
  });

  if (codeOfPasswordChange != null) {
    return apiResponse.send(res, apiResponse.createModelRes(200, true));
  } else {
    return apiResponse.send(res, apiResponse.createModelRes(200, false));
  }
};

