// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

var url = require('url');
var https = require('https');
var bl = require('bl');

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var uri = process.env.MONGOLAB_URI;

var API_KEY = process.env.API_KEY;
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/imagesearch/*", function (request, response) {
  var parsed = url.parse(request.url,true);
  var term = parsed.pathname.slice(13);
  var start = 1;
  if (Number.isInteger(parsed.query.offset)){
    start = 1 + Number(parsed.query.offset);
  }
  
  MongoClient.connect(uri, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', uri);

      // the collection was created with db.createCollection("recentsearch", { capped : true, size : 100000, max : 10 } ). New docs overwrites old ones
      db.collection('recentsearch').insert({"term": term, "when": new Date()});
    }//end of connection established without error

    //Close connection
    db.close();

  })//end of mongoclient.connect
  
  var searchAPI = "https://www.googleapis.com/customsearch/v1?key=" + API_KEY + "&searchType=image&cx=006795023408100823277%3Ahleoeiycbxa&q=" + term + "&fields=queries,items(link,snippet,image/thumbnailLink,image/contextLink)&start=" + start.toString();
  var result=[];
  https.get(searchAPI, function(res){
    res.pipe(bl(function (err, data){
      if(err){
        return console.error(err);
      }
      else{
        var items = JSON.parse(data.toString()).items;
        items.forEach(function(item){
          result.push({"url":item.link, "snippet":item.snippet,
      "thumbnail":item.image.thumbnailLink,
      "context":item.image.contextLink});
        })
        response.send(result);
      }
    }))
  })
  
});

app.get("/latest/imagesearch/", function(request, response){
  MongoClient.connect(uri, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', uri);

      db.collection('recentsearch').find({},{_id: 0, "term":1, "when":1}).sort({_id:-1}).toArray(function(err, data){
        if (err){console.log(err)};
        response.send(data);
      });
    }//end of connection established without error

    //Close connection
    db.close();

  })//end of mongoclient.connect
  
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
