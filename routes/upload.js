var express = require('express');
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

router.get('/add', function(req, res) {
  res.render('add');
});

router.post('/upload', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.log(err)
      return res.end("Error uploading file.");
    }
    console.log(req.body)
    res.redirect('/');
  });
});

module.exports = router;
