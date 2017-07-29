/*
author: Christian Miljkovic
version: 1.0
date:07/28/17
*/


const functions = require('firebase-functions');

const admin = require('firebase-admin');

var http = require('http');
var request = require("request");
//const secureCompare = require('secure-compare');
//const spawn = require('child-process-promise').spawn;



//configures the Cloud Functions enviroment
admin.initializeApp(functions.config().firebase);

/*
This method is asynchronous and it watches to see whenever the "updates" field within
the firebase database changes to 0 indicating that a recommendation should be made. Once
the function is triggered it uses the Google Places API to make a search and then 
based upon the specific persons preset settings.
*/
exports.addRecommendation = functions.database.ref('users/{userId}').onUpdate(event =>{

  //here we get the data from the .onUpdate function which stands for the 
  //reference to the database location that was changed
  var eventSnapshot = event.data;
  //var trigger = eventSnapshot.child('update'); //we will check later if it should be updated
  const user_id = event.data.key; 



  //now if we find that it is actually triggered we begin the process of making the rec
  //if(trigger.val() == 0){
  	console.log('A new recommendation is being created.');

  	var key = 'AIzaSyCKWI6ghttXWquuf63k9xn-PZCBDOnchS8'; //API key

  	//whenever we do .child() we are just getting the specific location and the data there

  	var loc1 = eventSnapshot.child('location').child('l').child('0').val().toString();
  	var loc2 = eventSnapshot.child('location').child('l').child('1').val().toString();
  	

  	var location = loc1.toString() + ',' + loc2.toString();

  	

  	var radius = "500";

  	var type = "food";

  	var settings = event.data.child('settings');

  	var cusine = settings.child("cuisineData").child(0).val()[0];

  	var price = settings.child("lunchBudget").val();

  	var diet = settings.child("dietData").val();

  	console.log(location);
  	console.log(cusine);
  	console.log(price);
  	console.log(diet);

  	url = "";

  	//we only want to be super specific if they are vegan otherwise parameters such as low carb mess up the search
  	if(diet==='vegan'){

  	//setting up the url that we will make the request to if the person is vegan
	url += 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+ diet +
		'+restaurant+price+level+1' +'&location=' + location +'&radius='+ radius + '&maxprice=' + price +'&type=' + type +'&key=' + key;

  	}

  	else{

  	//setting up the url that we will make the request to if the person does not indicate being vegan
	url += 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+
		'restaurant+price+level+1' +'&location=' + location +'&radius='+ radius + '&maxprice=' + price +'&type=' + type +'&key=' + key;

  	}


	console.log(url);

	//request uses a callback function in order to deal with the asynchronous nature of node
	request(url, function(err, response, body){

		if(err) {
			console.log("Request to Places API did not go through");
		}

		else {

			//parse the data and then set up the recommendation for insertion into the 
			//database 
			var json = JSON.parse(body);
			var rec = json.results[0].name;
			var add = json.results[0].formatted_address;

			var address = add.substring(0,add.length-15);

			var price_lvl = json.results[0].price_level.toString();
			var rate = json.results[0].rating.toString();

			var place_id = json.results[0].place_id;

			var lat = json.results[0].geometry.location.lat.toString();
			var long = json.results[0].geometry.location.lng.toString();			


			var new_rec = {
		  		name: rec,
		  		address: address,
		  		rating: rate,
		  		price_level:price_lvl,
		  		latitude: lat,
		  		longitude: long

		  	};


		  	//set the recommendation section with the set information
			admin.database().ref('users/'+ user_id +'/recommendation').set(new_rec);

		}

  	});

});






/*exports.notification_send = functions.https.onRequest((req, res) => {

	const key = req.query.key;

	if (!secureCompare(key, functions.config().cron.key)) {
	    console.log('The key provided in the request does not match the key set in the environment. Check that', key,
	        'matches the cron.key attribute in `firebase env:get`');
	    res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
	        'cron.key environment variable.');
	    return;
  }

  console.log('request made from cron');

  
	return loadUsers().then(users => {
	        let tokens = [];
	        for (let user of users) {
	            tokens.push(user.pushToken);
	        }
	        let payload = {
	            notification: {
	                title: 'Your Personalized recommendation',
	                body: 'Hope you\'re hungry!',
	                sound: 'default',
	                badge: '1'
	            }
	        };
	        return admin.messaging().sendToDevice(tokens, payload);
	    });
});


function loadUsers() {
    let dbRef = admin.database().ref('/users');
    let defer = new Promise((resolve, reject) => {
        dbRef.once('value', (snap) => {
            let data = snap.val();
            console.log(data);
            let users = [];
            for (var property in data) {
                users.push(data[property]);
            }
            resolve(users);
        }, (err) => {
            reject(err);
        });
    });
    return defer;

        "secure-compare": "^3.0.1",
    "child-process-promise":"^2.2.1 "
}*/


