var express = require('express');
var passport = require('passport');
var pdfjs = require('pdfjs-dist');
var Account = require('../models/account');
var multer = require('multer');
var mkdirp = require('mkdirp');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/book_app';
var fs = require('fs');
var storage = multer.memoryStorage()
var upload = multer({
  storage: storage
}).any();
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {
    user: req.user
  });
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
  //uploading data
  upload(req, res, function(err) {
    if (err) {
      console.log(err)
      return res.end("Error uploading file.");
    }
    MongoClient.connect(url, function(err, db) {
      var collection = db.collection("book_list");
      collection.insert(req.body, function(err, doc) {
        if (err) console.log(err);
        console.log(doc.ops[0]['_id']);
        fs.writeFile('public/books/' + doc.ops[0]['_id'].toString() + '.pdf', req.files[0].buffer, function(err) {
          if (err) console.log(err);
          db.close();
          //indexing data
          var book_id = doc.ops[0]['_id'].toString();
          ParsePDFText = function(pdf) {
            this.pdf = pdf;
          }
          ParsePDFText.prototype.then = function(callback) {
            console.log("parsing pdf...");
            var mother = this;
            var pdf = PDFJS.getDocument(this.pdf);
            var allPageTextData = [];
            pdf.then(function(pdf) {
              var processedPages = 0;
              var maxPages = pdf.pdfInfo.numPages;
              console.log("number of pages:" + maxPages);
              for (var j = 1; j <= maxPages; j++) {
                var page = pdf.getPage(j);
                var processPageText = function processPageText(pageIndex) {
                  return function(pageData, content) {
                    return function(text) {
                      console.log("-------------------------------------------------------");
                      console.log("page: " + pageData.pageIndex);
                      var pageTextData = [];
                      // var out = "";
                      // out += "page:"+pageData.pageIndex+"\n";
                      var allStr = "";
                      for (var i = 0; i < text.items.length; i++) {
                        allStr += text.items[i].str;
                      }

                      allStr.split(/[^A-Za-z0-9]/).forEach(function(entry) {
                        if (entry != " " && entry != '') {
                          console.log("<" + entry + ">");
                          pageTextData[pageTextData.length] = {
                            realindex: i,
                            word: entry.toLowerCase()
                          }
                        }
                      });

                      // out += "\n------------------------------------------\n";
                      processedPages++;
                      // console.log(processedPages+"/"+maxPages);
                      // console.log("\n\npage:"+pageData.pageIndex);
                      // console.log(pageTextData);
                      allPageTextData[pageData.pageIndex] = pageTextData;
                      if (processedPages == maxPages) {
                        callback(allPageTextData);
                      }
                    }
                  }
                }(j);
                var processPage = function(pageData) {
                  var content = pageData.getTextContent();
                  content.then(processPageText(pageData, content));
                }
                page.then(processPage);
              }
            });
          }
          var buffer = req.files[0].buffer;
          var converter = function(buffer) {
            var ab = new ArrayBuffer(buffer.length);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; ++i) {
              view[i] = buffer[i];
            }
            return view;
          };

          var parsedpdftext = new ParsePDFText(converter(buffer));
          parsedpdftext.then(function(bookTextData) {
            console.log("pushing to db...");
            console.log("all data count:" + bookTextData.length);
            MongoClient.connect(url, function(err, db) {
              var pageIndex = 0;
              var globalWordIndex = 0;
              var collection = db.collection("book_index");
              var toInsert = []
              bookTextData.forEach(function(entry) {
                entry.forEach(function(entry) {
                  toInsert.push({
                    word: entry.word,
                    word_index: entry.realindex,
                    page_number: pageIndex,
                    global_word_index: globalWordIndex,
                    book_id: book_id
                  });
                  globalWordIndex++;
                });
                console.log("preparing page:" + pageIndex);
                pageIndex++;
              });
              console.log("total to be inserted:" + toInsert.length);
              collection.insertMany(toInsert, function(err, r) {
                console.log("inserted count:" + r.insertedCount)
                db.close();
              });

            });
          });
          //end of indexing data
        });
      });
    });
    //end of uploading data

    res.render('add', {
      user: req.user,
      message: "Successfully saved book."
    });
  });
});

router.get('/result', function(req, res) {
  res.render('result');
});


