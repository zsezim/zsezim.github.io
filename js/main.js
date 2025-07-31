console.log("main.js loaded");
// Parameters
let currentScene = 0;
let covidData;
const scenes = [sceneIntro, sceneGDP, sceneHDI, sceneAge, sceneExplore];

const sceneTitles = [
  "Top 10 Countries by COVID-19 Deaths",
  "Number of Covid Deaths vs. GDP per Capita",
  "Number of Covid Deaths vs. Human Development Index",
  "Number of Covid Deaths vs. Median Age",
  "Explore Individual Countries"
];

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

function renderScene(index) {
  d3.select("#viz").html("");
  d3.select("#scene-title").text(sceneTitles[index]);
  if (index >= 1 && index <= 3) {
    d3.select("#scene-subtitle").text("Peru: Highest Covid Deaths Per Million; Burundi: Lowest Covid Deaths Per Million");
  } else {
    d3.select("#scene-subtitle").text("");
  }
  scenes[index]();
}

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
    .attr("fill", "steelblue");

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0, 400)`).call(d3.axisBottom(x));

   // X-axis label
  g.append("text")
  .attr("x", 300)
  .attr("y", 440)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Number of COVID-19 Deaths per Million");

}

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

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

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

  const peru = filteredData.find(d => d.country === "Peru");
  const burundi = filteredData.find(d => d.country === "Burundi");

  const annotations = [];
  if (peru) {
    annotations.push({
      note: { title: "Peru" },
      x: x(peru[xKey]),
      y: y(peru.deaths),
      dx: 20,
      dy: -30,
      subject: { radius: 6 }
    });
  }
  if (burundi) {
    annotations.push({
      note: { title: "Burundi" },
      x: x(burundi[xKey]),
      y: y(burundi.deaths),
      dx: -20,
      dy: 30,
      subject: { radius: 6 }
    });
  }

  if (annotations.length > 0) {
    const makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations);

    svg.append("g")
      .attr("class", "annotation-group")
      .style("pointer-events", "none")
      .attr("stroke", "red")
      .attr("fill", "red")
      .call(makeAnnotations);
  }
}

function sceneGDP() {
  drawScatter("gdp", "GDP per Capita ($)");
}

function sceneHDI() {
  drawScatter("hdi", "Human Development Index");
}

function sceneAge() {
  drawScatter("age", "Median Age");
}

function sceneExplore() {
  const container = d3.select("#viz");

  container.append("label")
    .attr("for", "countrySelect")
    .text("Select a country: ");

  container.append("select")
    .attr("id", "countrySelect")
    .selectAll("option")
    .data(covidData.filter(d => d.deaths))
    .enter()
    .append("option")
    .attr("value", d => d.country)
    .text(d => d.country);

  container.append("div").attr("id", "countryStats");
  drawCountryFocusedScatter("gdp", "GDP per Capita ($)", null);

  d3.select("#countrySelect").on("change", function () {
    const selectedCountry = this.value;
    d3.select("svg").remove();
    d3.select("#countryStats").html("");
    drawCountryFocusedScatter("gdp", "GDP per Capita ($)", selectedCountry);
  });
}

function drawCountryFocusedScatter(xKey, xLabel, highlightCountry) {
  const margin = { top: 60, right: 100, bottom: 60, left: 80 };
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

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

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

  svg.selectAll("circle")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d[xKey]))
    .attr("cy", d => y(d.deaths))
    .attr("r", d => d.country === highlightCountry ? 8 : 4)
    .attr("fill", d => d.country === highlightCountry ? "orangered" : "steelblue")
    .attr("opacity", d => d.country === highlightCountry ? 1 : 0.6)
    .append("title")
    .text(d => `${d.country}: ${d.deaths.toFixed(1)} deaths`);

  if (highlightCountry) {
    const selected = filteredData.find(d => d.country === highlightCountry);

    if (!selected) {
      d3.select("#countryStats").html(`<p><strong>No data available for this country</strong></p>`);
      return;
    }

    if (selected) {
      const annotation = [
        {
          note: {
            title: selected.country
          },
          x: x(selected[xKey]),
          y: y(selected.deaths),
          dx: 20,
          dy: -30,
          subject: { radius: 6 }
        }
      ];

      const makeAnnotations = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(annotation);

      svg.append("g")
        .attr("class", "annotation-group")
        .style("pointer-events", "none")
        .attr("stroke", "red")
        .attr("fill", "red")
        .call(makeAnnotations);

      d3.select("#countryStats").html(`
        <h3>${selected.country}</h3>
        <p><strong>GDP per Capita:</strong> $${selected.gdp.toFixed(2)}</p>
        <p><strong>HDI:</strong> ${selected.hdi.toFixed(2)}</p>
        <p><strong>Median Age:</strong> ${selected.age}</p>
        <p><strong>Deaths per Million:</strong> ${selected.deaths.toFixed(1)}</p>
      `);
    }
  }
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
