var coordinatesLoaded; // Promise indicating if loadCoordinates is done
var flightsArrays; // 3D array that is cache of searched flights
var locationInfo; // Object array containing place codes and their coordinates
var locationXML; // XML document containing place information
var map; // Map object displayed on the page
var markers = []; // Array of map markers
const maxStops = 5; // Maximum number of stop rows allowed in form
var numPaths; // The total number of paths that will be followed
var pathsAndPrices; // Object array containing paths and their prices
var pathLine; // Polyline object representing the path
var placeDays; // Number array of days at each stop from input
var places; // String array of place codes from input
var startDate; // Date object representing start date from input
var stopInputs = []; // Number array of stop input ID numbers
var stopId = 0; // The ID number of the next stop input

/**
 * Processes and validates the form input and then starts optimize()
 */
function go() {
    // Show a progress bar:
    document.getElementById("output").innerHTML = "<div id='progressoutline'>" 
            + "<div id='progresslabel'>Optimizing...</div>"
            + "<div id='progressbar'></div></div>";
    
    // Reset all text input borders and clear error text:
    (function ($) {
        $("input[type=text]").css({
            "border": "solid 1px white"
        });
    })(jQuery);
    var errorText = "<div class='error'>";
    
    // Clear place and placeDays arrays:
    places = [];
    placeDays = [];
    
    // Add and validate the start place
    places.push(form.start.value);
    if (form.start.value == "") {
        (function ($) {
            $("#start").css({
                "border": "solid 2px red"
            });
        })(jQuery);
        errorText += "A start location must be provided.<br />";
    }
    placeDays.push(null); // Number of days is not applicable
    
    // Store the start date and check that it is after today
    startDate = new Date(form.startdate.value);
    if (form.startdate.value === "" || 
            startDate.getTime() < (new Date()).getTime()) {
        (function ($) {
            $("#startdate").css({
                "border": "solid 2px red"
            });
        })(jQuery);
        errorText += "A start date after today must be provided.<br />";
    }
    
    // For each stop input, validate and store the place and number of days
    for (var i = 0; i < stopInputs.length; i++) {
        var stopInputId = "#stop" + stopInputs[i];
        var daysInputId = "#stop" + stopInputs[i] + "days";
        (function ($) {
            places.push($(stopInputId).val());
            if ($(stopInputId).val() == "") {
                $(stopInputId).css({
                    "border": "solid 2px red"
                });
                errorText += "A stop location must be provided.<br />";
            }
            if ($(daysInputId).val() < 0) {
                $(daysInputId).css({
                    "border": "solid 2px red"
                });
                errorText += "The stop length must be at least 0 days.<br />";
            }
            placeDays.push($(daysInputId).val());
        })(jQuery);
    }
    
    // Add and validate the end place
    places.push(form.end.value);
    if (form.end.value == "") {
        (function ($) {
            $("#end").css({
                "border": "solid 2px red"
            });
        })(jQuery);
        errorText += "An end location must be provided.<br />";
    }
    placeDays.push(null); // Number of days is not applicable
    
    // If an input was invalid, add the error text to page and stop program
    if (errorText !== "<div class='error'>") {
        errorText += "</div>";
        document.getElementById("output").innerHTML = errorText;
        return false;
    }
    
    // Get coordinates for places; after, add map markers for the coordinates
    coordinatesLoaded = loadCoordinates().done(function () {
        searchCoordinates(places);
        addMapMarkers();  
    });
    
    // Calculate the total number of paths
    numPaths = factorial(stopInputs.length);
    
    // Begin optimize function after short timeout for progress bar to update
    setTimeout("optimize()", 5);
}

/**
 * Determine the prices for all paths and output a sorted list to the web page
 */
