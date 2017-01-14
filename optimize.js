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
    
    output = ""
    var currentUnvisitedStops = [];
    for (var i = 0; i < places.length - 1; i++)
    {
        currentUnvisitedStops.push(i);
    }
    var currentPath = [];
    
    var currentPlace = 0;
    currentPath.push(currentPlace);
    currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(currentPlace), 1);
    var currentTotalPrice = 0;
   
    traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
    if (currentUnvisitedStops.length == 0)
    {
        currentPath.push(places.length - 1);
        currentTotalPrice += flightsArrays[currentPlace][places.length - 1].price;
        pathsAndPrices.push({path: currentPath, price: currentTotalPrice});
        console.log("Saved:", currentPath, currentTotalPrice);
        var outputPath = "";
        for (var j = 0; j < currentPath.length; j++)
        {
            outputPath = outputPath + places[currentPath[j]] + " ";
        }
        output = output + outputPath + "$" + currentTotalPrice + "<br />"
        console.log("Output:", output);
    }
    
    // Output the results:
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
    console.log(xhr.status);
    console.log(xhr.response);
    var json = JSON.parse(xhr.response);
    console.log(json);
    
    // Return flight information or null if no flight was found:
    if (json.Quotes.length > 0)
    {
        return {price: json.Quotes[0].MinPrice};
    }
    else
    {
        return null;
    }
}

function traverse(previousPath, previousUnvisitedStops, previousTotalPrice)
{
    for (var i = 0; i < previousUnvisitedStops.length; i++)
    {
        var currentPlace = previousUnvisitedStops[i];
        var currentPath = previousPath.slice();
        currentPath.push(currentPlace);
        var currentUnvisitedStops = previousUnvisitedStops.slice();
        currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(currentPlace), 1);
        var currentTotalPrice = previousTotalPrice;
        currentTotalPrice += flightsArrays[currentPath[currentPath.length - 2]][currentPlace].price;
        traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
        if (currentUnvisitedStops.length == 0)
        {
            currentPath.push(places.length - 1);
            currentTotalPrice += flightsArrays[currentPlace][places.length - 1].price;
            pathsAndPrices.push({path: currentPath, price: currentTotalPrice});
            console.log("Saved:", currentPath, currentTotalPrice);
            var outputPath = "";
            for (var j = 0; j < currentPath.length; j++)
            {
                outputPath = outputPath + places[currentPath[j]] + " ";
            }
            output = output + outputPath + "$" + currentTotalPrice + "<br />"
            console.log("Output:", output);
        }
    }
}
