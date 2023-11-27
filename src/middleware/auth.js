const authenticateUtil = require("../utils/auth.js");
const apiResponse = require("../utils/response.js");
const isTokenBlacklisted = require("../utils/blacklist.js").checkBlacklist;

module.exports = async (req, res, next) => {
  const accessToken = req.headers["authorization"];

  if (!accessToken) {
    return apiResponse.unauthorized(res, "Required access token");
  }

  try {
    const bearer = accessToken.split(" ");
    const bearerToken = bearer[1];

    if (await isTokenBlacklisted(bearerToken)) {
      return apiResponse.unauthorized(res, "Token revoked. Please log in again.");
    }

    const result = await authenticateUtil.certifyAccessToken(bearerToken);
    req.user = result;

    return next();
  } catch (err) {
    return apiResponse.unauthorized(res, err.toString());
  }
};
