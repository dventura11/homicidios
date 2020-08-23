const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WIDTH = 1200;
const HEIGHT = 600;
const X_PADDING = 25;
const Y_PADDING = 20;
const Y_EXTRA = 2;
const X_TEXT = 50;
const Y_TEXT = 20;
const Y_TEXT_SPACING = 20;
const INTERVAL_DURATION = 1500;
const TRANSITION_DURATION = 500;
const NATIONAL_CATEGORY = "Nacional";
const ITERATE_CATEGORY = "Iterar";

var currentData;
var filteredData;
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
var EntityText;
var rateText;
var pointerRateText;
var totalText;
var xBisector;
var minDate;
var maxDate;
var interval;
var currentIndex = 0;

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
    .attr("width" , WIDTH)
    .attr("height" , HEIGHT)
    .call(responsivefy);

  xScale = d3.scaleTime()
    .range([X_PADDING, WIDTH]);

  yScale = d3.scaleLinear()
    .range([HEIGHT - Y_PADDING, 0]);

  xAxis = svg.append("g")
    .attr("transform", `translate(0, ${HEIGHT - Y_PADDING})`);

  yAxis = svg.append("g")
    .attr("transform", `translate(${X_PADDING}, 0)`);

  xAxisDef = d3.axisBottom()
    .scale(xScale)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat("%Y"));

  yAxisDef = d3.axisLeft(yScale);

}

var setRangeDates = function(values) {
  d3.select("#minDate").text(values[0]);
  d3.select("#maxDate").text(values[1]);
  minDate = new Date(values[0].toString());
  maxDate = new Date((values[1]+1).toString());
};

var filterByDate = function(data) {
  if (data.date < minDate) {
    return false;
  }
  if (data.date > maxDate) {
    return false;
  }
  return true;
};

var updateDates = function(values) {
  setRangeDates(values.newValue);
  render(currentData);
};

var initializeRangeSlide = function(data) {
  range = d3.extent(data, d=> d.date);
  min = range[0].getFullYear();
  max = range[1].getFullYear();
  sliderOptions = { 
    min: min, 
    max: max, 
    value: [min, max]
  };
  slider = new Slider("#yearRange", sliderOptions);
  slider.on('change', updateDates);
  setRangeDates(slider.getValue());
  return data;
}

function renderAxis(data) {
  xScale.domain(d3.extent(data, d=> d.date));
  yScale.domain([0, d3.max(data, d => d.tasa + Y_EXTRA)]);

  xAxis
    .transition()
    .duration(TRANSITION_DURATION)
    .call(xAxisDef);
    yAxis
      .transition()
      .duration(TRANSITION_DURATION)
      .call(yAxisDef)
}

var formatDate = function(d) {   
  year = d.date.substring(0,4);
  month = MONTHS[Number(d.date.substring(5,7)) - 1];
  formattedDate = month + " " + year;
  return formattedDate;
};

var formatRow = function(d) {   
  d.formattedDate = formatDate(d);
  d.count = Number(d.count);
  d.formattedCount =  d.count.toLocaleString();
  d.date = new Date(d.date+"-15");
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

  resultData = Array.from(seriesData.values());
  resultData = resultData.sort((a, b) => a.state.localeCompare(b.state));
  return resultData;
};

var getXScale = function(d) {
  return xScale(d.date);
}

var getYScale = function(d) {
  return yScale(d.tasa);
}

function renderLine(data) {
  line = d3.line()
    .x(d => getXScale(d) - X_PADDING)
    .y(getYScale);

  path = svg
    .selectAll('path')
    .datum(data)

    path
      .enter()
      .append('path')
      .merge(path)
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("class", "line")
      .attr('d', line);

      path
        .exit()
        .remove();
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
  xPosition = d3.mouse(this)[0];
  x = xScale.invert(xPosition);
  i = xBisector(filteredData, x);
  i -= x.getDate() < 15 ? 1 : 0;
  i = i < 0 ? 0 : i;
  current = filteredData[i];
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
    .attr("x", X_TEXT)
    .attr("y", Y_TEXT);

  entityText = svg.append('g')
    .append('text')
    .attr("class", "entity-text")
    .attr("x", WIDTH/2)
    .attr("y", Y_TEXT)
    .append("tspan")
    .text(NATIONAL_CATEGORY);


  dateText = fixedText.append("tspan");
  rateText = fixedText.append("tspan")
    .attr("x", X_TEXT)
    .attr("dy", Y_TEXT_SPACING);
  totalText = fixedText.append("tspan")
    .attr("x", X_TEXT)
    .attr("dy", Y_TEXT_SPACING);
  hidePointer();
  svg.append('rect')
    .style("fill", "none")
    .style("pointer-events", "all")
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .on('mouseover', showPointer)
    .on('mousemove', renderPointerInfo)
    .on('mouseout', hidePointer);
}

var assignNational = function(data) {
  nationalData = data;
  return data;
};

var assignStates = function(data) {
  statesData = data;
  currentIndex = statesData.length;
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

var render = function(data) {
  currentData = data;
  filteredData = data.filter(filterByDate);
  renderAxis(filteredData);
  renderLine(filteredData);
  return data;
};

var renderStates = function() {
  renderStatesLines(statesData);
};

var renderNext = function(d) {
  currentIndex++;
  currentIndex %= statesData.length + 1;
  if (currentIndex == statesData.length) {
    entityText.text(NATIONAL_CATEGORY);
    render(nationalData);
  } else {
    currentState = statesData[currentIndex];
    entityText.text(currentState.state);
    d3.select("#state-select")
      .text(currentState.state);
    render(Array.from(currentState.values));
  }
};

var stopInterval = function() {
  if (interval) {
   interval.stop(); 
  }
  interval = undefined;
};

var renderIterator = function() {
  if (interval) {
    return;
  }
  isIteratorActive = d3.select("#iterate-button").classed("active");
  isNationalActive = d3.select("#national-button").classed("active");
  currentState = d3.select("#state-select").text;
  if (isIteratorActive) {
    return;
  }
  d3.select("#iterate-button").classed('active', true);
  d3.select("#state-select")
    .classed('active', false);
  interval = d3.interval(renderNext, INTERVAL_DURATION);
};

var renderNational = function() {
  currentIndex = statesData.length;
  render(nationalData);
  d3.select("#national-button").classed('active', true);
  d3.select("#state-select")
    .classed('active', false)
    .text("Estados");
  entityText.text(NATIONAL_CATEGORY);
  stopInterval();
};

var renderState = function() {
  currentIndex = statesData.findIndex(d => d.state == category);
  render(Array.from(statesData.find(d => d.state == category).values));
  d3.select("#state-select")
    .classed('active', true)
    .text(category);
    entityText.text(category);
  stopInterval();
};

var renderCategory = function() {
  category = this.textContent;
  d3.selectAll(".category-option").classed('active', false);
  switch (category) {
    case NATIONAL_CATEGORY:
      renderNational();
      break;
    case ITERATE_CATEGORY:
      renderIterator();
      break;
    default:
      renderState();
  }
};

var addButtonsEvents = function() {
  d3.selectAll(".category-option")
    .on("click", renderCategory);
};

renderLayout();
renderPositionInfo();

loadNationalData()
  .then(format)
  .then(assignNational)
  .then(initializeRangeSlide)
  .then(render);
  loadStatesData()
    .then(format)
    .then(convertToSeriesFormat)
    .then(assignStates)
    .then(addButtonsEvents);
