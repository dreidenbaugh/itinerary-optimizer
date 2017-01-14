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
    output = "";
    var currentUnvisitedStops = [];
    for (var i = 0; i < places.length - 1; i++)
    {
        currentUnvisitedStops.push(i);
    }
    var currentPath = [];
    
    // Set initial values for path calculations:
    var currentPlace = 0;
    currentPath.push(currentPlace);
    currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(currentPlace), 
            1);
    var currentTotalPrice = 0;
   
    // Do path calculations:
    traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
    if (currentUnvisitedStops.length == 0)
    {
        currentPath.push(places.length - 1);
        if (flightsArrays[currentPlace][places.length - 1] != null &&
                currentTotalPrice != -1)
        {
            currentTotalPrice += flightsArrays[currentPlace][places.length 
                    - 1].price;
        }
        else
        {
            currentTotalPrice = -1;
        }
        addResult(currentPath, currentTotalPrice);
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
    
    if (xhr.status == 200)
    {
        if (json.Quotes.length > 0)
        {
            return {price: json.Quotes[0].MinPrice};
        }
        else
        {
            alert("No results available for " + originPlace + "–"
                    + destinationPlace);
            return null;
        }
    }
    else if (xhr.status == 400)
    {
        if (json.ValidationErrors.length > 0)
        {
            if (json.ValidationErrors[0].Message === "Incorrect value")
            {
                alert(json.ValidationErrors[0].ParameterValue 
                        + " is not a valid location");
                return null;
            }
        }
        alert("An unknown error occurred during the search");
        return null;
    }
    else
    {
        alert("An unknown error occurred during the search");
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
        currentUnvisitedStops.splice(currentUnvisitedStops.indexOf(
                currentPlace), 1);
        var currentTotalPrice = previousTotalPrice;
        if (flightsArrays[currentPath[currentPath.length - 2]][currentPlace] 
                != null && currentTotalPrice != -1)
        {
             currentTotalPrice += flightsArrays[currentPath[currentPath.length 
                    - 2]][currentPlace].price;
        }
        else
        {
            currentTotalPrice = -1;
        }
        traverse(currentPath, currentUnvisitedStops, currentTotalPrice);
        if (currentUnvisitedStops.length == 0)
        {
            currentPath.push(places.length - 1);
            if (flightsArrays[currentPlace][places.length - 1] != null && 
                    currentTotalPrice != -1)
            {
                currentTotalPrice += flightsArrays[currentPlace][places.length 
                        - 1].price;
            }
            else
            {
                currentTotalPrice = -1;
            }
            addResult(currentPath, currentTotalPrice);
        }
    }
}

function addResult(currentPath, currentTotalPrice)
{
    pathsAndPrices.push({path: currentPath, price: currentTotalPrice});
    console.log("Saved:", currentPath, currentTotalPrice);
    var outputPath = "";
    for (var j = 0; j < currentPath.length - 1; j++)
    {
        outputPath = outputPath + places[currentPath[j]] + "–";
    }
    outputPath = outputPath + places[currentPath[currentPath.length - 1]];
    if (currentTotalPrice != -1)
    {
        output = output + outputPath + ": $" + currentTotalPrice + "<br />"
    }
    else
    {
        output = output + outputPath + ": [No Price Available]<br />";
    }        
    console.log("Output:", output);
}
