//wrap everything is immediately invoked anonymous function so nothing is in clobal scope
(function () {
    //pseudo-global variables
    var attrArray = ["coal_twh","gas_twh","wind_twh","solar_twh","cents_kwh","tot_twh"]; //list of attributes
    var expressed  = {
        x:attrArray[4],
        y:attrArray[0],
        color:attrArray[1]
    }
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 600, mapHeight = 500,
        leftPadding = 25,
        rightPadding = 5,
        topPadding = 5,
        bottomPadding = 100,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topPadding - bottomPadding,
        translate = "translate(" + leftPadding + "," + topPadding + ")";

    //begin script when window loads
    window.onload = setMap();

    //Example 1.3 line 4...set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.5

        //create new svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", mapHeight);

        //create Albers equal area conic projection centered on the Midwest
        var projection = d3
            .geoAlbers()
            .center([-88.3, 42.6])
            .rotate([49, 36, 17])
            .parallels([37, 45])
            .scale(1600)
            .translate([width / 2, mapHeight / 2]);

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/greatLakesEnergyStats.csv"),
            d3.json("data/usStates.topojson"),
            d3.json("data/midwestStates.topojson"),
        ];
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0],
                states = data[1],
                midwest = data[2];

            //translate europe TopoJSON
            var usStates = topojson.feature(states, states.objects.usStates),
                midwestStates = topojson.feature(midwest, midwest.objects.MidwestStates).features;

            //add Europe countries to map
            var stateLayer = map
                .append("path")
                .datum(usStates)
                .attr("class", "us")
                .attr("d", path);

            midwestStates = joinData(midwestStates, csvData);

            var colorScale = makeColorScale(csvData);
            var bubbleYscale = makeChartScale(csvData,chartInnerHeight,expressed.y,'y')
            var bubbleXscale = makeChartScale(csvData,chartInnerWidth,expressed.x,'x')

            setEnumerationUnits(midwestStates, map, path, colorScale);

            //add coordinated visualization to the map
            setBubbleChart(csvData, colorScale)
            //create site title
            createTitle();
            //add dropdown
            createDropdown(csvData,"y");
            createDropdown(csvData,"x");
            createDropdown(csvData,"color");
        }
    }
    //create page title
    function createTitle(){
        var pageTitle =  d3
            .select(".navbar")
            .append("h1")
            .attr("class","pageTitle")
            .text("Midwest Energy Dashboard")
    }
    //join data
    function joinData(midwestStates, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.state_abbr; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < midwestStates.length; a++) {
                var geojsonProps = midwestStates[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.state_abbr; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {
                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }
        return midwestStates;
    }
    //create size scale
    function getDataMin(data) {
        var min = Infinity;
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed.color]);
            if (val < min)
                min = val
        }
        //account for 0 in the dataset
        if (min == 0) 
            return 0.1
        else 
            return min;
    }
    //create color scale
    function makeColorScale(data) {
        var colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"];

        //create color scale generator
        var colorScale = d3.scaleQuantile().range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        }

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    }
    //create chart scale
    function makeChartScale(data, size, expressed, type){
        //build array of all values of the expressed attribute
        var min = Infinity, max = -Infinity;
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            if (val < min)
                min = val
            if (val > max)
                max = val
        }
        //calculate a buffer value
        var buffer = (max - min) / 4;
        var domainMin = min - buffer < 0 ? 0: buffer;
        var domainMax = max + buffer;
        //assign array of expressed values as scale domain
        if (type == 'y')
            var chartScale = d3.scaleLinear().range([size, 0]).domain([domainMin, domainMax]);
        if (type == 'x')
            var chartScale = d3.scaleLinear().range([size, 0]).domain([domainMax, domainMin]);
        return chartScale;
    }
    function setEnumerationUnits(midwestStates, map, path, colorScale) {
        //add France regions to map
        var regions = map
            .selectAll(".states")
            .data(midwestStates)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "state " + d.properties.state_abbr;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed.y];
                if (value) {
                    return colorScale(d.properties[expressed.y]);
                } else {
                    return "#ccc";
                }
            })
            .style("stroke","#000")
            .style("stroke-width","0.5")
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = regions.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');
    }
    //function to create coordinated bar chart
    function setBubbleChart(csvData, colorScale) {
        var bubbleXscale = makeChartScale(csvData,chartInnerWidth,expressed.x,'x')
        var bubbleYscale = makeChartScale(csvData,chartInnerHeight,expressed.y,'y')
        //create a second svg element to hold the bar chart
        var chart = d3
            .select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "bubbleChart");

        //create a rectangle for chart background fill
        var chartBackground = chart
            .append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var circles = chart.selectAll(".circles") //create an empty selection
            .data(csvData) //here we feed in an array
            .enter() //one of the great mysteries of the universe
            .append("circle") //inspect the HTML--holy crap, there's some circles there
            .attr("class", "circles")
            .attr("class", function (d) {
                return "bubble " + d.state_abbr;
            })
            .attr("r", function(d){
                var min = getDataMin(csvData), minRadius = 5
                //calculate the radius based on population value as circle area
                var radius = Math.pow(d[expressed.color] / min, 0.5715) * minRadius;;
                return radius;
            })
            .attr("cx", function(d, i){
                //use x scale to position bubbles based on a second variable
                return bubbleXscale(d[expressed.x]) + leftPadding;
            })
            .attr("cy", function(d){
                //use y scale to position bubbles
                return bubbleYscale(d[expressed.y]) + topPadding;
            })
            //color/recolor bubbles
            .style("fill", function (d) {
                var value = d[expressed.color];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })
            .style("stroke-width", "1")
            .style("stroke", "#000")
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel); //black circle stroke
        //bubble legend
        createChartAxes(bubbleYscale,bubbleXscale)
        //createBubbleLegend(csvData)

        updateBubbleChart(circles, csvData, colorScale, bubbleYscale, bubbleXscale);

        var desc = circles.append("desc").text('{"stroke": "#000", "stroke-width": "1"}'); 
    }
    //create axes
    function createChartAxes(yScale, xScale){
        var chart = d3.select(".bubbleChart")
        //add axis
        //create vertical axis generator
        var yAxisScale = d3.axisLeft().scale(yScale);
        var xAxisScale = d3.axisBottom().scale(xScale);

        //place axis
        var yaxis = chart.append("g")
            .attr("class", "yaxis")
            .attr("transform", translate)
            .call(yAxisScale);
         
        var xaxisPosition = chartInnerHeight + topPadding; 
        var xaxis = chart.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(" + leftPadding + "," + xaxisPosition + ")")
            .call(xAxisScale);
    }
    //update axes
    function updateChartAxes(yScale, xScale){
        var yAxisScale = d3.axisLeft().scale(yScale);
        var xAxisScale = d3.axisBottom().scale(xScale);

        var yaxis = d3.select(".yaxis").call(yAxisScale)
        var xaxis = d3.select(".xaxis").call(xAxisScale)
    }
    //create dropdown menu
    function createDropdown(csvData,axis){
        var axisLabel =  d3
            .select(".navbar")
            .append("text")
            .attr("class","dropdownLabels")
            .text(axis + ": ")
        //add select element
        var dropdown = d3
            .select(".navbar")
            .append("select")
            .attr("class", axis + "axis")
            .on("change", function () {
                expressed[axis] = this.value
                changeAttribute(csvData);
            });
        //add initial option
        var titleOption = dropdown
            .append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        //add attribute name options
        var attrOptions = dropdown
            .selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) {
                return d;
            })
            .text(function (d) {
                return d;
            });
    }
    //dropdown change listener handler
    function changeAttribute(csvData) {
        //recreate the color scale
        var colorScale = makeColorScale(csvData);
        //recreate the chart scale
        var bubbleYscale = makeChartScale(csvData,chartInnerHeight,expressed.y,'y')
        var bubbleXscale = makeChartScale(csvData,chartInnerWidth,expressed.x,'x')
        //recolor enumeration units
        var regions = d3
            .selectAll(".state")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed.color];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        var circles = d3.selectAll(".bubble")
                .transition() //add animation
                .delay(function (d, i) {
                    return i * 20;
                })
                .duration(500);
        updateBubbleChart(circles, csvData, colorScale, bubbleYscale,bubbleXscale);
        updateChartAxes(bubbleYscale, bubbleXscale)
    }
    //function to update bubble chart
    function updateBubbleChart(circles, csvData, colorScale, yScale,xScale) {
        circles.attr("r", function(d){
                var min = getDataMin(csvData), minRadius = 5
                //calculate the radius based on population value as circle area
                var radius = Math.pow(d[expressed.color] / min, 0.5715) * minRadius;;
                return radius;
            })
            .attr("cy", function(d){
                //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
                return yScale(d[expressed.y]) + topPadding;
            })
            .attr("cx", function(d){
                //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
                return xScale(d[expressed.x]) + leftPadding;
            })
            //color/recolor bubbles
            .style("fill", function (d) {
                var value = d[expressed.color];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })
    }
    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3
            .selectAll("." + props.state_abbr)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    }
    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3
            .selectAll("." + props.state_abbr)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    }
    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + props[expressed.color] + "</h1><b>" + expressed.color + "</b><br><b>" + props.state_abbr + "</b>";

        //create info label div
        var infolabel = d3
            .select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.state_abbr + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div").attr("class", "labelname").html(props.name);
    }
    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }
})();
