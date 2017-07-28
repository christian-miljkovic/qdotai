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


  	//setting up the url that we will make the request to
	var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+ diet +
		'+restaurant+price+level+1' +'&location=' + location +'&radius='+ radius + '&maxprice=' + price +'&type=' + type +'&key=' + key;

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

			//reset the trigger for alter use
			//admin.database().ref('users/'+ user_id +'/update').set(1);	
		}

  	});
/*  
  	request(url2, function(err, response, body){ 

  				var url2 = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+ place_id +'&key=' + key;

				if(err) {
					console.log("Request to Places Details API did not go through");
				}

				else{

					var json = JSON.parse(body);
					var website = json.result.website;



					admin.database().ref('users/'+ user_id +'/recommendation/website').set(website);
				}

			});*/

  /*else
  	console.log('No new recommendation');
*/
});

/*
exports.update_rec = functions.database.ref('users/{userId}/location').onUpdate(event =>{

	var user_id = event.parent().name(); 

	console.log(user_id);
	//set the recommendation section with the set information
	admin.database().ref('users/'+ user_id +'/update').set(0);

});*/




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


//you can potentially use just onCreate and then go all the way to the restaurant path
//because you can get the path through the data snap shot, this is to avoid the recurence problem
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


				var details = {
			  		address: address,
			  		rating: rate,
			  		price_level:price_lvl,
			  		latitude: lat,
			  		longitude: long,
			  		//photoreference: photo_ref,
			  		max_width: max_width

			  	};


			  	//set the recommendation section with the set information
				admin.database().ref('playlists/'+ user_id +'/restaurants/'+name).set(details);
				console.log("Restaurant Details Uploaded.");						


				//reset the trigger for alter use
				//admin.database().ref('users/'+ user_id +'/update').set(1);	


				console.log("Second request to Photo API");

					var url2 = "https://maps.googleapis.com/maps/api/place/photo?maxwidth="+ max_width +"&photoreference=" +photo_ref +"&key="+key;           

				        request(url2, function(err, response, body){

				          

				          if(err) {
				            console.log("Request to Photo API did not go through");
				          }

				          else {   

				          	console.log("Constructing URL");
				          	var socket = response.socket;
				          	var host = socket._host;
				          	var url_path = socket._httpMessage.path;

				          	var total_url = "https://"+host+url_path;

				          	var url_lol = {

				          		url: total_url

				          	}

				          	admin.database().ref('playlists/'+ user_id +'/restaurants/urls/'+name).set(url_lol);


				          } 

				        }); 				
			}

  	});

	

	}
});






		  	