function optimize() {
    // Generate 3D array to use as cache for flight searches
    flightsArrays = new Array(places.length - 1);
    for (var i = 0; i < places.length - 1; i++) {
        flightsArrays[i] = new Array(places.length);
        for (var j = 0; j < places.length; j++) {
            flightsArrays[i][j] = [];
        }
    }
    
    // Prepare variables for path calculations:
    var currentUnvisitedStops = [];
    for (var i = 0; i < places.length - 1; i++) {
        currentUnvisitedStops.push(i);
    }
    var currentPath = [];
    pathsAndPrices = [];
    
    // Set initial values for path calculations:
    var currentPlace = 0;
    currentPath.push(currentPlace);
    currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(currentPlace),
            1);
    var currentTotalPrice = 0;
   
    // Do path calculations:
    traverse(currentPath, currentUnvisitedStops, currentTotalPrice, startDate);
    
    // Sort the results:
    pathsAndPrices.sort(function priceDifference(a, b) {
        return a.price - b.price
    });
    
    // Output the results:
    var output;
    if (pathsAndPrices[0].price != 99999) {
        output = "<h2>Results</h2><dl id='itinerarylist'>";
        for (var i = 0; i < pathsAndPrices.length; i++) {
            var path = pathsAndPrices[i].path;
            var price = pathsAndPrices[i].price;
            
            // Generate a string for the path:
            var outputPath = "";
            for (var j = 0; j < path.length - 1; j++) {
                outputPath = outputPath + places[path[j]] + "–";
            }
            outputPath = outputPath + places[path[path.length - 1]];
            
            // Generate a string for the price:
            if (price != 99999) {
                var outputPrice = "$" + price;
            } else {
                var outputPrice = "[No Price Available]";
            }
            
            // Concatenate the strings for this result to the output:
            output = output + "<dt><a href=''>" + outputPath + ": " 
                    + outputPrice + "</a></dt><dd id='result" + i + "'></dd>";
        }
        output = output + "</dl>";
    } else {
        output = "<h2>Results</h2>No results";
    }
    document.getElementById("output").innerHTML = output;
    
    (function ($) {
        var itineraries = $('#itinerarylist > dd').hide();
        expand($('#result0'), 0);
        
        $('#itinerarylist > dt > a').click(function () {
            var description = $(this).parent().next();
            var listNumber = description.attr('id').substring(6);
            expand(description, listNumber);
            return false;
        });
        
        function expand(description, itemNumber) {
            itineraries.hide();
            var path = pathsAndPrices[itemNumber].path;
            description.html(itineraryAsHTML(path));
            description.show();
            $.when(coordinatesLoaded).done(function () {
                addMapLine(path);
            });
        }
    })(jQuery);
}

/**
 * Adds a stop input row to the web page form
 */
function addInput() {
    if (stopInputs.length < maxStops) {
        var newdiv = document.createElement("div");
        newdiv.id = "stopdiv" + stopId;
        newdiv.innerHTML = "<input type='button' value='&#10006;' "
                + "onclick='removeInput(" + stopId + ")'> <input type='text'" 
                + "id='stop" + stopId + "'> Days: <input type='number'"
                + "id='stop" + stopId + "days'> <br />";
        document.getElementById("stopsinput").appendChild(newdiv);
        stopInputs.push(stopId);
        stopId++;
    }
}

/**
 * Removes a stop input row from the web page form
 */
function removeInput(id) {
    var div = document.getElementById("stopdiv" + id);
    stopInputs.splice(stopInputs.indexOf(id), 1);
    div.parentNode.removeChild(div);
}

/**
 * Searches the cache for the specified flight and returns the flight if it
 * is found; if it is not in the cache, it initiates an API search for the
 * flight and returns the result or "No Result" if the search has no results
 * 
 * @param {number} originPlaceIndex - The index in places[] of the place code 
 * of the flight origin
 * @param {number} destinationPlaceIndex - The index in places[] of the place 
 * code of the flight destination
 * @param {Date} date - Flight date
 */
function flightCacheSearch(originPlaceIndex, destinationPlaceIndex, date) {
    var dateString = date.toISOString().substring(0, 10);
    // Get the array of flights for that route:
    var array = flightsArrays[originPlaceIndex][destinationPlaceIndex];
    // Return any cached flight for that route with a matching date
    if (array.length > 0) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].date == dateString) {
                console.log("In Cache:", places[originPlaceIndex],
                        places[destinationPlaceIndex], dateString, array[i]);
                return array[i];
            }
        }
    }
    
    // If the flight was not in the cache, search the flight using the API:
    var result = flightAPISearch(places[originPlaceIndex],
            places[destinationPlaceIndex], dateString);
    console.log("Searched:", places[originPlaceIndex],
            places[destinationPlaceIndex], dateString, result);
    // Add to the array and return the result (or "No Result")
    if (result == null) {
        result = "No Result";
    }
    array.push(result);
    return result;
}

/**
 * Searches using the API and returns the cheapest flight between originPlace
 * and destinationPlace on the specified date, or null if a flight could not 
 * be found
 * 
 * @param {string} originPlace - Place code of the flight origin
 * @param {string} destinationPlace - Place code of the flight destination
 * @param {string} date - Flight date in the format "yyyy-MM-dd"
 */
