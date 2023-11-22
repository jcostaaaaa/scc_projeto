const authenticateUtil = require("../utils/auth.js");
const apiResponse = require("../utils/response.js");

module.exports = async (req, res, next) => {
  const accessToken = req.headers["authorization"]; // req.headers['x-access-token'];

  if (!accessToken) {
    return apiResponse.unauthorized(res, "Required access token");
  }

  try {
    const bearer = accessToken.split(" ");
    const bearerToken = bearer[1];

    const result = await authenticateUtil.certifyAccessToken(bearerToken);
    req.user = result;

    return next();
  } catch (err) {
    return apiResponse.unauthorized(res, err.toString());
  }
};
