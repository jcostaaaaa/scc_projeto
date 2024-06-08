// authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const resetPasswordController = require("../controllers/resetPasswordController");
const authMiddleware = require("../middleware/auth");

router.post("/login", authController.login);
router.route("/register").post(authController.register);
router
  .route("/getAllUsersWithoutToken")
  .get(authController.getAllUsersWithoutToken);
router
  .route("/forgotPassword")
  .post(resetPasswordController.createWithoutToken);
router.route("/checkCode").post(resetPasswordController.checkCode);
router.route("/resetPassword").post(authController.resetPassword);

router.use(authMiddleware);
router.route("/changePassword").post(authController.changePassword);
router.route("/deleteUser").put(authController.deleteUser);
router.route("/deleteAccount").put(authController.deleteAccount);
router.route("/logout").post(authController.logout);
router.route("/getAllUsersByRole").get(authController.getAllUsersByRole);
router.route("/editUser").post(authController.editUser);
router.route("/getUserById/:id").get(authController.getUserById);
router.route("/getAllUsers").get(authController.getAllUsers);

module.exports = router;
