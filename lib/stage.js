
module.exports = stage;

stage.usage = "\nfhc stage <appId> "  
            + "\nfhc stage <appId> [approver] [comment] --live "
            +"\nfhc stage <appId> [number_of_instances] [approver] [comment] --live"
            + "\nStage is made to Live environment if the '--live' flag is used"
            + "\nApprover is required if stage to Live environment. If it's not provided from the command line, user will be prompted for it."
            + "\nComment is optional and should only be provided if Approver is set."

var log = require("./utils/log");
var fhc = require("./fhc");
var fhreq = require("./utils/request");
var common = require("./common");
var util = require('util');
var async = require('async');
var ini = require('./utils/ini');
var update = require('./update.js');
var prompt = require('./utils/prompt');

// main stage entry point
function stage (args, cb) {
  if(args.length > 6 || args.length == 0) return unknown("stage", cb);

  var clean = ini.get('clean');
  var target = ini.get('live') ? 'live' : 'development';
  var numappinstances;
  var approver;
  var comment;

  // horrible hack for passing flags as args if used from api, e.g. 'live' instead of '--live'
  function processArg(arg) {
    if(Number(arg)) {
      numappinstances = Number(arg);
    } else if(arg === 'live' || arg === 'development'){
      target = arg;
    } else if(arg === 'clean'){
      clean = true;
    } else {
      //then arg should be either approver or comment,
      //but does rely on comment is after approver in command line
      if(approver){
        comment = arg;
      } else {
        approver = arg;
      }
    }
  }
  if(args[1]) processArg(args[1]);
  if(args[2]) processArg(args[2]);
  if(args[3]) processArg(args[3]);
  if(args[4]) processArg(args[4]);
  if(args[5]) processArg(args[5]);

  doStage(fhc.appId(args[0]), target, clean, numappinstances, approver, comment, cb);
};

function unknown (action, cb) {
  cb("Wrong arguments for or unknown action: " + action + "\nUsage:\n" + stage.usage);
};

// do our staging..
function doStage(app, target, clean, numappinstances, approver, comment, cb) {
  var type = 'stage';
  
  log.silly(target, 'Staging Target');
  if(target === 'live' || target === 'Live') {
    type = 'releasestage';
  }

  startStage(app, type, clean, numappinstances, approver, comment, function(err, results){
    if(err){
      if(err.indexOf("approver") > -1){
        //the approver field is required, ask for it
        prompt("Please enter approver:", "", false, function(err, val){
          if(err) return cb(err);
          if(val && val.length > 0){
            approver = val;
            prompt("Please enter comment:", "", false, function(err, cval){
              if(err) return cb(err);
              cval = cval.replace(/[\r?\n]/g, "");
              if(cval.length > 0){
                comment = cval;
              }
              startStage(app, type, clean, numappinstances, approver, comment, cb);
            });
          } else {
            return cb("Approver name/email is required to stage to live environment.");
          }
        });
      } else {
        return cb(err);
      }
    } else {
      cb();
    }
  });
};

function startStage(app, type, clean, numappinstances, approver, comment, cb){
  // constuct uri and payload
  var uri = "box/srv/1.1/ide/" + fhc.target + "/app/" + type;
  var payload = {payload:{guid: app, clean: clean}};
  if(numappinstances) {
    payload.payload.numappinstances = numappinstances;
  }
  if(type === "releasestage"){
    if(approver){
      payload.payload.approver = approver;
    }
    if(comment){
      payload.payload.comment = comment;
    }
  }
  log.silly(payload, "Stage payload");

  // finally do our call
  common.doApiCall(fhreq.getFeedHenryUrl(), uri, payload, "Error staging app: ", function(err, data) {
    if (err) return cb(err);
    async.map([data.cacheKey], common.waitFor, function(err, results) {
      if(err) return cb(err);
      if (results && results[0] && results[0][0] && results[0][0].status === 'complete') {
        stage.message = "App staged ok..";
      }
      
      // Set the 'instances' value if set
      if(numappinstances) {
        log.silly(numappinstances, "Setting nodejs.numappinstances");
        update.doUpdate(app, "nodejs.numappinstances", numappinstances, function(err, data){
          if(err) return cb(err);
          log.silly(data, "Response from update");
          return cb(undefined, results);        
        });
      }else {
        return cb(undefined, results); 
      }
    });
  });
}

// bash completion     
stage.completion = function (opts, cb) {
  common.getAppIds(cb);
};