function flightAPISearch(originPlace, destinationPlace, date) {
    // Send a request:
    var xhr = new XMLHttpRequest();
    var url = "http://partners.api.skyscanner.net/apiservices/browsedates/"
            + "v1.0/US/USD/en-US/" + originPlace + "/" + destinationPlace + "/"
            + date + "?apiKey=" + config.SKYSCANNER_API_KEY;
    xhr.open("GET", url, false)
    try {
        xhr.send();
    } catch (e) {
        alert("An unknown error occurred during the search");
    }
    
    // Parse the response:
    console.log("Status:", xhr.status);
    console.log("Response:", xhr.response);
    var json = JSON.parse(xhr.response);
    
    // If the request was successful, 
    if (xhr.status == 200) {
        // If the request returned a result, return the flight information:
        if (json.Quotes.length > 0) {
            return {
                price: json.Quotes[0].MinPrice,
                date: date
            };
        }
        // Otherwise, if the request returned no results,
        else {
            alert("No results available for " + originPlace + "–"
                    + destinationPlace);
            return null;
        }
    }
    // If the request was bad, 
    else if (xhr.status == 400) {
        // If there are validation error messages, 
        if (json.ValidationErrors.length > 0) {
            // If the message is that a value was invalid, 
            if (json.ValidationErrors[0].Message === "Incorrect value") {
                alert(json.ValidationErrors[0].ParameterValue 
                        + " is not valid");
                return null;
            }
        }
        alert("An error occurred during the search");
        return null;
    }
    // If another error occurred,
    else {
        alert("An error occurred during the search");
        return null;
    }
}

/**
 * Based on the current path travelled so far, recursively traverses all 
 * possible paths to the end place and adds each path and its total price to 
 * pathsAndPrices
 * 
 * @param {number[]} previousPath - The path travelled so far as an array of 
 * place indices
 * @param {number[]} previousUnvisitedStops - The stops that have not yet been 
 * visited as an array of place indices
 * @param {number} previousTotalPrice - The total price of the path travelled 
 * so far
 * @param {Date} previousDate - The date of the previous flight in the path 
 */
function traverse(previousPath, previousUnvisitedStops, previousTotalPrice, 
        previousDate) {
    // For each unvisited stop ahead, 
    for (var i = 0; i < previousUnvisitedStops.length; i++) {
        // Create new variables and update them:
        var currentPlace = previousUnvisitedStops[i];
        var currentPath = previousPath.slice();
        currentPath.push(currentPlace); // Add current place to the path
        var currentUnvisitedStops = previousUnvisitedStops.slice();
        currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(
                currentPlace), 1); // Remove current place from unvisited stops
        var currentTotalPrice = previousTotalPrice;
        
        // If the flight is available and the total so far is available,
        var flight = flightCacheSearch(currentPath[currentPath.length - 2],
                currentPlace, previousDate)
        if (flight !== "No Result" && currentTotalPrice != 99999) {
            // Add the price for the flight:
            currentTotalPrice += flight.price;
        } else {
            currentTotalPrice = 99999;
        }
        
        // Update the date:
        var days = placeDays[currentPath[currentPath.length - 1]];
        var currentDate = new Date(previousDate.valueOf() + days * 86400000);
        
        // Traverse all possible paths after the current path:
        traverse(currentPath, currentUnvisitedStops, currentTotalPrice, 
                currentDate);
    }
    // If there are no stops left except the end,
    if (previousUnvisitedStops.length == 0) {
        // Add the end to the path:
        previousPath.push(places.length - 1);
        
        // If the flight is available and the total so far is available,
        var flight = flightCacheSearch(previousPath[previousPath.length - 2], 
                places.length - 1, previousDate)
        if (flight !== "No Result" && previousTotalPrice != 99999) {
            // Add the price for the last flight to the end place:
            previousTotalPrice += flight.price;
        } else {
            previousTotalPrice = 99999;
        }
        
        // Add the final path and price to pathsAndPrices:
        pathsAndPrices.push({
            path: previousPath,
            price: previousTotalPrice
        });
        console.log("Saved:", previousPath, previousTotalPrice);
        updateProgress();
    }
}

/**
 * Returns the given path as an HTML list detailing the itinerary
 * 
 * @param {number[]} path - Path as an array of place indices
 */
function itineraryAsHTML(path) {
    var output = "<ul>";
    var date = startDate;
    var totalPrice = 0;
    for (var i = 0; i < path.length - 1; i++) {
        var days = placeDays[path[i]];
        date = new Date(date.valueOf() + days * 86400000);
        var flight = flightCacheSearch(path[i], path[i + 1], date);
        output = output + "<li>" + flight.date + ": " + places[path[i]] + "–" 
                + places[path[i + 1]] + " ($" + flight.price + ")</li>";
        totalPrice += flight.price;
    }
    return output + "</ul>";
}

