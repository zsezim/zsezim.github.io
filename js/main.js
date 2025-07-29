// Parameters
let currentScene = 0;
let selectedX = "gdp"; // exploration scene parameter
let covidData;

const scenes = [sceneIntro, sceneGDP, sceneHDI, sceneAge, sceneExplore];
const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

// Load data and render the first scene
d3.csv("data/owid-covid-data.csv").then(data => {
  covidData = data.map(d => ({
    country: d.location,
    deaths: parseFloat(d.total_deaths_per_million),
    gdp: parseFloat(d.gdp_per_capita),
    hdi: parseFloat(d.human_development_index),
    age: parseFloat(d.median_age)
  }));
  renderScene(currentScene);
});

// Scene renderer
function renderScene(index) {
  d3.select("#viz").html("");
  scenes[index]();
}

// Scene 1: Intro bar chart
function sceneIntro() {
  const svg = d3.select("#viz").append("svg")
    .attr("width", 800)
    .attr("height", 500);

  const topCountries = covidData
    .filter(d => d.deaths)
    .sort((a, b) => d3.descending(a.deaths, b.deaths))
    .slice(0, 10);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topCountries, d => d.deaths)])
    .range([0, 600]);

  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.country))
    .range([0, 400])
    .padding(0.1);

  const g = svg.append("g").attr("transform", "translate(150,50)");

  g.selectAll("rect")
    .data(topCountries)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.deaths))
    .attr("height", y.bandwidth())
    .attr("fill", "crimson");

  g.append("g").call(d3.axisLeft(y));
  g.append("g")
    .attr("transform", `translate(0, 400)`)
    .call(d3.axisBottom(x));
}

// Scatterplot generator with annotations
function drawScatter(xKey, xLabel) {
  const margin = { top: 50, right: 50, bottom: 60, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#viz").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filteredData = covidData.filter(d => d.deaths && d[xKey]);

  const x = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d[xKey])).nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d.deaths)).nice()
    .range([height, 0]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g")
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(xLabel);

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("COVID-19 Deaths per Million");

  // Scatter dots
  svg.selectAll("circle")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d[xKey]))
    .attr("cy", d => y(d.deaths))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .append("title")
    .text(d => `${d.country}: ${d.deaths.toFixed(1)} deaths`);

  // Hardcoded annotation points
  const maxCountry = {
    country: "Peru",
    deaths: 6601.11,
    gdp: 12236.71,
    hdi: 0.77,
    age: 29.1
  };

  const minCountry = {
    country: "Burundi",
    deaths: 1.13,
    gdp: 702.23,
    hdi: 0.43,
    age: 17.5
  };

  const annotations = [
    {
      note: {
        label: `${xLabel}: ${maxCountry[xKey].toFixed(2)}`,
        title: `${maxCountry.country}`
      },
      //x: clamp(x(maxCountry[xKey]), 0, width),
      //y: clamp(y(maxCountry.deaths), 0, height),
      x: x(maxCountry[xKey]),
      y: y(maxCountry.deaths),
      dy: -40,
      dx: 10,
      subject: { radius: 6 }
    },
    {
      note: {
        label: `${xLabel}: ${minCountry[xKey].toFixed(2)}`,
        title: `${minCountry.country}`
      },
      //x: clamp(x(minCountry[xKey]), 0, width),
      //y: clamp(y(minCountry.deaths), 0, height),
      x: x(minCountry[xKey]),
      y: y(minCountry.deaths),
      dy: 40,
      dx: -10,
      subject: { radius: 6 }
    }
  ];
  

  const makeAnnotations = d3.annotation()
    .type(d3.annotationLabel)
    .annotations(annotations);

  svg.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);
}

// Scene 2: GDP scatterplot
function sceneGDP() {
  selectedX = "gdp";
  drawScatter(selectedX, "GDP per Capita ($)");
}

// Scene 3: HDI scatterplot
function sceneHDI() {
  selectedX = "hdi";
  drawScatter(selectedX, "Human Development Index");
}

// Scene 4: Age scatterplot
function sceneAge() {
  selectedX = "age";
  drawScatter(selectedX, "Median Age");
}

// Scene 5: Interactive exploration
function sceneExplore() {
  const container = d3.select("#viz");

  container.append("label")
    .text("Compare against: ")
    .append("select")
    .attr("id", "xSelect")
    .selectAll("option")
    .data(["gdp", "hdi", "age"])
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => ({
      gdp: "GDP per Capita ($)",
      hdi: "Human Development Index",
      age: "Median Age"
    }[d]));

  drawScatter(selectedX, {
    gdp: "GDP per Capita ($)",
    hdi: "Human Development Index",
    age: "Median Age"
  }[selectedX]);

  d3.select("#xSelect").on("change", function () {
    selectedX = this.value;
    d3.select("svg").remove();
    drawScatter(selectedX, {
      gdp: "GDP per Capita ($)",
      hdi: "Human Development Index",
      age: "Median Age"
    }[selectedX]);
  });
}

// Navigation buttons
d3.select("#next").on("click", () => {
  if (currentScene < scenes.length - 1) {
    currentScene++;
    renderScene(currentScene);
  }
});

d3.select("#prev").on("click", () => {
  if (currentScene > 0) {
    currentScene--;
    renderScene(currentScene);
  }
});
