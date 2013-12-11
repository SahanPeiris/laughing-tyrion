var db = require('../model/db');
var posts = require('../model/posts');
var users = require('../model/users');
var request = require('request');

exports.createPosts = function(req, res){
	posts.createPost(req.body, function(){
 		res.end("true");
 	});
}

exports.findByUser = function(req, res){
  posts.postlistByUser(req.params.id, function(err, result){
  	if(err) return console.log(err);
  	res.send(result);
  })
}

exports.findByPostId = function(req, res){
  posts.postlist(req.params.id, function(err, result){
  	if(err) return console.log(err);
  	res.send(result);
  })
}

var postArray = [];
exports.scrapeFeed = function(req, res){
	var fbid = req.params.id;
	users.getOne(req.params.fbid, function(err, result){
		if (err) return console.log(err);
		//Use this user info to get fb stuff
		getFBfeed(result, res);
	});
}

var itemCount = 0;
var main_response = null;

function getFBfeed(user, res){
	main_response = res;
	request('https://graph.facebook.com/'+user.fb_id+"/feed?access_token="+user.fb_token+"&fields=type,source,from,to,full_picture&limit=2000", function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var videoArray = [];
			var videoData = JSON.parse(body);
			//console.log(body.data.length);
			
		 	for (var i=0; i<videoData.data.length; i++){
		 		if (videoData.data[i].type == "video")
				{
		 			// console.log(response.data[i]);
		 			if (videoData.data[i].source.indexOf("youtube.com") != -1){
		 				itemCount++;
		 				console.log(itemCount);
		 				var videoId = videoData.data[i].source.substring(25,36);
		 				getYouTubeVideoCategory(videoId, videoData.data[i], user.fb_id);
		 			}

		 			//For youtube videos
		 			//https://www.googleapis.com/youtube/v3/videos?id=qKj1qpHTZfc&key=AIzaSyAZLyBapbZnXBef4-gqQiKrYEXtOfRDyh0&part=snippet,statistics&fields=items(snippet(categoryId))
		 			//We need response.items[0].snippet.categoryId
		 		}
		 	}
		}
	});
}

function getYouTubeVideoCategory(videoId, fbBody, fbid){
	//console.log(videoId); 
	request("https://www.googleapis.com/youtube/v3/videos?id="+videoId+"&key=AIzaSyAZLyBapbZnXBef4-gqQiKrYEXtOfRDyh0&part=snippet&fields=items(snippet(categoryId, title))", function (error, response, body) {
		itemCount--;
		//console.log(fbBody);
		if (!error && response.statusCode == 200) {
			var bodyData = JSON.parse(body);
			if (typeof bodyData.items[0] != 'undefined'){
				if (typeof bodyData.items[0].snippet != 'undefined'){
					if (typeof bodyData.items[0].snippet.categoryId != 'undefined'){
						if (bodyData.items[0].snippet.categoryId == 10){
							//Save as music post
							var postObject = new Object();
							postObject.fb_id = fbid;
							postObject.post_typ = 'music';
							postObject.post_link = fbBody.source;
							postObject.post_title = bodyData.items[0].snippet.title;
							postObject.post_image = fbBody.full_picture
							postObject.post_by = fbBody.from.id;
							postObject.post_tags = [];
							if (typeof fbBody.to != 'undefined'){
								for (var i=0; i<fbBody.to.data.length; i++){
									postObject.post_tags.push(fbBody.to.data[i].id);
								}
							}
							
							postObject.created_time = fbBody.created_time;

							postArray.push(postObject);
						} else {
							//Save as video post
							var postObject = new Object();
							postObject.fb_id = fbid;
							postObject.post_typ = 'video';
							postObject.post_link = fbBody.source;
							postObject.post_title = bodyData.items[0].snippet.title;
							postObject.post_image = fbBody.full_picture
							postObject.post_by = fbBody.from.id;
							postObject.post_tags = [];		
							if (typeof fbBody.to != 'undefined'){
								for (var i=0; i<fbBody.to.data.length; i++){
									postObject.post_tags.push(fbBody.to.data[i].id);
								}
							}
							
							postObject.created_time = fbBody.created_time;

							postArray.push(postObject);
						}
						//console.log(videoId+" : " + youTubePostType[JSON.parse(body).items[0].snippet.categoryId]);	
					}
				}
			}
		}
		console.log(itemCount);
		if (itemCount == 0){
			renderCompleted();
		}
	});
}

function renderCompleted(){
	if (main_response != null){
		main_response.send(JSON.stringify(postArray));
	}
}

var youTubePostType = {
	1: "Film & Animation",
	2: "Autos & Vehicle",
	10: "Music",
	15: "Pets & Animals",
	17: "Sports",
	18: "Short Movies",
	19: "Travel & Events",
	20: "Gaming",
	21: "Videoblogging",
	22: "People & Blogs",
	23: "Comedy",
	24: "Entertainment",
	25: "News & Politics",
	26: "Howto & Style",
	27: "Education",
	28: "Science & Technology",
	29: "Non-profits & Activism",
	30: "Movies",
	31: "Anime/Animation",
	32: "Action/Adventure",
	33: "Classics",
	34: "Comedy",
	35: "Documentary",
	36: "Drama",
	37: "Family",
	38: "Foreign",
	39: "Horror",
	40: "Sci-Fi/Fantasy",
	41: "Thriller",
	42: "Shorts",
	43: "Shows",
	44: "Trailers"
}