// authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require("../middleware/auth");


// Rota para autenticar o usuário (login)
router.post('/login', authController.login);
router.route('/register').post(authController.register);

router.use(authMiddleware)

router.route('/changepassword').post(authController.changePassword);
router.route('/deleteUser').post(authController.deleteUser);
router.route('/editUser').post(authController.editUser);

// Outras rotas relacionadas à autenticação podem ser definidas aqui

module.exports = router;
