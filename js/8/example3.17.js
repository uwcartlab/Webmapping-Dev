//execute script when window is loaded
window.onload = function () {
    //SVG dimension variables
    var w = 900, h = 500;

    //Example 1.5 line 1...container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //assign a class name
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

    //Example 1.8 line 1...innerRect block
    var innerRect = container.append("rect")
        .datum(400) //a single value is a DATUM
        .attr("width", function (d) { //rectangle width
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function (d) { //rectangle height
            return d; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color

    var stateEnergy = [
        {
            state: 'Michigan',
            energy: 120.66
        },
        {
            state: 'Illinois',
            energy: 177.74
        },
        {
            state: 'North Dakota',
            energy: 42.07
        },
        {
            state: 'Wisconsin',
            energy: 62.54
        }
    ];

    //above Example 2.8
    var x = d3.scaleLinear() //create the scale
        .range([90, 750]) //output min and max
        .domain([0, 3]); //input min and max

    //above Example 2.8 
    //find the minimum value of the array
    var minEnergy = d3.min(stateEnergy, function (d) {
        return d.energy;
    });

    //find the maximum value of the array
    var maxEnergy = d3.max(stateEnergy, function (d) {
        return d.energy;
    });

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50]) //was 440, 95
        .domain([0, 200]); //was minEnergy, maxEnergy

    //color scale generator 
    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minEnergy,
            maxEnergy
        ]);


    //Example 2.6
    var circles = container.selectAll(".circles") //create an empty selection
        .data(stateEnergy) //here we feed in an array
        .enter() //one of the great mysteries of the universe
        .append("circle") //inspect the HTML--holy crap, there's some circles there
        .attr("class", "circles")
        .attr("id", function (d) {
            return d.state;
        })
        .attr("r", function (d) {
            //calculate the radius based on population value as circle area
            var area = d.energy * 10;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function (d, i) {
            //use the index to place each circle horizontally
            return x(i);
        })
        .attr("cy", function (d) {
            //size circles based on energy values
            return y(d.energy);
        })
        .style("fill", function (d) {
            //color circles based on energy values
            return color(d.energy);
        })
        .style("stroke", "#000"); //black circle stroke

    //add axis
    var yAxis = d3.axisLeft(y);

    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);
    //create chart title and position at the top of the map
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("State Energy Production");

    //Example 3.14...create circle labels
    var labels = container.selectAll(".labels")
        .data(stateEnergy)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function (d) {
            //position label in exact center of circle
            return y(d.energy);
        });

    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function (d, i) {
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.energy * 10 / Math.PI) + 5;
        })
        .text(function (d) {
            return d.state;
        });

    //second line of label
    var energyLine = labels.append("tspan")
        .attr("class", "energyLine")
        .attr("x", function (d, i) {
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.energy * 10 / Math.PI) + 5;
        })
        .attr("dy", "15")
        .text(function (d) {
            return d.energy + " TwH";
        });

};