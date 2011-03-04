var threeTapsClient = function(authId, agentId) {
	this.agentId = agentId;
	this.authId = authId;
	
	for (var type in threeTapsClient.clients) {
		var client = threeTapsClient.clients[type];
		this[type] = new client(this);
	}
};

threeTapsClient.clients = {};

threeTapsClient.register = function(type, client) {
	threeTapsClient.clients[type] = client;
};

threeTapsClient.prototype = {
	agentId: null,
	authId: null,
	host: '3taps.net',
	response: null,

	request: function(path, method, getParams, postParams, callback) {
		postParams = postParams || {};
		var url = path + method;

		if (typeof require == 'function') {
			var querystring = require('querystring');
			
			if (getParams) {
				url += '?' + querystring.stringify(getParams);
			}

			if (postParams) {
				var post = querystring.stringify(postParams);
			} else {
				var post = '';
			}
			
			var http = require('http');
			var client = http.createClient(80, this.host);
			
			if (!client) {
				return false;
			}
			
			var request = client.request('post', url, {
				'Content-Length': post.length
				,'Content-Type': 'application/x-www-form-urlencoded'
				,Host: this.host
			});
			
			if (post.length > 0) foo = request.write(post);
			request.end();
			request.on('response', function(response) {
				var data = '';
				response.on('data', function(chunk) {
					data += chunk;
				});
				response.on('end', function() {
					var response = data ? JSON.parse(data) : null;
					callback(response);
				});
			});
			return true;
		} else if (typeof jQuery != 'undefined') {
			if (getParams) {
				url += '?' + $.param(getParams);
			}

			url = 'http://' + this.host + url;
			var proxy_url = '/proxy?url=' + encodeURIComponent(url);
			$.post(proxy_url, postParams, function(response) {
				callback(response);
			}, 'json');
			
			return true;
		}
		
		callback(false);
		return false;
	}
};

/**
 * @class The Geocoder API is a web service within the 3taps Network that allows other programs (both external systems and other parts of the 3taps Network) to calculate the location to use for a posting based on location-specific details within the posting such as a street address or a latitude and longitude value.  This process of calculating the location for a posting is known as geocoding.
 * @constructor
 */
var threeTapsGeocoderClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsGeocoderClient.prototype = {
	client: null,

	auth: true,
	path: '/geocoder/',
	
	/**
	 * @public
	 
	 * @restStructure POST /geocoder/geocode

	 * @desc Calculate the location for a posting

	 * @param {String} agentID The agentID should be a string identifying the entity which is sending this request. Note that entities which are not whitelisted can only request geocoding for one posting at a time, and will be liable to rate limiting.
	 * @param {String} authID The authID value is a string which authorizes the external system to make this request.  The specific value to send will be defined when the external system is whitelisted.  For non-whitelisted systems, this should be left blank.
	 * @param {Array} data data should be a JSON-encoded array of postings to geocode.  Each entry in this array should be a JSON object containing one or more of the following:
	 * 
	 * <table>
	 *     <tr>
	 *         <td>latitude</td><td>The GPS latitude value as a decimal degree.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>longitude</td><td>The GPS longitude value as a decimal degree.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>country</td><td>The name of the country.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>state</td><td>The name or code of the state or region.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>city</td><td>The name of the city.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>locality</td><td>The name of a suburb, area or town within the specified city.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>street</td><td>The full street address for this location.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>postal</td><td>A zip or postal code.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>text</td><td>An unstructured location or address value.</td>
	 *     </tr>
	 * </table>
	 * Note that, with the exception of the text and locality fields, this matches the structure used by Yahoo Pipes to represent locations; because many postings will come via Yahoo Pipes, using the same format will make the import process easier.  The text field should be used where unstructured address or location information is used; this field will be checked for all possible address tokens (city name, zip code, country name, etc).

	 * @return {Array} The body of the response will consist of a JSON-encoded array with one entry for each posting. Each array entry will itself be an array with three entries:
	 * 
	 * (locationCode, latitude, longitude)
	 * 
	 * where locationCode is the three-character location code to use for this posting, and latitude and longitude represent the calculated GPS coordinate for this posting’s location, in the form of floating-point numbers representing decimal degrees.
	 * 
	 * If the posting could not be geocoded at all, locationCode will be set to a null value.  If the geocoder was unable to calculate a lat/long value for the posting based on the supplied location details, latitude and longitude will be set to null values.
	 
	 * @example
	 * [["SFO",37.77493,-122.41942],["LAX",34.05223,-118.24368]]
	 
	 * @example
	 * var textLocation = prompt('Enter a location to geocode', 'San Francisco, California');
	 * var textLocation2 = prompt('Enter another location to geocode', 'Los Angeles, California');
	 * var data = [
	 * 	{text: textLocation},
	 * 	{text: textLocation2}
	 * ];
	 * threeTapsGeocoderClient.geocode(JSON.stringify(data), callback);
	 */
	geocode: function(data, callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
			,data: data
		};
		return this.client.request(this.path, 'geocode', null, params, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('geocoder', threeTapsGeocoderClient);

/**
 * @class The Reference API provides a mechanism for accessing the standard "reference information" used by the 3taps system.
 * 
 * There are currently three types of reference information: locations, categories, and data sources.
 * 
 * @constructor
 */
var threeTapsReferenceClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsReferenceClient.prototype = {
	client: null,

	auth: false,
	path: '/reference/',
	
	/**
	 * @public
	 
	 * @restStructure GET /reference/category
	 * @restUrlExample http://3taps.net/reference/category

	 * @desc Returns the 3taps categories. Note that you can limit the list of returned categories by passing in a category code: http://3taps.net/reference/category/VAUT
	 
	 * @param {Boolean} annotations set to false if you'd prefer to get the category data without annotations. (optional)
	 
	 * @return {Array} The body of the response will be a JSON-encoded list of category objects. 
	 * 
	 * Each category object may have the following fields:
	 * 
	 * <table>
	 *     <tr>
	 *         <td>group</td><td>STRING</td><td>The name of the group of this category.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>category</td><td>STRING</td><td>The name of the category.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>code</td><td>STRING</td><td>A unique three character code identifying this category within the system.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>hidden</td><td>BOOLEAN</td><td>If this has the value "1", the category should be hidden in the system's user-interface.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>annotations</td><td>OBJECT</td><td>A JSON-encoded list of annotation objects.  See below for more information on annotations.</td>
	 * </table>
	 *
	 * Each annotation object may have the following fields:
	 *
	 * <table>
	 *	<tr>
	 *		<td>name</td><td>STRING</td><td>The name of this annotation.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>type</td><td>STRING</td><td>The type of the annotation.  Possible types currently include "string", and "number".</td>
	 *	</tr>
	 *	<tr>
	 *		<td>options</td><td>ARRAY</td><td>Suggested values for the annotation.  Note that suggested values can be either of type STRING or OBJECT. In the case that an option is an OBJECT, the option will contain two fields: value and subannotation.  Value will contain the string value of this option, while subannotation will contain an annotation object that can be applied to a posting or search if this option is selected.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>min</td><td>INTEGER</td><td>In the case that the type of an annotation is number, a minimum value can be specified.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>max</td><td>INTEGER</td><td>In the case that the type of annotation is number, a maximum value can be specified.</td>
	 *	</tr>
	 * </table>
	 
	 * @example
	 *	[
	 *		{
	 *			"group":"For Sale",
	 *			"category":"Art & Crafts",
	 *			"code":"SANC",
	 *			"annotations":[
 	 *				{
	 *					"name":"Privacy Status",
	 *					"type":"string",
	 *					"options":[
	 *						"anonymous",
	 *						"semi-anonymous",
	 *						"public"
	 *					]
	 *				},
	 *				{
	 *					"name":"Registry Status",
	 *					"type":"string",
	 *					"options":[
	 *						"own",
	 *						"sell",
	 *						"for free",
	 *						"share",
	 *						"auction",
	 *						"want \/ seek",
	 *						"deal",
	 *						"provide",
	 *						"lost",
	 *						"stolen",
	 *						"found \/ recovered",
	 *						"lease \/ sub-lease",
	 *						"leased",
	 *						"sold \/gone \/ expired"
	 *					]
	 *				},
	 *				{
	 *					"name":"Price",
	 *					"type":"string"
	 *				},
	 *				{
	 *					"name":"UID",
	 *					"type":"string"
	 *				}
	 *			]
	 *		}
	 *	]

	 
	 * @example
	 * threeTapsReferenceClient.category(callback);
	 */
	category: function(callback) {
		return this.client.request(this.path, 'category', null, null, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure GET /reference/location
	 * @restUrlExample http://3taps.net/reference/location

	 * @desc Returns the 3taps locations
	 
	 * @param
	 
	 * @return {Array} The body of the response will be a JSON-encoded list of location objects. Note that you can limit the list of returned locations by passing in a location code: http://3taps.net/reference/location/NYC
	 * 
	 * Each location object will have these fields:
	 * 
	 * <table>
	 *     <tr>
	 *         <td>countryRank</td><td>INT</td><td>A number used to sort the countries into a useful order (ie, to place the US at the top, and "Other" at the bottom).</td>
	 *     </tr>
	 *     <tr>
	 *         <td>country</td><td>STRING</td><td>The name of the country this location is within.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>cityRank</td><td>INT</td><td>A number used to sort the cities within a country into a useful order (eg, to place the most popular cities at the top, and "Other" at the bottom).</td>
	 *     </tr>
	 *     <tr>
	 *         <td>city</td><td>STRING</td><td>The name of the city within this country.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>stateCode</td><td>STRING</td><td>A brief (usually two-letter) code for the state or region this location is in.  This will be blank for countries which do not have states or regions.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>stateName</td><td>STRING</td><td>The name of the state or region this location is in.  This will be blank for countries which do not have states or regions.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>code</td><td>STRING</td><td>A unique three letter code identifying this location.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>hidden</td><td>BOOLEAN</td><td>If this has the value "1", the location should be hidden in the system's user-interface.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>latitude</td><td>FLOAT</td><td>The latitudinal coordinate of this location.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>longitude</td><td>FLOAT</td><td>The longitudinal coordinate of this location.</td>
	 *     </tr>
 	 * </table>
	 
	 * @example
	 *	[
	 *		{
	 *			"countryRank":1,
	 *			"country":"United States",
	 *			"cityRank":1,
	 *			"city":"New York",
	 *			"stateCode":"NY",
	 *			"stateName":"New York",
	 *			"code":"NYC",
	 *			"latitude":40.6344,
	 *			"longitude":-74.2827
	 *		}
	 *	]	
 
	 * @example
	 * threeTapsReferenceClient.location(callback);
	 */
	location: function(callback) {
		return this.client.request(this.path, 'location', null, null, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure GET /reference/source
	 * @restUrlExample http://3taps.net/reference/source

	 * @desc Returns the 3taps sources
	 
	 * @param
	 
	 * @return {Array} The body of the response will be a JSON-encoded list of source objects. Note that you can limit the list of returned objects by passing in a source code: http://3taps.net/reference/source/E_BAY
	 * 
	 * Each source will have these fields:
	 * 
	 * <table>
 	 *     <tr>
	 *         <td>name</td><td>STRING</td><td>The name of the source.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>code</td><td>STRING</td><td>The 5-character code for this source.</td>
	 *     </tr>
	 *		<tr>
	 *				<td>logo_url</td><td>STRING</td><td>The URL of the logo to use for this source.</td>
 	 * 		</tr>
	 *		<tr>
	 *				<td>logo_sm_url</td><td>STRING</td><td>The URL of a smaller, square logo to use for this source.</td>
	 * 		</tr>
	 * </table>
	 
	 * @example
	 *		[
	 *			{
	 *				"name":"3taps",
	 *				"code":"3TAPS",
	 *				"logo_url":"http:\/\/3taps.com\/img\/logos\/3TAPS3taps.png",
	 *				"logo_sm_url":"http:\/\/3taps.com\/img\/logos\/3TAPS3taps-fav.png"
	 *			},
	 *			{
	 *				"name":"9-1-1alert",
	 *				"code":"9-1-1",
	 *				"logo_url":"http:\/\/3taps.com\/img\/logos\/9-1-19-1-1.png",
	 *				"logo_sm_url":"http:\/\/3taps.com\/img\/logos\/9-1-19-1-1fav.png",
	 *				"hidden":true
	 *			},
	 *			{
	 *				"name":"Amazon",
	 *				"code":"AMZON",
	 *				"logo_url":"http:\/\/3taps.com\/img\/logos\/AMZONamazon.png",
	 *				"logo_sm_url":"http:\/\/3taps.com\/img\/logos\/AMZONamazon-fav.png"
	 *			},
	 *			{
	 *				"name":"craigslist",
	 *				"code":"CRAIG",
	 *				"logo_url":"http:\/\/3taps.com\/img\/logos\/CRAIGcraigslists.png",
	 *				"logo_sm_url":"http:\/\/3taps.com\/img\/logos\/craig_ico.png"
	 *			} 
	 *		]
	 * @example
	 * threeTapsReferenceClient.source(callback);
	 */
	source: function(callback) {
		return this.client.request(this.path, 'source/get', null, null, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('reference', threeTapsReferenceClient);

/**
 * @class The Posting API accepts incoming data in a standardized format that is then added to the posting database.
 * 
 * What is a Posting?
 * 
 * A posting is the central unit of data on which the 3taps Network operates. Each posting has:
 * 
 * A source, which is a 5-character code identifying where this posting came from.
 * 
 * A category, which is a 4-character code identifying the search category to associate with this posting. The category must be supplied.
 * 
 * A location, which is a 3-character code identifying the location at which this post resides. The location will generally be supplied, but is optional.
 * 
 * A latitude and longitude value, which are floating-point numbers representing the real or estimated GPS location for the posting, in decimal degrees.
 * 
 * A language, which is a two-letter code defining the language used by this posting. Note that the language code must conform to the ISO 639-1 standard.
 * 
 * A heading, which is a short (up to 255-character long) piece of text that summarizes the posting. The heading is optional.
 * 
 * Some body text, which can be up to 5,000 characters long. This can contain any text you like.
 * 
 * A price, which is the price associated with this posting, if any.
 * 
 * A currency, which is a three-letter code identifying which currency the price is in. Note that the currency code must conform to the ISO 4217 standard.
 * 
 * A posting key, which is an eight-character string that uniquely identifies this posting within the 3taps system.
 * 
 * An optional password which an anonymous user can enter to identify themselves as the author of a posting.
 * 
 * One ore more optional images.
 * 
 * An optional external URL which links back to the original source of the posting.
 * 
 * An optional account name which identifies the author of the posting in the originating system.
 * 
 * The 3taps user ID of the person who made this posting, if it is known.
 * 
 * A timestamp indicating the date and time at which this posting was made.
 * 
 * An expiration date/time indicating when the posting should be deleted from the 3taps system.
 * 
 * An external ID, which is simply a piece of text which can be used to find the original posting in some external system. The 3taps network simply stores this value if it has been provided, and does not use this information in any way.
 * 
 * A set of annotations providing additional meta-data about this posting. The annotations can be any data structure encoded using the JSON format. Note that these annotations can come from an untrusted source.
 * 
 * A set of trustedAnnotations which provide additional "trusted" meta-data about this posting. As with the annotations, the trusted annotations are a JSON-encoded string containing any arbitrary data structure. The trusted annotations can only come from 3taps or some other authorised source.
 * 
 * The rawData, which is simply some text or binary data copied directly from an external system.
 
 * @constructor
 */
var threeTapsPostingClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsPostingClient.prototype = {
	client: null,

	auth: false,
	path: '/posting/',
	
	/**
	 * @public
	 
	 * @restStructure POST /posting/exists

	 * @desc The exists request queries the system to see if postings exist in the database, based on their source and external ID.

	 * @param {Array} ids a JSON encoded array of objects with two fields: source and externalID.
	 * @param

	 * @return {Array} a JSON encoded array of objects with the following fields:
	 * <table> 
	 * <tr><td>exists</td><td>Boolean</td><td>Returns true if this posting exists.</td></tr>
	 * <tr><td>postKey</td><td>String</td><td>The postKey of the post.</td></tr>
	 * <tr><td>indexed</td><td>String</td><td>The date that the posting was indexed by 3taps.</td></tr>
	 * <tr><td>failures</td><td>Array</td><td>A JSON array of the failed attempts at saving this posting.  Each failed attempt is represented as a JSON object with the following fields:
	 * 	<table>
	 * 		<tr><td>postKey</td><td>String</td><td>The postKey that was issued for this failed attempt</td></tr>
	 * 		<tr><td>errors</td><td>Array</td><td>An array of JSON objects representing the errors associated with this attempt.</td></tr>
	 * 		<tr><td>timestamp</td><td>Date</td><td>The time that this failure occurred.</td></tr>
		*	</table>
	 * </td></tr>
	 * </table>
	 * 
	 * If exists is false, and no error or time values are present, 3taps has no record of this posting.


	 * @example
	 * [
	 *   {
	 *     "exists": true,
	 *     "postKey": "5NUURN",
	 *     "time": "2011-01-08 00:38:22 UTC"
	 *   },
	 *   {
	 *     "exists": false,
   *		 "error": "Heading cannot be null"
	 *     "time": "2011-01-08 00:38:22 UTC"
	 *   },
	 *   {
	 *     "exists": false
	 *   }
	 * ] 
	 * 
	 * @example
	 * var ids = [
	 * 	{source: 'E_BAY', externalID: 220721553191},
	 * 	{source: 'CRAIG', externalID: 191},
	 * 	{source: 'AMZON', externalID: 370468535518}
	 * ];
	 * threeTapsPostingClient.exists(JSON.stringify(ids), callback);
	 */
	exists: function(ids, callback) {
		var params = {
			ids: ids
		};
		return this.client.request(this.path, 'exists', null, params, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 * @function
	 * @name delete
	 * @memberOf threeTapsPostingClient
	 
	 * @restStructure POST /posting/delete
	 
	 * @desc The delete request deletes postings from the 3taps posting database.

	 * @param {String} agentID The agentID should be a string identifying the entity which is sending this request. Note that entities which are not whitelisted can only request geocoding for one posting at a time, and will be liable to rate limiting.
	 * @param {String} authID The authID value is a string which authorizes the external system to make this request.  The specific value to send will be defined when the external system is whitelisted.  For non-whitelisted systems, this should be left blank.
	 * @param {Array} data data should be a JSON-encoded array with one entry for each posting to be deleted. Each posting’s entry in the array should be a string consisting of the posting key for the posting to be deleted.

	 * @return {Array} The body of the response should consist of a JSON-encoded array with one entry for each posting that was included in the request. Each array entry should be an integer with the value 1 if the posting was successfully deleted, or 0 if the posting could not be deleted (for example, because the posting has already been deleted).
	 
	 * @example
	 * [1,1,1]
	 
	 * @example
	 * var postKeys = ['X7J67W', 'X7JZDY'];
	 * threeTapsPostingClient.delete(JSON.stringify(postKeys), callback);
	 
	 * @sampleCodeRun hide
	 */
	'delete': function(data, callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
			,data: data
		};
		return this.client.request(this.path, 'delete', null, params, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure GET /posting/error/[postKey]
	 * @restUrlExample http://3taps.net/posting/error/X7J67W

	 * @desc Returns errors found when trying to process the given posting.

	 * @param {String} postKey The posting key for the desired posting. This is in the URL, not a GET or POST parameter!
	 * @param

	 * @return {String} The body of the response will consist of a JSON object with some or all of the following fields:
	 * 
	 * fields - The fields submitted for this posting.
	 * 
	 * post - The values submitted for this posting.
	 * 
	 * errors - An array of errors found in the posting.
	 
	 * @example {String}
	 * { 
	 *   "fields": "[\"source\",\"category\",\"location\",\"latitude\",\"longitude\",\"heading\",\"body\",\"images\",\"externalURL\",\"userID\",\"accountName\",\"timestamp\",\"currency\",\"price\",\"expiration\",\"externalID\",\"contextualTags\",\"language\",\"annotations\",\"trustedAnnotations\"]", 
	 *   "post": "[\"e_bay\",\"SAPP\",\"GBR\",54,-4,\"BNWT FRANK USHER ELEGANT LONG BLACK COCKTAIL DRESS sz12\",\"\",[\"http://galleryplus.ebayimg.com/ws/web/300516584005_1_0_1.jpg\"],\"http://cgi.ebay.com/BNWT-FRANK-USHER-ELEGANT-LONG-BLACK-COCKTAIL-DRESS-sz12-/300516584005?pt=Women_s_Clothing\",\"\",\"milly-jo\",\"20110118195058\",\"USD\",75,\"20110303195058\",\"300516584005\",[],\"EN\",\"{\\\"post\\\":{\\\"ship_to_locations\\\":{\\\"0\\\":\\\"Worldwide\\\"}}}\",\"{\\\"post\\\":{\\\"ship_to_locations\\\":{\\\"0\\\":\\\"Worldwide\\\"}}}\"]", 
	 *   "errors": [ "externalID must be unique for this source" ] 
	 * }
	 
	 * @example
	 * threeTapsPostingClient.error('BDY9VCA', callback);
	 */
	error: function(postID, callback) {
		return this.client.request(this.path, 'error/' + postID, null, null, function(results) {
			callback(results);
		});
	},

	/**
	 * @public
	 
	 * @restStructure GET /posting/get/[postKey]
	 * @restUrlExample http://3taps.net/posting/get/X7J67W

	 * @desc The get request returns information about a single posting. 

	 * @param {String} postKey The posting key for the desired posting. This is in the URL, not a GET or POST parameter!
	 * @param

	 * @return {Array} The body of the response will consist of a JSON-encoded object with some or all of the following fields:
	 * 
	 * source is a 5-character code identifying where this posting came from [required].
	 * 
	 * category is a 4-character code identifying the search category to associate with this posting [required].
	 * 
	 * location is a 3-character code identifying the location at which this post resides. If the posting does not have a location, an empty string should be supplied [required].
	 * 
	 * latitude is a floating-point number representing the real or estimated GPS latitude for this posting, in decimal degrees [optional].
	 * 
	 * longitude is a floating-point number representing the real or estimated GPS longitude for this posting, in decimal degrees [optional].
	 * 
	 * language is a two-character code identifying the language. If supplied, this must match one of the valid ISO 693-1 language codes [optional].
	 * 
	 * heading is a short (up to 255-character long) piece of text that summarizes the posting [required].
	 * 
	 * body is the body text to use for this posting, up to 5,000 characters long [optional].
	 * 
	 * price is the optional price to associate with this posting, as a floating-point number [optional].
	 * 
	 * currency is the three-letter code identifying which currency the price is in. If supplied, this must match one of the valid ISO 4217 currency codes [must be present if a price has been supplied].
	 * 
	 * images is the set of images associated with this posting, presented as a JSON encoded array of URLs.
	 * 
	 * externalURL the external URL of this posting.
	 *
	 * externalUrl same as externalURL [deprecated].
	 * 
	 * accountName is a string containing the account name of the author of the posting in the originating system [optional].
	 * 
	 * userID should be the ID of the user who created this posting, as a string. If the user is not known, this should be set to an empty string [optional].
	 * 
	 * timestamp should be the date and time at which this posting was made, as a string in YYYYMMDDHHMMSS format, in UTC. If no timestamp is specified, an empty string should be passed instead [optional].
	 * 
	 * expiration should be the date and time at which this posting should be deleted from the system, as a string in YYYYMMDDHHMMSS format, in UTC. If no expiration date/time value is specified, the system will calculate a default expiration date based on the posting’s source [optional].
	 * 
	 * externalID can be any text that identifies this posting in an external system. It should be an empty string if this value is not supplied [optional].
	 * 
	 * externalId same as externalID [deprecated]
	 * 
	 * annotations is a JSON encoded object of key/value pairs associated with the posting
	 * 
	 * rawData is a string, up to 65,535 characters long, containing the raw data copied from some external source [optional].
	 
	 * @example {String}
	 * {
   *   "heading":"OHSEN Dual Time Chronograph Alarm Mens Sport Watch Blue",
   *   "body":"This is a mens blue sports watch.",
   *   "source":"E_BAY",
   *   "location":"HKG",
   *   "category":"SGJE",
   *   "latitude":22.2855,
   *   "longitude":114.158,
   *   "price":0.99,
   *   "currency":null,
   *   "images":["http://thumbs1.ebaystatic.com/pict/1505272809088080_1.jpg", "http://thumbs2.ebaystatic.com/pict/1232ed.jpg"],
   *   "externalUrl":"http://cgi.ebay.com/OHSEN-Dual-Time-Chronograph-Alarm-Mens-Sport-Watch-Blue-/150527280908?pt=UK_Jewelery_Watches_Watches_MensWatches_GL",
   *   "userID":"shopping.power2",
   *   "timestamp":"20101130232514",
   *   "annotations": {
   *		"tags":["#eBay","#forsale","#jewelry","#HKG"],
   *		"ship_to_locations":{"0":"Worldwide"}
   *		},
   *   "externalId":"150527280908",
   *   "postKey":"X7J67W",
   *   "id":496269986,
   *   "trusted":null,
   *   "accountName":"shopping.power2",
   *   "clickCount":null,
   *   "accountId":null,
   *   "expiration":null,
   *   "comments":[]
	 * }
	 
	 * @example
	 * threeTapsPostingClient.get('X7J67W', callback);
	 */
	get: function(postID, callback) {
		return this.client.request(this.path, 'get/' + postID, null, null, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure POST /posting/create

	 * @desc The create request is used to send new postings to 3taps.
	 * 
	 * The posting API will attempt to process each of the supplied postings in turn, checking the validity of the posting (for example, ensuring that field lengths are not exceeded, that the category and location codes match up against the master list of all known categories and locations, checking that the timestamp is valid, etc). If it is acceptable, the posting will have a unique posting key calculated, a copy of the posting will be sent to the Notifier Service so that external data consumers can be notified about the posting, and the posting will be added to 3taps. Upon completion, a response will be sent back listing the posting key and initial pre-processing success for each posting.

	 * @param {Array} posts posts should be a JSON-encoded array of JSON objects, one for each posting to be sent to 3taps.
	 * Each posting object may contain the following attributes:
	 * 
	 * <table>
	 * <tr><td>source</td><td>String</td><td>a 5-character code identifying where this posting came from [required].</td></tr>
	 * <tr><td>category</td><td>String</td><td>a 4-character code identifying the search category to associate with this posting [required].</td></tr>
	 * <tr><td>location</td><td>String</td><td>a 3-character code identifying the location at which this post resides. If the posting does not have a location, an empty string should be supplied [required].</td></tr>
	 * <tr><td>latitude</td><td>Number</td><td>a floating-point number representing the real or estimated GPS latitude for this posting, in decimal degrees [optional].</td></tr>
	 * <tr><td>longitude</td><td>Number</td><td>a floating-point number representing the real or estimated GPS longitude for this posting, in decimal degrees [optional].</td></tr>
	 * <tr><td>language</td><td>String</td><td>a two-character code identifying the language. If supplied, this must match one of the valid ISO 693-1 language codes [optional].</td></tr>
	 * <tr><td>heading</td><td>String</td><td>a short (up to 255-character long) piece of text that summarizes the posting [required].</td></tr>
	 * <tr><td>body</td><td>String</td><td>the body text to use for this posting, up to 5,000 characters long [optional].</td></tr>
	 * <tr><td>price</td><td>Number</td><td>the optional price to associate with this posting, as a floating-point number [optional].</td></tr>
	 * <tr><td>currency</td><td>String</td><td>the three-letter code identifying which currency the price is in. If supplied, this must match one of the valid ISO 4217 currency codes [must be present if a price has been supplied].</td></tr>
	 * <tr><td>images</td><td>Array</td><td>an array of image URLs to associate with this posting.</td></tr>
	 * <tr><td>externalURL</td><td>String</td><td>the external URL to use for this posting [optional].</td></tr>
	 * <tr><td>accountName</td><td>String</td><td>the account name of the author of the posting in the originating system [optional].</td></tr>
	 * <tr><td>accountID</td><td>String</td><td>the ID of the user who created this posting in the originating system [optional].</td></tr>
	 * <tr><td>timestamp</td><td>Date</td><td>the date and time at which this posting was made, as a string in 'YYYY-MM-DD HH:MM:SS' format, in UTC [required].</td></tr>
	 * <tr><td>expiration</td><td>Date</td><td>the date and time at which this posting should be deleted from the system, as a string in 'YYYY-MM-DD HH:MM:SS' format, in UTC. If no expiration date/time value is specified, the system will calculate a default expiration date based on the posting's source [optional].</td></tr>
	 * <tr><td>externalID</td><td>String</td><td>can be any text that identifies this posting in an external system [optional].</td><tr>
	 * <tr><td>annotations</td><td>Object</td><td>a JSON object containing the annotation key/value pairs that should be applied to this posting</td>
	 * <tr><td>trustedAnnotations</td><td>Object</td><td>a JSON object containing the trusted annotation key/value pairs that should be applied to this posting</td>
	 * </table>
	 * @param

	 * @return {Array} The body of the response consists consist of a JSON-encoded array with one entry for each posting that was supplied. Each array entry will be a JSON object with the following fields: 
	 *
	 * <table>
	 * <tr><td>postKey</td><td>String</td><td>the postKey generated for this posting.</td></tr>
	 * <tr><td>error</td><td>Object</td><td>If there was an error saving the posting, the error field will contain a JSON object with two fields, code and message, identifying the error.</td></tr>
	 * </table>
	 
	 * @example
	 * [{postKey:"X73XFN"}, {error:{code: 5, message: "Duplicate externalID for this source."}}]
	 
	 * @example
	 * var posting1 = {
	 * 	source: 'E_BAY',
	 * 	category: 'SGBI',
	 * 	location: 'LAX',
	 * 	heading: 'Test Post 1 in Bicycles For Sale Category',
	 * 	body: 'This is a test post. One.',
	 * 	price: 1.00,
	 * 	currency: 'USD',
	 * 	annotations: {
	 *		color: 'red',
	 *		brand: 'Specialized'
	 * 	},
	 * 	externalURL: 'http://www.ebay.com'
	 * };
	 * var posting2 = {
	 * 	source: 'E_BAY',
	 * 	category: 'SGBI',
	 * 	location: 'LAX',
	 * 	heading: 'Test Post 2 in Bicycles For Sale Category',
	 * 	body: 'This is a test post. Two.',
	 * 	price: 2.00,
	 * 	currency: 'USD',
	 * 	externalURL: 'http://www.ebay.com/3jua8'
	 * };
	 * var postings = [posting1, posting2];
	 * threeTapsPostingClient.create(JSON.stringify(postings), callback);
	 
	 * sampleCodeRun hide
	 */
	create: function(data, callback) {
		var params = {
			data: data
		};
		return this.client.request(this.path, 'create', null, params, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure POST /posting/update

	 * @desc Calculate the location for a posting

	 * @param {String} agentID The agentID should be a string identifying the entity which is sending this request. Note that entities which are not whitelisted can only request geocoding for one posting at a time, and will be liable to rate limiting. (optional)
	 * @param {String} authID The authID value is a string which authorizes the external system to make this request.  The specific value to send will be defined when the external system is whitelisted.  For non-whitelisted systems, this should be left blank. 
	 * @param {Array} data data should be a JSON-encoded array with one entry for each posting to be updated. Each posting's entry in the array should itself be an array with two entries: [postingKey, changes], where postingKey is the posting key identifying the posting to update, and changes is a JSON object mapping field names to their updated values.
	 * 

	 * @return {Array} the body of the response should consist of a JSON-encoded array with one entry for each posting that was included in the request. Each array entry should be an integer with the value 1 if the posting was successfully updated, or 0 if the posting could not be updated (for example, because the posting has been deleted or there was a problem with the supplied changes).
	
	 * @example
	 * [1, 1]
 
	 * @example
	 * var posting1 = ['X73XFN', {accountName: "anonymous-X73XFN@mailserver.com"}];
	 * var posting2 = ['X73XFP', {price: 20.00}];
	 * var data = [posting1, posting2];
	 * threeTapsPostingClient.update(data, callback);
	 */
	update: function(data, callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
			,data: data
		};
		return this.client.request(this.path, 'update', null, params, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('posting', threeTapsPostingClient);

/**
 * @class The 3taps Notifier constantly monitors all incoming postings, and sends out notifications via email, XMPP, Twitter, or iPhone Push  as postings that match certain criteria are received.  External users and systems are able to send a request to the Notification API to have notifications sent out to a given destination for all postings that meet a given set of criteria.  These notifications will continue to be sent out until the request is explicitly cancelled or the request expires, usually after a period of seven days.
 * @constructor
 */
var threeTapsNotificationsClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsNotificationsClient.prototype = {
	client: null,

	auth: false,
	path: '/notifications/',

	/**
	 * @public
	 
	 * @restStructure POST /notifications/firehose

	 * @desc Creates an XMPP firehose.  A variant of create().

	 * @param {String} name The name to give this firehose (optional)
	 * @param {String} text The text postings need to be sent to this firehose
   * @param {String} source The source code postings need to be sent to this firehose
   * @param {String} location The location code postings need to be sent to this firehose
   * @param {String} category The category code postings need to be sent to this firehose

	 * @return {String} A JSON encoded object with the following fields:
	 *
	 * <table>
	 *	<tr>
	 *		<td>success</td>
	 *		<td>true/false depending on if the subscription was successfully deleted.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>jid</td>
	 *		<td>The XMPP jid of the newly created firehose.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>username</td>
	 *		<td>The username of the jid account of the newly created firehose.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>password</td>
	 *		<td>The password of the jid account of the newly created firehose.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>id</td>
	 *		<td>The id of the subscription associated with the firehose (to be used with delete())</td>
	 *	</tr>
	 *	<tr>
	 *		<td>secret</td>
	 *		<td>The secret key to use when deleting this firehose (to be used with delete())</td>
	 *	</tr>
	 *	<tr>
	 *		<td>error</td>
	 *		<td>If the firehose could not be created, error will be a JSON encoded object with two fields: code, and message.</td>
	 *	</tr>
	 * </table>
	 
	 * @example
	 * {"success":true, "jid":"honda-vaut-lax@firehose.3taps.net"}
	 
	 * @example
	 * var params = {
	 *	text: 'honda',
	 *	category: 'VAUT',
	 *	location: 'LAX',
	 *	name: 'Hondas in LA'
	 * }
	 * threeTapsNotificationsClient.firehose(params, callback);
	 */
	firehose: function(params, callback) {
    return this.client.request(this.path, 'firehose', null, params, function(results) {
      callback(results);
    });
  },

	/**
	 * @public
	 * @function
   * @name delete
   * @memberOf threeTapsNotificationsClient
	 
	 * @restStructure POST /notifications/delete

	 * @desc Cancel a notification subscription.

	 * @param {String} secret The secret key that was returned to you when you created the notification subscription.  You kept it, right?
	 * @param {String} id The id of the notification subscription to delete.

	 * @return {String} A JSON encoded object with the following fields:
	 *
	 * <table>
	 *	<tr>
	 *		<td>success</td>
	 *		<td>true/false depending on if the subscription was successfully deleted.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>error</td>
	 *		<td>If the delete was unsuccessful, error will contain a JSON encoded object with two fields: code, and message.</td>
	 *	</tr>
	 * </table>
	 
	 * @example
	 * {"success":true}
	 
	 * @example
	 * var params = {
	 *	id: 1873,
	 *	secret: "201d7288b4c18a679e48b31c72c30ded"
	 * }
	 * threeTapsNotificationsClient.delete(params, callback);
	 */
	'delete': function(params, callback) {
    return this.client.request(this.path, 'delete', null, params, function(results) {
      callback(results);
    });
  },


	/**
	 * @public
	 * @function
   * @name get
   * @memberOf threeTapsNotificationsClient
	 
	 * @restStructure GET /notifications/get

	 * @desc Get information about a notification subscription.

	 * @param {String} secret The secret key that was returned to you when you created the notification subscription.  You kept it, right?
	 * @param {String} id The id of the notification subscription to retrieve information for.

	 * @return {String} A JSON encoded object with the following fields:
	 *
	 * <table>
	 *  <tr>
	 *		<td>subscription</td>
	 *		<td>a JSON object containing information about the notification subscription.</td>
	 *	</tr>
	 *	<tr>
	 *		<td>error</td>
	 *		<td>If the request was unsuccessful, error will contain a JSON encoded object with two fields: code, and message.</td>
	 *	</tr>
	 * </table>
	 
	 * @example
	 * {"subscription":{"expiration":"2010-12-25 10:44:45 UTC"}}
	 
	 * @example
	 * var params = {
	 *	id: 1873,
	 *	secret: "201d7288b4c18a679e48b31c72c30ded"
	 * }
	 * threeTapsNotificationsClient.get(params, callback);
	 */
	'get': function(params, callback) {
    return this.client.request(this.path, 'get', null, params, function(results) {
      callback(results);
    });
  },

	/**
	 * @public
	 
	 * @restStructure GET /notifications/create

	 * @desc Ask the notifier to start sending out notifications by creating a new "subscription".
   *
   * Subscriptions need one delivery param (email, jid, token) and at least one filter (text, source, cat, loc)
   *
   * In order to eliminate unwanted strain on both the notification server and clients, the system will examine filter criteria before creating a subscription to make sure that the criteria is not too broad.  If you try to subscribe to "all of eBay" you will get an error telling you to narrow your criteria.
   
   * @param {String} name The name to give this subscription.  This will be included in iPhone Push notifications.  (optional).
   * @param {String} text If set, postings with this text in the body, header, or annotations will qualify for notification.
   * @param {String} source If set, postings with this source will qualify for notification.  This value should be a 5-letter source code (ex: E_BAY, CRAIG).
   * @param {String} location If set, postings with this location will qualify for notification.  This value should be a 3-letter source code (ex: LAX, NYC).
   * @param {String} category If set, postings with this location will qualify for notification.  This value should be a 4-letter category code (ex: VAUT, JOBS)
   * @param {String} annotations If set, postings with these annotations will qualify for notification.  This value should be a JSON encoded object
   * @param {Integer} expiration The number of days to keep this subscription around for (default 7 days)
   * @param {String} format defines how the notifications should be formatted.  The following formats are currently supported:
	 *
	 *             <table>
	 *                 <tr>
	 *                     <td>push</td>
	 *                     <td>This format is intended for iPhone push notifications.  The notification includes the following information in a single line: subscription name; the number of notifications received on this subscription today; the heading of the post. 
	 *                 </tr>
 	 *                 <tr>
	 *                     <td>brief</td>
	 *                     <td>This format is intended for short, human-readable messages such as watching notifications on a chat client.  The notification has two lines for the post: the heading, followed by a line break and the URL used to access the post within the 3taps system.</td>
	 *                 </tr>
	 *                 <tr>
	 *                     <td>full
	 *                         extended</td>
	 *                      <td>These two formats are intended for sending notifications to external systems for further use.  The data is sent as a JSON-encoded array with two entries: [fieldList, postings], where fieldList is an array of field names, and postings is an array of postings, where each posting is itself an array of field values, in the same order as the fieldList list.
	 * 
	 *                          For the full format, the following fields will be included:
	 * 
	 *                          postKey
	 *                          source
	 *                          category
	 *                          location
	 *                          heading
	 *                          body
	 *                          workspaceURL
	 *                          created
	 * 
	 *                          The extended format includes all the fields from the full format, plus:
	 * 
	 *                          externalURL
	 *                          externalID
	 *                          trustedAnnotations
	 *                          latitude
	 *                          longitude
	 *                          price
	 *                          currency
	 *                          language</td>
	 *                  </tr>
	 *                  <tr>
	 *                      <td>html</td>
	 *                      <td>This format is intended for human-readable notifications such as emails.  The following information is presented in HTML format:
	 * 
	 *                          postKey
	 *                          source
	 *                          category
	 *                          location
	 *                          heading
	 *                          body
	 *                          workspaceURL
	 *                          created</td>
	 *                  </tr>
	 *                  <tr>
	 *                      <td>text140</td>
	 *                      <td>This format is intended to send notifications to Twitter; a minimal set of fields are included, and limited to 140 characters so that the notification can be sent out as a Twitter status update.</td>
	 *                  </tr>
	 *              </table>
	 *
	 *	If you leave format out, we'll use a sensible default.
	 * 
   * @param {String} email The email address to send this notification to.
   * @param {String} jid The XMPP JID to send this notification to.
   * @param {String} token The iPhone Device Token to send this notification to. (Note that you should only supply one of email, jid, or token.)    
   * @param {String} app The name of the app this notification subscription is being created from. (optional)
	 
	 * @example
	 * {"success":true,"id":"1840","secret":"201d7288b4c18a679e48b31c72c30ded"}
	 
	 * @example
	 * var params = {
	 * 	text: 'red',
	 * 	location: 'LAX',
	 * 	source: 'CRAIG',
	 * 	annotations: '{price:"200",make:"honda"}',
	 * 	email: 'dfoley@3taps.com',
	 * 	name: 'red things in los angeles'
	 * };
	 * threeTapsNotificationsClient.create(params, callback);

	 * @return {String} The body of the response should consist of a JSON-encoded array with the following values.
	 *	<table>
	 *		<tr>
	 *			<td>success</td>
	 *			<td>true or false, depending on if the notification subscription was successfully created.</td>
	 *		</tr>
	 *		<tr>
	 *			<td>id</td>
	 *			<td>The id of the newly created subscription. This field is only returned on success.</td>
	 *		</tr>
	 *		<tr>
	 *			<td>secret</td>
	 *			<td>The secret pass for the newly created subscription, required for deleting subscriptions.  This field is only returned on success.</td>
	 *		</tr>
	 *		<tr>
	 *			<td>error</td>
	 *			<td>If there was a problem with the API request, the error message will be included here as a JSON object with two fields: code, and message.  This field is only returned on failure.</td>
	 *		</tr>
	 *	</table>
	 * */
	create: function(params, callback) {
		return this.client.request(this.path, 'create', null, params, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('notifications', threeTapsNotificationsClient);

/**
 * @class The Search API accepts incoming search requests, and returns information about matching postings back to the caller.
 * 
 * @constructor
 */
var threeTapsSearchClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsSearchClient.prototype = {
	client: null,

	auth: false,
	path: '/search/',
	
	/**
	 * @public
	 * @function
	 * @name search
	 * @memberOf threeTapsSearchClient
	 
	 * @restStructure GET /search?[param]=[value]&[param2]=[value2]...
	 * @restUrlExample http://3taps.net/search?source=E_BAY&location=LAX

	 * @desc The search method creates a new search request.

	 * @param {Integer} rpp The number of results to return for a synchonous search. If this is not specified, a maximum of ten postings will be returned at once.  If this is set to -1, all matching postings will be returned at once.  Note that this is ignored for asynchronous searches.
	 * @param {Integer} page The page number of the results to return for a synchronous search, where zero is the first page of results.  If this is not specified, the most recent page of postings will be returned. Note that this is ignored for asynchronous searches.
	 * @param {String} source The 5-character source code a posting must have if is to be included in the list of search results.
	 * @param {String} category The 4-character category code a posting must have if it is to be included in the list of search results. Note that multiple categories can be searched by passing in multiple category codes, separated by +OR+.
	 * @param {String} location The 3-character location code a posting must have if it is to be included in the list of search results. Note that multiple locations can be searched by passing in multiple location codes, separated by +OR+.
	 * @param {String} heading A string which must occur within the heading of the posting if it is to be included in the list of search results.
	 * @param {String} body A string which must occur within the body of the posting if it is to be included in the list of search results.
	 * @param {String} text A string which must occur in either the heading or the body of the posting if it is to be included in the list of search results.
	 * @param {String} poster The user ID of the person who created the posts.  If this is specified, only postings created by the specified user will be included in the list of search results.
	 * @param {String} externalID A string which must match the "externalID" field for a posting if it is to be included in the list of search results.
	 * @param {String} start (YYYY-MM-DD HH:MM:SS) This defines the desired starting timeframe for the search query.  Only postings with a timestamp greater than or equal to the given value will be included in the list of search results.  Note: all times in 3taps are in UTC.
	 * @param {String} end (YYYY-MM-DD HH:MM:SS) This defines the desired ending timeframe for the search query.  Only postings with a timestamp less than or equal to the given value will be included in the list of search results.  Note: all times in 3taps are in UTC.
	 * @param {String} annotations A JSON encoded map of key/value pairs that a posting must have in annotations to be included in the list of search results
	 * @param {String} trustedAnnotations A JSON encoded map of key/value pairs that a posting must have in trusted annotations to be included in the list of search results
	 * @param {String} retvals A comma-separated list of the fields to return for each posting that matches the desired set of search criteria.  The following field names are currently supported:
	 * 
	 * source
	 * category
	 * location
	 * longitude
	 * latitude
	 * heading
	 * body
	 * images
	 * externalURL
	 * userID
	 * timestamp
	 * externalID
	 * annotations
	 * postKey
	 * 
	 * These fields match the fields with the same name as defined in the Posting API.
	 * 
	 * If no retvals argument is supplied, the following list of fields will be returned by default:
	 * 
	 * category
	 * location
	 * heading
	 * externalURL
	 * timestamp

	 * @return {Object} The body of the response is a JSON encoded object with the following fields:
	 *
	 * <table>
	 * <tr>
	 *	<td>success</td><td>boolean</td><td>If the search was a success, this will be true.</td>
	 * </tr>
	 * <tr>
	 *	<td>numResults</td><td>number</td><td>The total number of results found for this search.</td>
	 * </tr>
	 * <tr>
	 *	<td>execTimeMs</td><td>number</td><td>The amount of time it took 3taps to perform your search, in milliseconds.</td>
	 * </tr>
	 * <tr>
	 *	<td>error</td><td>string</td><td>If success is false, error will contain the error message</td>
	 * </tr>
	 * <tr>
	 *	<td>results</td><td>array</td><td>An array of posting objects, each containing the fields specified in retvals</td>
	 * </tr>
	 * </table>
	 
	 * @example
	 * {
	 *   "success": true,
	 *   "numResults": 913,
	 *   "execTimeMs": 2581,
	 *   "results": 
	 *   [
	 *     {
	 *       "category": "VAUT",
	 *       "location": "LAX",
	 *       "source": "CRAIG",
	 *       "heading": "2006 PORSCHE BOXSTER - FACTORY WARRANTY - $23000 ",
	 *       "externalURL": "http://orangecounty.craigslist.org/cto/2168725926.html",
	 *       "timestamp": "2011-01-19 17:26:00 UTC"
	 *     },
	 *     {
	 *       "category": "VAUT",
	 *       "location": "LAX",
	 *       "source": "CRAIG",
	 *       "heading": "1974 Carrera Targa  For sale is a numbers matching \"Ducktail\" Carrera, - $39955 ",
	 *       "externalURL": "http://orangecounty.craigslist.org/ctd/2168630243.html",
	 *       "timestamp": "2011-01-19 16:43:00 UTC"
	 *     }
	 * 	]
	 * }	
	 * 
	 * @example
	 * var params = {
	 *	location: 'LAX+OR+NYC', 
	 *	category: 'VAUT',
	 *	annotations: '{make: "porsche"}'
	 * };
	 * threeTapsSearchClient.search(params, callback);
	 */
	'search': function(params, callback) {
		return this.client.request(this.path, '', params, null, function(results) {
			callback(results);
		});
	},

	/**
	 * @public
	 
	 * @restStructure GET /search/range?fields=[field],[field2]&[param]=[value]&[param2]=[value]

	 * @desc Returns the minium and maximum values currently in 3taps for the given fields, that match the given search parameters. The basic idea here is to provide developers with a method of determining sensible values for range-based filters. Note that this method accepts the same query parameters as the search method.

	 * @param {String} fields A comma-separated list of fields to retrieve the min and max values for. The Search API will look for the min and max values in fields and annotations.

	 * @return {Object} A JSON encoded object with the min and max values for each field.
	 	 
	 * @example
	 * {
	 *	"year":{
	 *		"min":"1965",
	 *		"max":"2011"
	 *	},
	 *	"price":{
	 *		"min":"2000",
	 *		"max":"139000"
	 *	}
	 *}
	 
	 * @example
	 * var params = {
	 *	location: 'LAX', 
	 *	category: 'VAUT',
	 *	annotations: '{make:"porsche"}',
	 *	fields = 'year,price'
	 * };
	 * threeTapsSearchClient.range(params, callback);
	 */
	range: function(params, callback) {
		return this.client.request(this.path, 'range', params, null, function(results) {
			callback(results);
		});
	},

	/**
	 * @public
	 
	 * @restStructure GET /search/summary?dimension=[dimension]&[param]=[value]&[param2]=[value]

	 * @desc Returns the total number of postings found in 3taps, across the given dimension, that match the given search query parameters. For example, searching for "text=toyota" across "dimension=source" would return a list of all sources in 3taps, along with the number of postings matching the search "text=toyota" in that source. All search query parameters are supported. You may currently search across dimensions source, category, and location. At this time, category will only search across top level categories, and location is limited to our top 10 metro areas.

	 * @param {String} dimension The dimension to summarize across: source, category, or location.
	 * @param

	 * @return {Object} A JSON encoded object with the following fields:
	 * <table>
	 * <tr><td>totals</td><td>Object</td><td>A JSON encoded object with one field for each member of the dimension, along with the total found (matching the search query) in that dimension.</td></tr>
	 * <tr><td>execTimeMs</td><td>Number</td><td>The number of milliseconds it took 3taps to retrieve this information for you. Mainly used to let us know if we're slipping up.</td></tr>
	 * </table>
	 	 
	 * @example
	 * {
	 *   "totals": {
	 *     "PDX": 8126,
	 *     "SEA": 9949,
	 *     "PHX": 4472,
	 *     "DFW": 5337,
	 *     "ATL": 3899,
	 *     "SFO": 8774,
	 *     "CHI": 5354,
	 *     "SAN": 17125,
	 *     "NYC": 6406,
	 *     "LAX": 28533
	 *   },
	 *   "execTimeMs": 168
	 * }
	 
	 * @example
	 * var params = {
	 *	text: 'toyota', 
	 *	dimension: 'source'
	 * };
	 * threeTapsSearchClient.summary(params, callback);
	 */
	summary: function(params, callback) {
		return this.client.request(this.path, 'summary', params, null, function(results) {
			callback(results);
		});
	},


	/**
	 * @public
	 
	 * @restStructure GET /search/count?[param]=[value]&[param2]=[value2]...

	 * @desc Returns a JSON object with the number of items matching a given search. Note that this method accepts the same general parameters as the search method.

	 * @param {String} Params see search method params
	 * @param

	 * @return {Object} A JSON object with a single field, count, holding the number of matches found for the given parameters.
	 	 
	 * @example
	 *   {count:913}
	 
	 * @example
	 * var params = {
	 *	location: 'LAX', 
	 *	category: 'VAUT',
	 *	annotations: '{make:"porsche"}'
	 * };
	 * threeTapsSearchClient.count(params, callback);
	 */
	count: function(params, callback) {
		return this.client.request(this.path, 'count', params, null, function(results) {
			callback(results);
		});
	},

	/**
	 * @public
	 * @function
	 * @name bestMatch
	 * @memberOf threeTapsSearchClient
 
	 * @restStructure GET /search/best-match?keywords=[keywords]
	 
	 * @desc Returns the 3taps category associated with the keywords, along with the number of results for that category in 3taps.
	 
	 * @param {String} keyword one or more words to find the best match for.

	 * @return {Object} a JSON object with two fields: category and numResults, containing the 3taps category code and number of results found.
	 	 
	 * @example
	 * {
	 *	category: 'SCOM',
	 *	numResults: 913
	 * }
	 
	 * @example
	 * var params = {
	 *	keywords: 'iPad' 
	 * };
	 * threeTapsSearchClient.bestMatch(params, callback);
	 */
	bestMatch: function(params, callback) {
		return this.client.request(this.path, 'best-match', params, null, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('search', threeTapsSearchClient);

/**
 * @class The Status API provides access to the status of postings, both inside and outside of the 3taps system. The Status API is built upon the assumption that most postings can be globally identified using two pieces of data: the source and the externalID. Since we can globally identify a posting, we can share the status of postings between various systems.

For example, if a posting has been "sent" to the Posting API by an external source, that external source can optionally send a status of "sent" the Status API. Once the Posting API has processed and saved the posting, it can send the status of "saved" to the Status API. Later, if somebody looks up the posting in the Status API, they will see both of these events (sent and saved), along with the time that they occurred, and any relevant attributes (postKey, errors, etc). Having this information allows 3taps and sources to provide maximum visibility into their processes so that both can improve data yield.

 * @constructor
 */
var threeTapsStatusClient = function(authId, agentId) {
	if (authId instanceof threeTapsClient) {
		this.client = authId;
	} else {
		this.client = new threeTapsClient(authId, agentId);
	}
};

threeTapsStatusClient.prototype = {
	client: null,

	auth: true,
	path: '/status/',
	
	/**
	 * @public
	 
	 * @restStructure POST /status/update

	 * @desc Send in status updates for postings

	 * @param {Array} postings postings should be a JSON-encoded array of posting status updates. Each entry in this array should be a JSON object containing one or more of the following:
	 * 
	 * <table>
	 *     <tr>
	 *         <td>status</td><td>The status of the posting. Currently, the following statuses are supported.</td><td>required</td>
	 *     </tr>
	 *     <tr>
	 *         <td>externalID</td><td>The ID of the posting in the source system.</td><td>required</td>
	 *     </tr>
	 *     <tr>
	 *         <td>source</td><td>The 5 letter code of the source of this posting. (ex: CRAIG, E_BAY)</td><td>required</td>
	 *     </tr>
	 *     <tr>
	 *         <td>timestamp</td><td>The time that this status occured, in format YYYY/MM/DD hh:mm:dd, in UTC</td><td>optional</td>
	 *     </tr>
	 *     <tr>
	 *         <td>attributes</td><td>A JSON object containing name/value pairs of attributes to associate with this status. (ex: postKey, errors)</td><td>optional</td>
	 *     </tr>
	 * </table>

	 * @return {Object} The body of the response will consist of a JSON-encoded object with two fields, code and message. 
	
	 * @example
	 * {"code":200, message:"Got it!"}
	
	 * @example
	 * var data = {
	 * 	"postings":[
	 * 		{
	 * 			"source":"E_BAY",
	 * 			"externalID":"3434399120", 
	 * 			"status":"sent",
	 * 			"timestamp":"2011/12/21 01:13:28",
	 * 			"attributes":{
	 * 				"postKey":"3JE8VFD"
	 * 			}
	 * 		},
	 * 		{
	 * 			"source":"E_BAY",
	 * 			"externalID":"33334399121", 
	 * 			"status":"sent",
	 * 			"timestamp":"2011/12/21 01:13:28",
	 * 			"attributes":{
	 * 				"postKey":"3JE8VFF"
	 * 			}
	 * 		}
	 * 	]
	 * }
	 * threeTapsStatusClient.update(JSON.stringify(data), callback);
	 */
	update: function(data, callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
			,data: data
		};
		return this.client.request(this.path, 'update', null, params, function(results) {
			callback(results);
		});
	},
	
	/**
	 * @public
	 
	 * @restStructure POST /status/get

	 * @desc Get status history for postings

	 * @param {Array} ids ids should be a JSON-encoded array of objects with two fields: externalID and source. Each object will identify a posting to retrieve status for in this request.

	 * @return {Array} an array of objects, each representing a requested posting, each with the following fields:
	 * 
	 * <table>
	 *     <tr>
	 *         <td>exists</td><td>boolean</td><td>If false, the Status API has no history of the posting.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>externalID</td><td>string</td><td>The external ID of this requested posting.</td>
	 *     </tr>	
	 *     <tr>
	 *         <td>source</td><td>string</td><td>The 5 letter code of the source of this posting. (ex: E_BAY, CRAIG)</td>
	 *     </tr>
	 *     <tr>
	 *         <td>history</td><td>object</td><td>this is a pretty big object, so you might want to have a look at the example below. The history object contains a number of fields, one for each "status" that has been recorded for the posting. Within each status field, the value is an array of status events for that status. For example, in the "found" status field, you would find a status event object for each time the posting was found.
	
	 * Each status event object can contain the following fields:
	 * <table>
	 *     <tr>
	 *         <td>timestamp</td><td>date</td><td>The date that this status event was recorded, in UTC.</td>
	 *     </tr>
	 *     <tr>
	 *         <td>errors</td><td>array</td><td>An array of error objects, each with two fields: code and message.</td>
	 *     </tr>	
	 *     <tr>
	 *         <td>attributes</td><td>object</td><td>An object holding a number of key/value pairs associated with this status event (ex: postKey)</td>
	 *     </tr>
	 * </table>
	 * 			</td>
	 *     </tr>
	 * </table>
	
	 * @example
	 * 	[
	 * 		{
	 * 			"exists":false,
	 * 			"externalID":"3434399120"
	 * 			"source": "CRAIG"
	 * 		},
	 * 		{
	 * 			"exists": true,
	 * 			"externalID":"3434399121"
	 * 			"source": "CRAIG"	
	 * 			"history": {
	 * 				"saved": 
	 * 				[
	 * 					{
	 * 						"timestamp": "2011-02-25T18:24:41Z",
	 * 						"errors": null,
	 * 						"attributes": {
	 * 							"postKey": "BDBBTXQ",
	 * 							"batchKey": "BDBBTHF500"
	 * 						}
	 * 					}
	 * 				]
	 * 			}
	 * 		}
	 * 	]
	
	 * @example
	 * var data = {
	 * 	ids: [
	 * 		{source: 'CRAIG', externalID: 3434399120},
	 * 		{source: 'CRAIG', externalID: 33334399121}
	 * 	]
	 * }
	 * threeTapsStatusClient.get(JSON.stringify(data), callback);
	 */
	get: function(data, callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
			,data: data
		};
		return this.client.request(this.path, 'get', null, params, function(results) {
			callback(results);
		});
	},

/**
 * @public
 
 * @restStructure GET /status/system

 * @desc Get the current system status.
 
 * @param {Hide}

 * @return {Object} The body of the response will consist of a JSON-encoded object with two fields, code and message. 

 * @example
 * {"code":200, message:"Everything is AOK!"}

 * @example
 * threeTapsStatusClient.system(callback);
 */
	system: function(callback) {
		var params = {
			agentID: this.client.agentId
			,authID: this.client.authId
		};
		return this.client.request(this.path, 'system', null, params, function(results) {
			callback(results);
		});
	}
};

threeTapsClient.register('status', threeTapsStatusClient);

exports.threeTapsClient = threeTapsClient;