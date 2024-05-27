// authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const resetPasswordController = require("../controllers/resetPasswordController");
const authMiddleware = require("../middleware/auth");

router.post("/login", authController.login);
router.route("/register").post(authController.register);

router.use(authMiddleware);
router.route("/recoverPassword").post(authController.recoverPassword);
router.route("/deleteUser").put(authController.deleteUser);
router.route("/logout").post(authController.logout);
router.route("/getAllUsersByRole").get(authController.getAllUsersByRole);
router.route("/editUser").post(authController.editUser);
router.route("/resetPassword").post(resetPasswordController.create);
router.route("/checkCode").get(resetPasswordController.checkCode);


module.exports = router;
