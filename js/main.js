// Add all scripts to the JS folder

//Global variables
var map;
var index = 0;


//Create the map
function createMap() {
    map = L.map('map').setView([46.00318583226062, -94.60267026275974], 7);

    var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    maxZoom: 19,
	    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //Get data for the map
    getData(map)
}

//Calculate minimum values for proportional circles
function calculatedMinValue(data) {
    //Create an empty array to store all data values
   var allValues = [];

   //Loop through each city
   for(var i=0; i < data.features.length; i++) {
    var properties = data.features[i].properties;
    //Loop through each year
    for(var year = 2010; year <= 2019; year ++) {
        //Get population for current year
        var value = properties[String(year) + " Pop" ]; 
        //Add values to array
        allValues.push(value);
    }
   }
   //Get minimum value in array
   var minValue = Math.min(...allValues);

   return minValue;
}

//Calculate radius of each proportional symbol
function calcPropRadius(attValue) {
    //Constant factor adjusts symbol sizes evenly
    var minRadius = 3;

    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius;

    return radius;
}

//Consolidated popup content creation function
function createPopupContent(properties, attribute) {
    //Popup content
    var popupContent = "<p><b>County:</b> " + properties.CTY_NAME + "</p>";
            
    //add formatted attribute to panel content string
    var year = attribute.split(" ")[0];
    popupContent += "<p><b>Population in " + year + ":</b> " + properties[attribute]+ "</p>";

    return popupContent;
    
}

function pointToLayer(feature, latlng, attributes){

    //Attribute to symbolize
    var attribute = attributes[0];

    // Create marker options
    var geojsonMarkerOptions = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    // Set the marker radius based on longitude
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    // Create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    // Popup content
    var popupContent = createPopupContent(feature.properties, attribute);

    // Bind popup to circle marker
    layer.bindPopup(popupContent);

    return layer; // 
}

// Function to create symbols
function createPropSymbols(data, map, attributes){
    
    // Add the GeoJSON layer
    L.geoJson(data, {
        pointToLayer: function(feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
}

//Create new sequence controls
function createSequenceControls(attributes) {
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            //Create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //Create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">');

            //Step buttons
            container.insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
            container.insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');

            //Make the buttons images now
            container.insertAdjacentHTML('beforeend',"<img src='img/backward.png'>");
            container.insertAdjacentHTML('beforeend',"<img src='img/forward.png'>");

            //Disables mouse event listeners for container
            L.DomEvent.disableClickPropagation(container);


            return container;
        }
    });

    map.addControl(new SequenceControl());

    //set slider attributes
    document.querySelector(".range-slider").max = 9;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;


    //Create click listeners for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 9 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 9 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            console.log(attributes[index])

            //Step 9: pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })

        
    })

    //Input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        var index = this.value;
        
        //Step 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
}

//Add legend
function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function() {
            //Create container to hold legend
            var container = L.DomUtil.create('div', 'legend-control-container');

            //Gets the year from the current index based on slider
            var year = attributes[index].split(" ")[0]; 

            container.innerHTML = `<p class="temporalLegend"> Population in ${year}</p>`

            console.log(index)


            return container
        }
    });

    map.addControl(new LegendControl());
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            
            //add city to popup content string
            var popupContent = createPopupContent(props, attribute);
            
            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};

//Build array of attributes from the GeoJson
function processData(data) {
    var attributes = [];

    //Properties of first feature in dataset
    var properties = data.features[0].properties;

    //Push each attribute name into attributes array
    for(var attribute in properties) {
        //Only take attributes with population values
        if(attribute.indexOf("Pop") > -1) {
            attributes.push(attribute);
        }
    }

    return attributes;
}

//Step 2: Import GeoJSON data
function getData(map){
    //load the data
    fetch('data/MN_County_Pop.geojson')
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //Create an attributes array
            var attributes = processData(json);
            //Calculate minimum data value
            minValue = calculatedMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, map, attributes);
            //Function for sequence control
            createSequenceControls(attributes);
            //Create the legend
            createLegend(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap);