/*
This function waits for a write to the playlists database whenever a user creates a playlist
then begins to get the information for the specific restaurant such as location, photos, menus, etc.
This is done by making calls to three different Google API's: Places, Details, and Photos. Then once 
the information is recieved this function updates the database for the newly added restaurant.

*/
exports.get_restaurant_info = functions.database.ref('playlists/{user_id}').onWrite(event =>{

  //here we get the data from the .onUpdate function which stands for the 
  //reference to the database location that was changed
  var eventSnapshot = event.data;
  //var trigger = eventSnapshot.child('update'); //we will check later if it should be updated
  const user_id = event.data.key; 

  const data = event.data._delta.restaurants;

  console.log('Building restaurant snapshot');


  var key = 'AIzaSyCKWI6ghttXWquuf63k9xn-PZCBDOnchS8'; //API key


  	console.log('Entering for loop');

  	//need to use for loop because of the way you access the children with the DataSnapshot
	for (dict_key in data){
	    
	    //this is the restaurant name
	    const name = dict_key;

	    console.log(name);

		//setting up the url that we will make the request to
		var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+ name +'+NYC&type=food&key=' + key;

		console.log('entering request method');
		//request uses a callback function in order to deal with the asynchronous nature of node
		request(url, function(err, response, body){

			if(err) {
				console.log("Request to Places API did not go through");
			}

			else {

				console.log('building response');

				//parse the data and then set up the recommendation for insertion into the 
				//database 
				var json = JSON.parse(body);

				var photo_data = json.results[0].photos[0];

				var photo_ref = photo_data.photo_reference;

				var max_width = photo_data.width;

				var add = json.results[0].formatted_address;

				var address = add.substring(0,add.length-15);

				var price_lvl = json.results[0].price_level.toString();
				var rate = json.results[0].rating.toString();

				var place_id = json.results[0].place_id;

				var lat = json.results[0].geometry.location.lat.toString();
				var long = json.results[0].geometry.location.lng.toString();

				var place_id = json.results[0].place_id;


				//consturct the restaurant details object that you are placing in the database
				var details = {
			  		address: address,
			  		rating: rate,
			  		price_level:price_lvl,
			  		latitude: lat,
			  		longitude: long,
			  		place_id: place_id,
			  		max_width: max_width

			  	};


			  	//set the recommendation section with the set information
				admin.database().ref('playlists/'+ user_id +'/restaurants/'+name).set(details);
				console.log("Restaurant Details Uploaded.");						



				console.log("Second request to Photo API");


				//constructing the second url for the google photo api using width from previous api
					var url2 = "https://maps.googleapis.com/maps/api/place/photo?maxwidth="+ max_width +"&photoreference=" +photo_ref +"&key="+key;           

					//entering request 
			        request(url2, function(err, response, body){

			          

			          if(err) {
			            console.log("Request to Photo API did not go through");
			          }

			          else {   

			          	//have to look at the socket because we can't store the body which is an image
			          	//therefore we are looking at the socket which gives us information such as where
			          	//google api stores the image

			          	console.log("Constructing URL");
			          	var socket = response.socket;
			          	var host = socket._host;
			          	var url_path = socket._httpMessage.path;

			          	var total_url = "https://"+host+url_path; //have to put two parts together for the url to be valid

			          	var url_lol = {

			          		restaurant_url: total_url

			          	};

			          	admin.database().ref('playlists/'+ user_id +'/urls/'+name).set(url_lol);


			          } 

			        });


			        //now we are going to get the link to the website so users can check out the menu
			        console.log("Google Details API URL Construction");

			        //now the third url construction from the place id that we got from the first api call
			        var url3 = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+ place_id +'&key='+key; 

			        console.log("Entering 3rd request");


			        request(url3, function(err, response, body){

			          

			          if(err) {
			            console.log("Request to Details API did not go through");
			          }

			          else {   

			          	//simply getting the website from this (can potentially get more details if need be)
			          	console.log("Getting website for menu");
			          	
			          	var json = JSON.parse(body);

			          	var website = json.result.website; //unlike previous API calls this 
			          									  //one we do result instead of results

						console.log(website);


			          	var website_omg = {

			          		restaurant_menu: website

			          	};

			          	admin.database().ref('playlists/'+ user_id +'/menus/'+name).set(website_omg);


			          } 

			        });

			}

  	});

	

	}
});






		  	