/**
 * Returns the factorial of a number, or -1 if the number is negative
 *
 * @param {number} number - the number of which to calculate the factorial
 */
function factorial(number) {
    if (number < 0) {
        return -1;
    } else if (number == 0) {
        return 1;
    } else {
        return number * factorial(number - 1);
    }
}

/**
 * Calculates the progress percentage out of 100 based on the number of paths
 * whose prices have been found and updates the progress bar width
 */
function updateProgress() {
    var progress = pathsAndPrices.length / numPaths * 100;
    document.getElementById("progressbar").style.width = progress + "%";
    console.log("Progress:", progress);
}

/**
 * Add the Google Maps script to the web page
 */
function addMapScript() {
    var script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key="
            + config.GMAPS_API_KEY;
    script.onload = showMap;
    document.getElementsByTagName('head')[0].appendChild(script);
}

/**
 * Set the map and path line options, causing the map to show
 */
function showMap() {
    map = new google.maps.Map(document.getElementById("map"),
    {
        zoom: 2,
        center: {
            lat: 0,
            lng: 0
        },
        mapTypeControl: false,
        zoomControl: false,
        streetViewControl: false
    });
    pathLine = new google.maps.Polyline({
        geodesic: true,
        strokeColor: '#565656',
        strokeOpacity: 0.8,
        strokeWeight: 5
    });
}

/**
 * Downloads airport and city geographic information from the API and stores
 * the resulting XML document in locationXML
 */
function loadCoordinates() {
    var deferred = $.Deferred();
    (function ($) {
        if(!coordinatesLoaded)
        {
            $.ajax({
                method: "GET",
                url: "http://partners.api.skyscanner.net/apiservices/geo/" +
                        "v1.0?apikey=" + config.SKYSCANNER_API_KEY,
                dataType: 'xml',
                success: function (response) {
                    locationXML = response;
                    deferred.resolve();
                }
            });
        }
        else
        {
            return deferred.resolve();
        }
    })(jQuery);
    return deferred.promise();
}

/**
 * Searches for in locationXML and stores in locationInfo the coordinates
 * of the specified place codes
 * 
 * @param {string} codes - Array of place codes 
 */
function searchCoordinates(codes)
{
    (function ($) {
        locationInfo = [];
        $.each(codes, function (index, code) {
            var $cityResults = $(locationXML)
                .find('City[IataCode="' + code + '"]');
            if ($cityResults.length == 1) {
                $cityResults.each(function () {
                    storeCoordinates($(this), code);
                });
            } else {
                $(locationXML).find('Airport[Id="' + code + '"]')
                        .each(function () {
                    storeCoordinates($(this), code);
                });
            }
        });
    })(jQuery);
}

/**
 * Extracts from the JQuery result and stores in locationInfo the coordinates 
 * of the specified place code
 *
 * @param {JQuery} result - The JQuery object containing the result from the
 * database
 * @param {string} code - The place code
 */
function storeCoordinates(result, code) {
    (function ($) {
        var coordinateStrings = result.attr('Location').split(', ');
        var lat = parseFloat(coordinateStrings[1]);
        var lng = parseFloat(coordinateStrings[0]);
        var coordinates = {
            lat: lat,
            lng: lng
        };
        locationInfo.push({
            code: code,
            coordinates: coordinates
        });
        console.log({
            code: code,
            coordinates: coordinates
        });
    })(jQuery);
}

/**
 * Adds to the map a marker for each place in locationInfo
 */
function addMapMarkers() {
    clearMap();
    var mapBounds = new google.maps.LatLngBounds();
    for (var i = 0; i < locationInfo.length; i++) {
        var marker = new google.maps.Marker({
            position: locationInfo[i].coordinates,
            icon: "https://maps.google.com/mapfiles/ms/micons/blue-dot.png",
            map: map
        });
        markers.push(marker);
        mapBounds.extend(locationInfo[i].coordinates);
    }
    map.fitBounds(mapBounds);
    map.panToBounds(mapBounds);
}

/**
 * Deletes all markers from the map and hides the path line
 */
function clearMap() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    pathLine.setMap(null);
}

/**
 * Plots on the map a line showing the path
 *
 * @param {number[]} path - Path as an array of place indices
 */
function addMapLine(path) {
    var pathCoordinates = [];
    for (var i = 0; i < path.length; i++) {
        pathCoordinates.push(locationInfo[path[i]].coordinates);
    }
    pathLine.setPath(pathCoordinates);
    pathLine.setMap(map);
}

// When the page loads, add the map script:
addMapScript();
