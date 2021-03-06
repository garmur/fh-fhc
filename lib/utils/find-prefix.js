// try to find the most reasonable prefix to use

module.exports = findPrefix;

var fs = require("fs");
var path = require("path");
var fhc = require("../fhc");

/*
function findPrefix (p, cb) {
  p = path.resolve(p);
  if (fhc.config.get("global")) return cb(null, p);
  // if there's no node_modules folder, then
  // walk up until we hopefully find one.
  // if none anywhere, then use cwd.
  var walkedUp = false;
  while (path.basename(p) === "node_modules") {
    p = path.dirname(p);
    walkedUp = true;
  }
  if (walkedUp) return cb(null, p);

  findPrefix_(p, p, cb);
};

function findPrefix_ (p, original, cb) {
  if (p === "/") return cb(null, original);
  fs.readdir(p, function (er, files) {
    // an error right away is a bad sign.
    if (er && p === original) return cb(er);

    // walked up too high or something.
    if (er) return cb(null, original);

    if (files.indexOf("node_modules") !== -1
        || files.indexOf("package.json") !== -1) {
      return cb(null, p);
    }

    return findPrefix_(path.dirname(p), original, cb);
  });
};
*/

function findPrefix (p, cb_) {
  function cb (er, p) {
    process.nextTick(function () {
      cb_(er, p)
    })
  }

  p = path.resolve(p)
  if (fhc.config.get("global")) return cb(null, p)
  // if there's no node_modules folder, then
  // walk up until we hopefully find one.
  // if none anywhere, then use cwd.
  var walkedUp = false
  while (path.basename(p) === "node_modules") {
    p = path.dirname(p)
    walkedUp = true
  }
  if (walkedUp) return cb(null, p)

  findPrefix_(p, p, cb)
}

function findPrefix_ (p, original, cb) {
  if (p === "/"
      || (process.platform === "win32" && p.match(/^[a-zA-Z]:(\\|\/)?$/))) {
    return cb(null, original)
  }
  fs.readdir(p, function (er, files) {
    // an error right away is a bad sign.
    if (er && p === original) return cb(er)

    // walked up too high or something.
    if (er) return cb(null, original)

    if (files.indexOf("node_modules") !== -1
        || files.indexOf("package.json") !== -1) {
      return cb(null, p)
    }

    return findPrefix_(path.dirname(p), original, cb)
  })
}