function optimize() {
    // Extract input from form:
    var startPlace = form.start.value;
    var stopPlaces = form.stops.value.split(",");
    var endPlace = form.end.value;
    var startDate = form.startdate.value;
    
    // Compile list of all places:
    if (stopPlaces[0] !== "")
    {
        var places = [startPlace].concat(stopPlaces,[endPlace]);
    }
    else
    {
        var places = [startPlace, endPlace];
    }
    console.log(places);
    
    // Generate 2D array of cheapest flights for all possible routes
    var flightsArrays = new Array(places.length - 1);
    for (var fromIndex = 0; fromIndex < places.length - 1; fromIndex++)
    {   
        var flightsRow = new Array(places.length);
        for (var toIndex = 1; toIndex < places.length; toIndex++)
        {
            if (fromIndex == 0 && toIndex == places.length - 1)
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
    
    // Output the results:
    var output = "Complete" + "<br>";
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