router.post('/search-book', function(req, res) {
  console.log(req.body);
  var searchTerms = req.body.searchBar.split(/[^A-Za-z0-9]/);
  //search book
  console.log("test");

  var groupBy = function(array, f) {
    var groups = {};
    array.forEach(function(o) {
      var group = JSON.stringify(f(o));
      groups[group] = groups[group] || [];
      groups[group].push(o);
    });
    return Object.keys(groups).map(function(group) {
      return groups[group];
    })
  }

  var countErrors = function(sequence) {
    var reduce = function reduce(sequence) {
      // console.log("reduce: ");
      // console.log(sequence);
      var reduced = []
      for (var i = 0; i < sequence.length - 1; i++) {
        if (sequence[i] + 1 == sequence[i + 1]) {
          continue;
        } else if (sequence[i] < sequence[i + 1]) {
          var hasIb = false;
          for (var j = 0; j < sequence.length; j++) {
            if (sequence[j] > sequence[i] && sequence[j] < sequence[i + 1]) {
              hasIb = true;
              break;
            }
          }
          if (hasIb) {
            reduced.push(sequence[i]);
          }
        } else {
          reduced.push(sequence[i]);
        }
      }
      reduced.push(sequence[sequence.length - 1]);
      // console.log(reduced);
      return reduced;
    }

    reduced = reduce(sequence);
    errors = 0;
    for (var i = 0; i < reduced.length - 1; i++) {
      if (reduced[i] > reduced[i + 1]) {
        errors++;
      }
    }
    // console.log("errors: "+errors);
    return errors;
  }

  // countErrors([1,2,3,4,5]);
  // countErrors([1,3,2,4,5]);
  // countErrors([4,1,2,3,5]);
  // countErrors([1,2,4,3,7,6]);
  // countErrors([3,1,2,5,4]);
  // countErrors([1,4,5]);
  // countErrors([6,1,2,3]);

  Search = function(terms) {
    this.terms = terms;
  }

  Search.prototype.then = function(callback) {
    this.docs = [];
    var s = this;
    console.log(s.terms);
    MongoClient.connect(url, function(err, db) {
      db.collection('book_index').aggregate([{
        $match: {
          word: {
            $in: s.terms
          }
        }
      }, {
        $sort: {
          word_index: 1
        }
      }, {
        $group: {
          _id: "$book_id",
          items: {
            $push: {
              word: "$word",
              globalIndex: "$global_word_index",
              localIndex: "$word_index",
              pageNumber: "$page_number"
            }
          }
        }
      }]).toArray(function(err, doc) {
        console.log(err);
        callback(s, doc);
        db.close();
      });
    });
  }

  result = new Search(searchTerms);
  // result = new Search(["pass"]);
  result.then(function(s, doc) {
    console.log("[result stage]");
    // console.log(doc);
    var book_result = [];
    var bookidProcessed = 0;
    var bookidTotal = doc.length;

    doc.forEach(function(e) {
      console.log("book:" + e._id + "===================================================================");
      e.items.sort(function(a, b) {
        var prop = "globalIndex";
        return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
      });

      var groupedFoundTerms = [{
        foundTerms: [],
        indexes: [],
        page: 0
      }]
      var nGroupedFoundTerms = 0;
      var lastd = e.items[0].globalIndex;

      e.items.forEach(function(e) {
        if (e.globalIndex <= lastd + 2) {
          groupedFoundTerms[nGroupedFoundTerms].foundTerms.push({
            word: e.word,
            matched: 0
          });
          groupedFoundTerms[nGroupedFoundTerms].indexes.push(e.globalIndex);
        } else {
          nGroupedFoundTerms++;
          groupedFoundTerms[nGroupedFoundTerms] = {
            foundTerms: [],
            indexes: []
          };
          groupedFoundTerms[nGroupedFoundTerms].foundTerms.push({
            word: e.word,
            matched: 0
          });
          groupedFoundTerms[nGroupedFoundTerms].indexes.push(e.globalIndex);
          groupedFoundTerms[nGroupedFoundTerms].page = e.pageNumber;
        }
        lastd = e.globalIndex;
      });

      var averageScore = 0;
      var maxScore = 0;
      var minScore = 100;
      for (var i = 0; i < groupedFoundTerms.length; i++) {
        var stHits = 0;
        for (var ij = 0; ij < s.terms.length; ij++) {
          for (var j = 0; j < groupedFoundTerms[i].foundTerms.length; j++) {
            // console.log("comp1:"+groupedFoundTerms[i].foundTerms[j].word);
            // console.log("comp2:"+s.terms[ij]);
            if (groupedFoundTerms[i].foundTerms[j].word == s.terms[ij] && groupedFoundTerms[i].foundTerms[j].matched == 0) {
              // console.log("hit!!");
              groupedFoundTerms[i].foundTerms[j].matched = ij + 1;
              stHits++;
              break;
            }
          }

        }
        var gtSequence = [];
        groupedFoundTerms[i].foundTerms.forEach(function(gft) {
          if (gft.matched != 0) {
            gtSequence.push(gft.matched);
          }
        });
        var ftHits = stHits;
        if (groupedFoundTerms[i].indexes.length != 1) {
          ftHits = stHits / (groupedFoundTerms[i].indexes[groupedFoundTerms[i].indexes.length - 1] - groupedFoundTerms[i].indexes[0] + 1);
        }

        stHits = stHits / s.terms.length;
        groupedFoundTerms[i].stHits = stHits;
        groupedFoundTerms[i].ftHits = ftHits;
        groupedFoundTerms[i].gtSequence = gtSequence;
        groupedFoundTerms[i].error = (s.terms.length - countErrors(gtSequence)) / s.terms.length;
        groupedFoundTerms[i].score = Math.pow(
          groupedFoundTerms[i].error * ftHits * stHits, 1 / 3) * 100;
        averageScore += groupedFoundTerms[i].score;
        if (groupedFoundTerms[i].score > maxScore) {
          maxScore = groupedFoundTerms[i].score;
        }
        if (groupedFoundTerms[i].score < minScore) {
          minScore = groupedFoundTerms[i].score;
        }
      }

      groupedFoundTerms.sort(function(a, b) {
        var prop = "score";
        return (a[prop] < b[prop]) ? 1 : ((a[prop] > b[prop]) ? -1 : 0);
      });

      averageScore = averageScore / groupedFoundTerms.length;
      var cutoff = (maxScore + averageScore) / 2;
      var filteredGroupedFoundTerms = []

      console.log("averageScore:" + averageScore);
      console.log("maxScore:" + maxScore);
      console.log("cutoff:" + cutoff);

      for (var i = 0; i < groupedFoundTerms.length; i++) {
        if (groupedFoundTerms[i].score >= maxScore) {
          filteredGroupedFoundTerms.push(groupedFoundTerms[i]);
        }
      }

      // console.log(pagedGroupedFoundTerms);


      // for (var i=0; i<groupedFoundTerms.length; i++)
      // {
      //     console.log("GT:-------------------------------------------------------------");
      //     console.log(groupedFoundTerms[i].indexes);
      //     console.log(groupedFoundTerms[i].foundTerms);
      //     console.log(groupedFoundTerms[i].page);
      //     console.log(groupedFoundTerms[i].gtSequence);
      //     console.log(groupedFoundTerms[i].stHits);
      //     console.log(groupedFoundTerms[i].ftHits);
      //     console.log("err:"+groupedFoundTerms[i].error);
      //     console.log("score:"+groupedFoundTerms[i].score);
      // }
      // var CbHolder = {
      //   bookId : e._id,
      //   maxScore : maxScore,
      //   matches : filteredGroupedFoundTerms,
      //   cbx : function(err, db) {
      //
      // }
      // };
      // var getFiltered = CbHolder.cbx;
      MongoClient.connect(url, function(err, db) {
        var collection = db.collection("book_list");
        collection.findOne({
          _id: ObjectID(e._id)
        }, function(err, doc) {
          book_result.push({
            bookId: e._id,
            title:doc.title,
            maxScore: maxScore,
            matches: filteredGroupedFoundTerms
          });

          console.log({
            bookId: e._id,
            // title:doc.title,
            maxScore: maxScore,
            matches: filteredGroupedFoundTerms
          });
          bookidProcessed++;
          if(bookidProcessed==bookidTotal)
          {
            book_result.sort(function(a, b) {
              var prop = "maxScore";
              return (a[prop] < b[prop]) ? 1 : ((a[prop] > b[prop]) ? -1 : 0);
            });
            res.render('result', {
              data: book_result
            });
            console.log("TOTAL RESULT------------------------------------------------- ------------");
            console.log(book_result);

          }
        });
      });
    });
  });
});

module.exports = router;
