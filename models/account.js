var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt-nodejs');

var Account = new Schema({
  username: String,
  password: String
});

// checking if password is valid
Account.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

Account.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
