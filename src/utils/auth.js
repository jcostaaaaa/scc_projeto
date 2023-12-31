const jwt = require("jsonwebtoken")

const secret = process.env.TOKEN_SECRET

exports.generateAccessToken = (information) => jwt.sign(information, secret, { expiresIn: "7d" })

exports.generateRefreshToken = ({ id, hashedPw }) => jwt.sign({ id }, secret + hashedPw, { expiresIn: "7d" })

exports.certifyAccessToken = async (token) => jwt.verify(token, secret)

exports.certifyRefreshToken = async (token, hashedPw) => jwt.verify(token, secret + hashedPw)

exports.decodedRefreshToken = async (token) => jwt.decode(token)