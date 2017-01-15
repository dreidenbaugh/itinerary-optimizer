var flightsArrays;
var places;
var pathsAndPrices = [];
var output = "";

function optimize() {
    // Extract input from form:
    places = [];
    places.push(form.start.value);
    for (var i = 0; i < stopInputs.length; i++)
    {
        places.push(document.getElementById("stop" + stopInputs[i]).value);
    }
    places.push(form.end.value);
    console.log(places);
    var startDate = form.startdate.value;
    
    // Generate 3D array to use as cache for flight searches
    flightsArrays = new Array(places.length - 1);
    for (var i = 0; i < places.length - 1; i++)
    {   
        flightsArrays[i] = new Array(places.length);
        for (var j = 0; j < places.length; j++)
        {
            flightsArrays[i][j] = [];
        }
    }
    
    // Prepare variables for path calculations:
    var currentUnvisitedStops = [];
    for (var i = 0; i < places.length - 1; i++)
    {
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
    pathsAndPrices.sort(function(a, b){return a.price - b.price});
    
    // Output the results:
    output = "";
    for (var i = 0; i < pathsAndPrices.length; i++)
    {
        var path = pathsAndPrices[i].path;
        var price = pathsAndPrices[i].price;
        
        // Generate a string for the path:
        var outputPath = "";
        for (var j = 0; j < path.length - 1; j++)
        {
            outputPath = outputPath + places[path[j]] + "–";
        }
        outputPath = outputPath + places[path[path.length - 1]];
        
        // Generate a string for the price:
        if (price != 99999)
        {
            var outputPrice = "$" + price;
        }
        else
        {
            var outputPrice = "[No Price Available]";
        }
        
        // Concatenate the strings for this result to the output:
        output = output + outputPath + ": " + outputPrice + "<br />";
    }
    document.getElementById("output").innerHTML = output;
}

var stopInputs = [];
var stopId = 0;
var maxStops = 4;

function addInput() {
    if (stopInputs.length < maxStops)
    {
        var newdiv = document.createElement("div");
        newdiv.id = "stopdiv" + stopId;
        newdiv.innerHTML = "<input id='stop" + stopId + "'>"
                + "<input type='button' value='x' onclick='removeInput("
                + stopId + ")'><br />";
        document.getElementById("stopsinput").appendChild(newdiv);
        stopInputs.push(stopId);
        stopId++;
    }
}

function removeInput(id) {
    var div = document.getElementById("stopdiv" + id);
    stopInputs.splice(stopInputs.indexOf(id), 1);
    div.parentNode.removeChild(div);
}

function flightCacheSearch(originPlaceIndex, destinationPlaceIndex, date)
{
    var array = flightsArrays[originPlaceIndex][destinationPlaceIndex];
    if (array.length > 0)
    {
        for (var i = 0; i < array.length; i++)
        {
            if (array[i].date === date)
            {
                console.log("In Cache:", places[originPlaceIndex], 
                        places[destinationPlaceIndex], date, array[i]);
                return array[i];
            }
        }
    }
    var result = flightAPISearch(places[originPlaceIndex],
            places[destinationPlaceIndex], date);
    console.log("Searched:", places[originPlaceIndex], 
            places[destinationPlaceIndex], date, result);
    if (result == null)
    {
        result = "No Result";
    }
    array.push(result);
    return result;
}

/**
 * Searches using the API and returns the cheapest flight between originPlace
 * and destinationPlace on the specified date, or null if a flight could not 
 * be found
 * @param {string} originPlace - Place code of the flight origin
 * @param {string} destinationPlace - Place code of the flight destination
 * @param {string} date - Flight date in the format "yyyy-MM-dd"
 */
function flightAPISearch(originPlace, destinationPlace, date) {
    // Send a request:
    var xhr = new XMLHttpRequest();
    var url = "http://partners.api.skyscanner.net/apiservices/browsedates/"
            + "v1.0/US/USD/en-US/" + originPlace + "/" + destinationPlace + "/"
            + date + "?apiKey=" + config.API_KEY;
    xhr.open("GET", url, false)
    xhr.send();
    
    // Parse the response:
    console.log("Status:", xhr.status);
    console.log("Response:", xhr.response);
    var json = JSON.parse(xhr.response);
    
    // If the request was successful, 
    if (xhr.status == 200)
    {
        // If the request returned a result, return the flight information:
        if (json.Quotes.length > 0)
        {
            return {price: json.Quotes[0].MinPrice, date: date};
        }
        // Otherwise, if the request returned no results,
        else
        {
            alert("No results available for " + originPlace + "–"
                    + destinationPlace);
            return null;
        }
    }
    // If the request was bad, 
    else if (xhr.status == 400)
    {
        // If there are validation error messages, 
        if (json.ValidationErrors.length > 0)
        {
            // If the message is that a value was invalid, 
            if (json.ValidationErrors[0].Message === "Incorrect value")
            {
                alert(json.ValidationErrors[0].ParameterValue 
                        + " is not valid");
                return null;
            }
        }
        alert("An unknown error occurred during the search");
        return null;
    }
    // If another error occurred,
    else
    {
        alert("An unknown error occurred during the search");
        return null;
    }
}

/**
 * Based on the current path travelled so far, recursively traverse all 
 * possible paths to the end place and add each path and its total price to 
 * pathsAndPrices
 * @param {number[]} previousPath - The path travelled so far as an array of 
 * place indices
 * @param {number[]} previousUnvisitedStops - The stops that have not yet been 
 * visited as an array of place indices
 * @param {number} previousTotalPrice - The total price of the path travelled 
 * so far
 * @param {String} previousDate - The date of the previous flight in the path 
 * in the format "yyyy-MM-dd"
 */
function traverse(previousPath, previousUnvisitedStops, previousTotalPrice,         previousDate)
{
    // For each unvisited stop ahead, 
    for (var i = 0; i < previousUnvisitedStops.length; i++)
    {
        // Create new variables and update them:
        var currentPlace = previousUnvisitedStops[i];
        var currentPath = previousPath.slice();
        currentPath.push(currentPlace); // Add current place to the path
        var currentUnvisitedStops = previousUnvisitedStops.slice();
        currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(
                currentPlace), 1); // Remove current place from unvisited stops
        var currentTotalPrice = previousTotalPrice;
        var currentDate = previousDate;
        
        // If the flight is available and the total so far is available,
        var flight = flightCacheSearch(currentPath[currentPath.length - 2],
                currentPlace, currentDate)
        if (flight !== "No Result" && currentTotalPrice != 99999)
        {
            // Add the price for the flight:
             currentTotalPrice += flight.price;
        }
        else
        {
            currentTotalPrice = 99999;
        }
        
        // Traverse all possible paths after the current path:
        traverse(currentPath, currentUnvisitedStops, currentTotalPrice, 
                currentDate);
    }
    // If there are no stops left except the end,
    if (previousUnvisitedStops.length == 0)
    {
        // Add the end to the path:
        previousPath.push(places.length - 1);
        
        // If the flight is available and the total so far is available,
        var flight = flightCacheSearch(previousPath[previousPath.length - 2], 
                places.length - 1, previousDate)
        if (flight !== "No Result" && previousTotalPrice != 99999)
        {
            // Add the price for the last flight to the end place:
            previousTotalPrice += flight.price;
        }
        else
        {
            previousTotalPrice = 99999;
        }
        
        // Add the final path and price to pathsAndPrices:
        pathsAndPrices.push({path: previousPath, price: previousTotalPrice});
        console.log("Saved:", previousPath, previousTotalPrice);
    }
}
