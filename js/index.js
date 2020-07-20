$(document).ready(function() {

  var months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var width = 1280;
  var height = 600;
  var xPadding = 25;
  var yPadding = 5;
  var xText = 50;
  var yText = 20;
  var yTextSpacing = 20;
  var radius = 1;

  var currentData;
  var svg;
  var xScale;
  var yScale;
  var pointer;
  var pointerText;
  var dateText;
  var rateText;
  var totalText;
  var xBisector;

  function loadData() {
    return d3.csv("data/nacional.csv");
  }

  function renderLayout() {
    svg = d3.select("#graphic") 
      .append("svg")
      .attr("width" , width)
      .attr("height" , height);

    xAxis = d3.axisBottom()
      .scale(xScale)
      .ticks(d3.timeYear.every(1))
      .tickFormat(d3.timeFormat("%Y"));

    yAxis = d3.axisLeft()
      .scale(yScale);

    svg.append("g")
      .call(xAxis)
      .attr("transform", "translate(0, " + (height - 40) + ")");

      svg.append("g")
        .call(yAxis)
        .attr("transform", "translate(" + xPadding + ", " + -40 + ")");
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
    d.tasa = Number(d.tasa);
    d.formattedRate = d.tasa.toFixed(1);
    return d;
  };

  var format = function(data) {
    data.forEach(formatRow);
    return data;
  };

  function defineScales(data) {
    xScale = d3.scaleTime().domain([
      d3.min(data, function(d) { return d.date;}),
      d3.max(data, function(d) { return d.date;}),
    ]).range([xPadding, width]);

    yScale = d3.scaleLinear().domain([
      0, d3.max(data, function(d) { return d.tasa + yPadding;}),
    ]).range([height, yPadding]);

    return data;
  }

  var getXScale = function(d) {
    return xScale(d.date);
  }

  var getYScale = function(d) {
    return yScale(d.tasa);
  }

  function renderLine(data) {
    svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", d3.line()
        .x(getXScale)
        .y(getYScale)
      )
  }

  function showPointer() {
    pointer.style("opacity", 1);
    pointerText.style("opacity", 1);
  }

  function hidePointer() {
    pointer.style("opacity", 0);
    pointerText.style("opacity", 0);
  }

  function renderPointerCircle(d) {
    pointer
      .attr("cx", getXScale(d))
      .attr("cy", getYScale(d));
  }

  function renderPointerText(d) {
    dateText.text(`Fecha: ${d.formattedDate}`);
    rateText.text(`Tasa: ${d.formattedRate}`);
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
      .attr("class", "pointer-text")
      .attr("x", xText)
      .attr("y", yText);

    dateText = pointerText.append("tspan");
    rateText = pointerText.append("tspan")
      .attr("x", xText)
      .attr("dy", yTextSpacing);
    totalText = pointerText.append("tspan")
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

  var render = function(data) {
    currentData = data;
    defineScales(data);
    renderLayout();
    renderLine(data);
    renderPositionInfo();
  };

  loadData()
    .then(format)
    .then(render);
});

