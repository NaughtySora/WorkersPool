"use strict";

module.exports = {
  log() {
    console.log("Log from api");
  },
  getFloat() {
    return Math.random();
  },
  some(...args) {
    const { resolve, promise } = Promise.withResolvers();
    setTimeout(() => {
      resolve(args[0]);
    }, 500);
    return promise;
  },
  async fail(args) {
    throw new Error("error");
  },
};
