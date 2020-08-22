var months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
var width = 1100;
var height = 600;
var xPadding = 25;
var yPadding = 40;
var yExtra = 3;
var xText = 50;
var yText = 20;
var yTextSpacing = 20;
var radius = 1;

var currentData;
var nationalData;
var statesData;
var statesSet;
var svg;
var xScale;
var yScale;
var xAxis;
var yAxis;
var pointer;
var pointerText;
var fixedText;
var dateText;
var rateText;
var pointerRateText;
var totalText;
var xBisector;

function loadNationalData() {
  return d3.csv("data/nacional.csv");
}

function loadStatesData() {
  return d3.csv("data/estados.csv");
}

// source: https://brendansudol.com/writing/responsive-d3
function responsivefy(svg) {
  var container = d3.select(svg.node().parentNode),
    width = parseInt(svg.style("width")),
    height = parseInt(svg.style("height")),
    aspect = width / height;

  svg.attr("viewBox", "0 0 " + width + " " + height)
    .attr("perserveAspectRatio", "xMinYMid")
    .call(resize);

    d3.select(window).on("resize." + container.attr("id"), resize);

    function resize() {
      var targetWidth = parseInt(container.style("width"));
      svg.attr("width", targetWidth);
      svg.attr("height", Math.round(targetWidth / aspect));
    }
}

function renderLayout() {
  svg = d3.select("#graphic") 
    .append("svg")
    .attr("width" , width)
    .attr("height" , height)
    .call(responsivefy);
}

function renderAxis() {
  xAxisDef = d3.axisBottom()
    .scale(xScale)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat("%Y"));

  xAxis = svg.append("g")
    .call(xAxisDef)
    .attr("transform", "translate(0, " + (height - yPadding) + ")");

  yAxis = svg.append("g")
    .call(d3.axisLeft(yScale))
    .attr("transform", "translate(" + xPadding + ", 0)");
}

var formatDate = function(d) {   
  year = d.date.substring(0,4);
  month = months[Number(d.date.substring(5,7)) - 1];
  formattedDate = month + " " + year;
  return formattedDate;
};

var formatRow = function(d) {   
  d.formattedDate = formatDate(d);
  d.count = Number(d.count);
  d.formattedCount =  d.count.toLocaleString();
  d.date = new Date(d.date);
  d.date.setDate(d.date.getDate());
  if (d.tasa) {
    d.tasa = Number(d.tasa);
  } else {
    d.tasa = ((d.count*12)/Number(d.population)) * 100000;
  }
  d.formattedRate = d.tasa.toFixed(1);
  return d;
};

var format = function(data) {
  data.forEach(formatRow);
  return data;
};

var convertToStackFormat = function(data) {
  seriesData = new Map();
  statesSet = new Set();
  data.forEach(d => {
    if (!seriesData.has(d.formattedDate)) {
      seriesData.set(d.formattedDate, { 
        "date": d.date,
        "formattedDate": d.formattedDate
      });
    }
    seriesData.get(d.formattedDate)[d.state] = Number(d.formattedRate);
    statesSet.add(d.state);
  });
  return Array.from(seriesData.values());
};

var convertToSeriesFormat = function(data) {
  seriesData = new Map();
  statesSet = new Set();
  data.forEach(d => {
    if (!seriesData.has(d.state)) {
      seriesData.set(d.state, { 
        "state": d.state,
        "values": new Set()
      });
    }
    seriesData.get(d.state).values.add(d);
    statesSet.add(d.state);
  });
  return Array.from(seriesData.values());
};

function defineXScale(data) {
  xScale = d3.scaleTime()
    .domain([
      d3.min(data, d=> d.date),
      d3.max(data, d=> d.date)
    ])
      .range([xPadding, width]);
}

function defineYScale(data) {
  yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.tasa + yExtra)])
    .range([height - yPadding, 0]);
}

var defineScales = function(data) {
  defineXScale(data);
  defineYScale(data);
  return data;
};

var getXScale = function(d) {
  return xScale(d.date);
}

var getYScale = function(d) {
  return yScale(d.tasa);
}

function renderLine(data) {
  svg.append("path")
    .datum(data)
    .transition()
    .duration(1000)
    .attr("class", "line")
    .attr("d", d3.line()
      .x(getXScale)
      .y(getYScale)
    )
}

