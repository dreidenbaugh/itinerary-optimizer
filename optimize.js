function optimize() {
    // Extract input from form:
    var startPlace = form.start.value;
    var endPlace = form.end.value;
    var startDate = form.startdate.value;
    
    // Search for the cheapest flight:
    var flight = flightSearch(startPlace, endPlace, startDate)
    
    // Output the results:
    output = "Lowest Price: $" + flight.price + "<br>";
    document.getElementById("output").innerHTML = output;
}

/**
 * Returns the cheapest flight between originPlace and destinationPlace on the
 * specified date
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
    
    // Return the flight information:
    return {price: json.Quotes[0].MinPrice};
}
