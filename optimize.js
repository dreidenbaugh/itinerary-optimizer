var flightsArrays;
var places;
var pathsAndPrices = [];
var output = "";

function optimize() {
    // Extract input from form:
    var startPlace = form.start.value;
    var stopPlaces = form.stops.value.split(",");
    var endPlace = form.end.value;
    var startDate = form.startdate.value;
    
    // Compile list of all places:
    if (stopPlaces[0] !== "")
    {
        places = [startPlace].concat(stopPlaces,[endPlace]);
    }
    else
    {
        places = [startPlace, endPlace];
    }
    console.log(places);
    
    // Generate 2D array of cheapest flights for all possible routes
    flightsArrays = new Array(places.length - 1);
    for (var fromIndex = 0; fromIndex < places.length - 1; fromIndex++)
    {   
        var flightsRow = new Array(places.length);
        for (var toIndex = 1; toIndex < places.length; toIndex++)
        {
            if (fromIndex == 0 && toIndex > 1 && toIndex == places.length - 1)
            {
                break;
            }
            if (fromIndex == toIndex)
            {
                continue;
            }
            flightsRow[toIndex] = flightSearch(places[fromIndex], 
                    places[toIndex], startDate);
            console.log(places[fromIndex], places[toIndex], 
                    flightsRow[toIndex]);
        }
        flightsArrays[fromIndex] = flightsRow;
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
    traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
    
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

/**
 * Returns the cheapest flight between originPlace and destinationPlace on the
 * specified date, or null if a flight could not be found
 * @param {string} originPlace - Place code of the flight origin
 * @param {string} destinationPlace - Place code of the flight destination
 * @param {string} date - Flight date in the format "yyyy-MM-dd"
 */
function flightSearch(originPlace, destinationPlace, date) {
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
            return {price: json.Quotes[0].MinPrice};
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
 */
function traverse(previousPath, previousUnvisitedStops, previousTotalPrice)
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
        
        // If the flight is available and the total so far is available,
        if (flightsArrays[currentPath[currentPath.length - 2]][currentPlace] 
                != null && currentTotalPrice != 99999)
        {
            // Add the price for the flight:
             currentTotalPrice += flightsArrays[currentPath[currentPath.length 
                    - 2]][currentPlace].price;
        }
        else
        {
            currentTotalPrice = 99999;
        }
        
        // Traverse all possible paths after the current path:
        traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
    }
    // If there are no stops left except the end,
    if (previousUnvisitedStops.length == 0)
    {
        // Add the end to the path:
        previousPath.push(places.length - 1);
        
        // If the flight is available and the total so far is available,
        if (flightsArrays[previousPath[previousPath.length - 2]][places.length 
                - 1] != null && previousTotalPrice != 99999)
        {
            // Add the price for the last flight to the end place:
            previousTotalPrice += flightsArrays[previousPath[
                    previousPath.length - 2]][places.length - 1].price;
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
