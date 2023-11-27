// blacklist.js
const apiResponse = require("./response.js");

const blacklist = [];

exports.addToBlacklist = (token) => {
  blacklist.push(token);
  console.log("blacklist", blacklist);

};

exports.checkBlacklist = (token) => {
  return new Promise((resolve) => {
    resolve(blacklist.includes(token));
  });
};
