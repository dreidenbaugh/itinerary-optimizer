function optimize() {
    var startPlace = form.start.value;
    var endPlace = form.end.value;
    var startDate = form.startdate.value;

    var xhr = new XMLHttpRequest();
    var url = "http://partners.api.skyscanner.net/apiservices/browsedates/"
            + "v1.0/US/USD/en-US/" + startPlace + "/" + endPlace + "/"
            + startDate + "?apiKey=" + config.API_KEY;
    xhr.open("GET", url, false)
    xhr.send();
    
    console.log(xhr.status);
    console.log(xhr.response);
    var json = JSON.parse(xhr.response);
    console.log(json);
    
    output = "Lowest Price: $" + json.Quotes[0].MinPrice + "<br>";
    document.getElementById("output").innerHTML = output;
}
