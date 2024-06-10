const multer = require('multer');

const storage = multer.memoryStorage(); // Armazenar a imagem na memória
const upload = multer({ storage: storage });

module.exports = upload;
