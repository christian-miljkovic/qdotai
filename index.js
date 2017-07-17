const functions = require('firebase-functions');

const admin = require('firebase-admin');

var http = require('http');
var request = require("request");
const secureCompare = require('secure-compare');



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
  var trigger = eventSnapshot.child('update'); //we will check later if it should be updated
  const user_id = event.data.key; 



  //now if we find that it is actually triggered we begin the process of making the rec
  if(trigger.val() == 0){
  	console.log('A new recommendation is being created.');

  	var key = 'AIzaSyCKWI6ghttXWquuf63k9xn-PZCBDOnchS8'; //API key

  	//whenever we do .child() we are just getting the specific location and the data there

  	var settings = event.data.child('settings');

  	var cusine = settings.child("cusineData").child(0);

  	var price = settings.child("lunchBudget");

  	var diet = settings.child("dietData");

  	//setting up the url that we will make the request to
	var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+ diet +
		'+restaurant+' + cusine +'&minprice=' + price+ '&key=' + key;

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

			var new_rec = {
		  		recommendation: rec
		  	};


		  	//set the recommendation section with the set information
			admin.database().ref('users/'+ user_id +'/recommendation').set(new_rec);

			//reset the trigger for alter use
			admin.database().ref('users/'+ user_id +'/update').set(1);
		}
  	});
  }

  else
  	console.log('No new recommendation');

});



exports.notification_send = functions.https.onRequest((req, res) => {

	const key = req.query.key;

	if (!secureCompare(key, functions.config().cron.key)) {
	    console.log('The key provided in the request does not match the key set in the environment. Check that', key,
	        'matches the cron.key attribute in `firebase env:get`');
	    res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
	        'cron.key environment variable.');
	    return;
  }

  console.log('request made from cron');
  //end the connection
  res.end();

  //create the payload for the notification
  const payload = {
    notification: {
      title: 'Your Recommendation is ready!',
      body: 'It\'s time to eat!',
    }
  };

    // Get the list of device tokens.
  return admin.database().ref('fcmTokens').once('value').then(allTokens => {

    if (allTokens.val()) {

      // Listing all tokens.
      const tokens = Object.keys(allTokens.val());

      // Send notifications to all tokens.


      return admin.messaging().sendToDevice(tokens, payload).then(response => {
        
        // For each message check if there was an error.
        const tokensToRemove = [];

        response.results.forEach((result, index) => {

          const error = result.error;

          if (error) {
            console.error('Failure sending notification to', tokens[index], error);

            // Cleanup the tokens who are not registered anymore.
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {

              tokensToRemove.push(allTokens.ref.child(tokens[index]).remove());

            }
          }
        });

        return Promise.all(tokensToRemove);

      });
    }
  });

});

		  	

