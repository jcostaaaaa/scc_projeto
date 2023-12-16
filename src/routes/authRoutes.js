// authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/login", authController.login);
router.route("/register").post(authController.register);

router.use(authMiddleware);
router.route("/changepassword").post(authController.changePassword);
router.route("/deleteUser").put(authController.deleteUser);
router.route("/editUser").post(authController.editUser);
router.route("/logout").post(authController.logout);
router.route("/getAllUsersByRole").get(authController.getAllUsersByRole);
router.route("/editUser").post(authController.editUser);

module.exports = router;