function updateLine(data) {
  svg.selectAll("path").remove();
  renderLine(data);
  /*
   svg.selectAll("path")
     .datum(data)
     .transition()
     .duration(1000)
     .attr("class", "line")
     .attr("d", d3.line()
       .x(getXScale)
       .y(getYScale)
     )
     */
    }

function showPointer() {
  pointer.style("opacity", 1);
  pointerText.style("opacity", 1);
  fixedText.style("opacity", 1);
}

function hidePointer() {
  pointer.style("opacity", 0);
  pointerText.style("opacity", 0);
  fixedText.style("opacity", 0);
}

function renderPointerCircle(d) {
  pointer
    .attr("cx", getXScale(d))
    .attr("cy", getYScale(d));

    pointerText
      .attr("x", getXScale(d))
      .attr("y", getYScale(d));
}

function renderPointerText(d) {
  dateText.text(`Fecha: ${d.formattedDate}`);
  rateText.text(`Tasa: ${d.formattedRate}`);
  pointerRateText.text(`${d.formattedRate}`);
  totalText.text(`Total: ${d.formattedCount}`);
}

function renderPointerInfo() {
  x = xScale.invert(d3.mouse(this)[0]);
  i = xBisector(currentData, x, 1);
  current = currentData[i];

  renderPointerCircle(current);
  renderPointerText(current);
}

function renderPositionInfo() {
  xBisector = d3.bisector(d => d.date).left;

  pointer = svg.append('g')
    .append('circle')
    .attr("class", "pointer");

  pointerText = svg.append('g')
    .append('text')
    .style("opacity", 0)
    .attr("class", "pointer-text");
  pointerRateText = pointerText.append("tspan");

  fixedText = svg.append('g')
    .append('text')
    .style("opacity", 0)
    .attr("class", "fixed-text")
    .attr("x", xText)
    .attr("y", yText);

  dateText = fixedText.append("tspan");
  rateText = fixedText.append("tspan")
    .attr("x", xText)
    .attr("dy", yTextSpacing);
  totalText = fixedText.append("tspan")
    .attr("x", xText)
    .attr("dy", yTextSpacing);

  svg.append('rect')
    .style("fill", "none")
    .style("pointer-events", "all")
    .attr('width', width)
    .attr('height', height)
    .on('mouseover', showPointer)
    .on('mousemove', renderPointerInfo)
    .on('mouseout', hidePointer);
}

var line = d3.line()
  // .defined(d => d.state == 'GUANAJUATO')
  .x(getXScale)
  .y(getYScale);

var assignNational = function(data) {
  nationalData = data;
  return data;
};

var assignStates = function(data) {
  statesData = data;
  selectStates = d3.select('#states-list')
    .selectAll('li.category-option a')
    .data(Array.from(statesSet).sort());
  selectStates.enter()
    .append('li')
    .attr('class', 'category-option')
    .append('a')
    .attr('href', '#')
    .text(function(d) {
      return d
    });

    return data;
};

function renderStatesLines(data) {
  path = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(data)
    .join("path")
    .style("mix-blend-mode", "multiply")
    .attr("d", d => line(Array.from(d.values)));
}

var renderNational = function(data) {
  currentData = data;
  defineScales(data);
  renderLayout();
  renderAxis();
  renderLine(data);
  renderPositionInfo();
};

var updateGraph = function(data) {
  currentData = data;
  defineYScale(data)
  updateLine(data);
  yAxis.transition().duration(1000).call(d3.axisLeft(yScale));
};

var renderStates = function() {
  renderStatesLines(statesData);
};

var renderCategory = function() {
  category = this.textContent;
  d3.selectAll(".category-option").classed('active', false);
  if (category == "Nacional") {
    updateGraph(nationalData);
    d3.selectAll("#national-button").classed('active', true);
    d3.selectAll("#state-select")
      .classed('active', false)
      .text("Estados");
  } else {
    updateGraph(Array.from(statesData.find(d => d.state == category).values));
    d3.selectAll("#state-select")
      .classed('active', true)
      .text(category);
  }
};

var addButtonsEvents = function() {
  d3.selectAll(".category-option")
    .on("click", renderCategory);
};

loadNationalData()
  .then(format)
  .then(assignNational)
  .then(renderNational);
  loadStatesData()
    .then(format)
    .then(convertToSeriesFormat)
    .then(assignStates)
    .then(addButtonsEvents);
