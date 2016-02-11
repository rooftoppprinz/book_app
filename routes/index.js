var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var multer = require('multer');
var mkdirp = require('mkdirp');
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var dir = 'public/books/';
    mkdirp(dir, function(err) {
      if (err) {
        console.error(err);
      }
      // move cb to here
      cb(null, dir);
    });
    console.log("Upload: saved to " + dir + file.originalname);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
var upload = multer({
  storage: storage
}).any();
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {
    user: req.user
  });
});

router.get('/guest', function(req, res) {
  res.render('guest');
});

router.get('/register', function(req, res) {
  res.render('register', {
    message: req.flash('registerMessage')
  });
});

router.post('/register', passport.authenticate('local-register', {
  successRedirect: '/', // redirect to the secure profile section
  failureRedirect: '/register', // redirect back to the signup page if there is an error
  failureFlash: true // allow flash messages
}));

router.get('/login', function(req, res) {
  res.render('login', {
    user: req.user,
    message: req.flash('loginMessage')
  });
});

router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/ping', function(req, res) {
  res.status(200).send("pong!");
});

router.get('/add', function(req, res) {
  res.render('add', {
    user: req.user,
  });
});

router.post('/upload', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.log(err)
      return res.end("Error uploading file.");
    }
    console.log(req.body)
    res.render('add', {
      message: "Successfully saved book."
    });
  });
});

module.exports = router;
