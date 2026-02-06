const OSCARS_CSV = 'data/processed/oscars.csv';
const DIRECTORS_CSV = 'data/Oscar Winners - Director.csv';
const AGE_CSV = 'data/processed/oscars_age_winners.csv';

const COLORS = {
  female: '#b21f2d',
  male: '#1f6fb2',
  win: '#2f8f5b',
  nom: '#c08f2d',
  white: '#444444',
  black: '#1f6fb2',
  asian: '#b21f2d',
  hispanic: '#2f8f5b',
  grid: '#ded8c9',
};

const RACES = ['White', 'Black', 'Asian', 'Hispanic'];

function categoryGroup(category) {
  const c = (category || '').toUpperCase();
  if (c.includes('ACTOR') || c.includes('ACTRESS') || c.includes('PERFORMANCE')) return 'Acting';
  if (c.includes('DIRECTING') || c.includes('DIRECTOR')) return 'Directing';
  if (c.includes('WRITING') || c.includes('SCREENPLAY') || c.includes('SCRIPT')) return 'Writing';
  if (c.includes('MUSIC') || c.includes('SONG') || c.includes('SCORE') || c.includes('SOUNDTRACK')) return 'Music';
  if (c.includes('PICTURE') || c.includes('PRODUCTION')) return 'Picture/Production';
  if (
    c.includes('CINEMATOGRAPH') ||
    c.includes('EDITING') ||
    c.includes('VISUAL') ||
    c.includes('SOUND') ||
    c.includes('DESIGN') ||
    c.includes('ART DIRECTION') ||
    c.includes('COSTUME') ||
    c.includes('MAKEUP') ||
    c.includes('HAIR') ||
    c.includes('ANIMAT') ||
    c.includes('DOCUMENTARY') ||
    c.includes('SHORT')
  ) return 'Technical';
  return 'Other';
}

function createSVG(container, height = 360, margin = { top: 30, right: 30, bottom: 40, left: 50 }) {
  const node = typeof container === 'string' ? document.querySelector(container) : container;
  if (!node) return null;
  node.innerHTML = '';
  const width = node.clientWidth;
  const svg = d3.select(node)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  return { svg, g, width, height, margin, innerWidth: width - margin.left - margin.right, innerHeight: height - margin.top - margin.bottom };
}

function addLegend(container, items) {
  const node = d3.select(container).append('div').attr('class', 'legend');
  items.forEach(d => {
    const item = node.append('div').attr('class', 'item');
    item.append('span').attr('class', 'swatch').style('background', d.color);
    item.append('span').text(d.label);
  });
}

async function loadData() {
  const [oscars, directors, ages] = await Promise.all([
    d3.csv(OSCARS_CSV, d => ({
      year_film: +d.year_film,
      year_ceremony: +d.year_ceremony,
      ceremony: +d.ceremony,
      Category: d.Category,
      gender: (d.gender || '').trim(),
      name: d.name,
      Race: (d.Race || '').trim(),
      film: d.film,
      winner: +d.winner,
    })),
    d3.csv(DIRECTORS_CSV, d => ({
      year: +String(d['Year'] || '').match(/\d{4}/)?.[0],
      gender: (d['Gender'] || '').trim(),
      race: (d['Race'] || '').trim(),
      director: d['Director(s)'],
      film: d['Film'],
      status: (d['Nomination/Winner'] || '').trim(),
    })),
    d3.csv(AGE_CSV, d => ({
      award_year: +d.award_year,
      gender: d.gender === 'f' ? 'Female' : 'Male',
      age: +d.age,
    }))
  ]);

  return { oscars, directors, ages };
}

function renderGenderShareLine(oscars) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-line-gender', 380);

  const grouped = d3.rollups(
    oscars,
    v => {
      const total = v.length;
      const female = v.filter(d => d.gender.toLowerCase() === 'female').length;
      const nonWhite = v.filter(d => d.Race && d.Race !== 'White').length;
      const whiteMale = v.filter(d => d.Race === 'White' && d.gender.toLowerCase() === 'male').length;
      const winTotal = v.filter(d => d.winner === 1).length;
      const winFemale = v.filter(d => d.winner === 1 && d.gender.toLowerCase() === 'female').length;
      const winNonWhite = v.filter(d => d.winner === 1 && d.Race && d.Race !== 'White').length;
      const winWhiteMale = v.filter(d => d.winner === 1 && d.Race === 'White' && d.gender.toLowerCase() === 'male').length;
      return {
        total,
        femaleShare: total ? female / total : 0,
        winShare: winTotal ? winFemale / winTotal : 0,
        nonWhiteShare: total ? nonWhite / total : 0,
        winNonWhiteShare: winTotal ? winNonWhite / winTotal : 0,
        whiteMaleShare: total ? whiteMale / total : 0,
        winWhiteMaleShare: winTotal ? winWhiteMale / winTotal : 0,
      };
    },
    d => d.year_ceremony
  ).map(([year, v]) => ({ year: +year, ...v }));

  const data = grouped.filter(d => d.year).sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, 1])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format('d'));
  const yAxis = d3.axisLeft(y).tickFormat(d3.format('.0%'));

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(xAxis);
  g.append('g').attr('class', 'axis').call(yAxis);

  const lineNom = d3.line().x(d => x(d.year)).y(d => y(d.femaleShare));
  const lineWin = d3.line().x(d => x(d.year)).y(d => y(d.winShare));
  const lineNonWhiteNom = d3.line().x(d => x(d.year)).y(d => y(d.nonWhiteShare));
  const lineNonWhiteWin = d3.line().x(d => x(d.year)).y(d => y(d.winNonWhiteShare));
  const lineWhiteMaleNom = d3.line().x(d => x(d.year)).y(d => y(d.whiteMaleShare));
  const lineWhiteMaleWin = d3.line().x(d => x(d.year)).y(d => y(d.winWhiteMaleShare));

  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.female).attr('stroke-width', 2.5).attr('d', lineNom);
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.win).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', lineWin);
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.male).attr('stroke-width', 2.5).attr('d', lineNonWhiteNom);
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.nom).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', lineNonWhiteWin);
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.white).attr('stroke-width', 2.5).attr('d', lineWhiteMaleNom);
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', COLORS.white).attr('stroke-width', 2).attr('stroke-dasharray', '4 3').attr('opacity', 0.7).attr('d', lineWhiteMaleWin);

  const markerYear = 2015;
  g.append('line')
    .attr('x1', x(markerYear))
    .attr('x2', x(markerYear))
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .attr('stroke', '#888')
    .attr('stroke-dasharray', '3 3');
  g.append('text')
    .attr('x', x(markerYear) + 6)
    .attr('y', 12)
    .attr('class', 'label')
    .text('2015: #OscarsSoWhite');

  addLegend('#chart-line-gender', [
    { label: 'Female share of nominees', color: COLORS.female },
    { label: 'Female share of winners', color: COLORS.win },
    { label: 'Non‑White share of nominees', color: COLORS.male },
    { label: 'Non‑White share of winners', color: COLORS.nom },
    { label: 'White‑Male share of nominees', color: COLORS.white },
    { label: 'White‑Male share of winners (dashed)', color: COLORS.white },
  ]);
}

function renderToggleLine(oscars) {
  const container = d3.select('#chart-line-toggle');
  container.html('');

  const controls = container.append('div').style('margin', '4px 0 10px 0').style('display', 'flex').style('gap', '8px');
  const btnGender = controls.append('button').text('Gender View').attr('class', 'toggle-btn active');
  const btnRace = controls.append('button').text('Race View').attr('class', 'toggle-btn');

  const chartWrap = container.append('div').node();

  const dataByYear = d3.rollups(
    oscars,
    v => {
      const total = v.length;
      const winTotal = v.filter(d => d.winner === 1).length;
      const female = v.filter(d => d.gender.toLowerCase() === 'female').length;
      const male = v.filter(d => d.gender.toLowerCase() === 'male').length;
      const nonWhite = v.filter(d => d.Race && d.Race !== 'White').length;
      const white = v.filter(d => d.Race === 'White').length;
      const winFemale = v.filter(d => d.winner === 1 && d.gender.toLowerCase() === 'female').length;
      const winMale = v.filter(d => d.winner === 1 && d.gender.toLowerCase() === 'male').length;
      const winNonWhite = v.filter(d => d.winner === 1 && d.Race && d.Race !== 'White').length;
      const winWhite = v.filter(d => d.winner === 1 && d.Race === 'White').length;
      return {
        total,
        winTotal,
        femaleShare: total ? female / total : 0,
        maleShare: total ? male / total : 0,
        nonWhiteShare: total ? nonWhite / total : 0,
        whiteShare: total ? white / total : 0,
        winFemaleShare: winTotal ? winFemale / winTotal : 0,
        winMaleShare: winTotal ? winMale / winTotal : 0,
        winNonWhiteShare: winTotal ? winNonWhite / winTotal : 0,
        winWhiteShare: winTotal ? winWhite / winTotal : 0,
      };
    },
    d => d.year_ceremony
  ).map(([year, v]) => ({ year: +year, ...v })).sort((a, b) => a.year - b.year);

  function draw(mode) {
    const chart = createSVG(chartWrap, 360);
    if (!chart) return;
    const { g, innerWidth, innerHeight } = chart;
    const x = d3.scaleLinear().domain(d3.extent(dataByYear, d => d.year)).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 1]).nice().range([innerHeight, 0]);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickFormat(d3.format('.0%')));

    const line = key => d3.line().x(d => x(d.year)).y(d => y(d[key]));
    if (mode === 'gender') {
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.female).attr('stroke-width', 2.5).attr('d', line('femaleShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.female).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('winFemaleShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.male).attr('stroke-width', 2.5).attr('d', line('maleShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.male).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('winMaleShare'));
      addLegend('#chart-line-toggle', [
        { label: 'Female nominees', color: COLORS.female },
        { label: 'Female winners', color: COLORS.female },
        { label: 'Male nominees', color: COLORS.male },
        { label: 'Male winners', color: COLORS.male },
      ]);
    } else {
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.white).attr('stroke-width', 2.5).attr('d', line('whiteShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.white).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('winWhiteShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.nom).attr('stroke-width', 2.5).attr('d', line('nonWhiteShare'));
      g.append('path').datum(dataByYear).attr('fill', 'none').attr('stroke', COLORS.nom).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('winNonWhiteShare'));
      addLegend('#chart-line-toggle', [
        { label: 'White nominees', color: COLORS.white },
        { label: 'White winners', color: COLORS.white },
        { label: 'Non‑White nominees', color: COLORS.nom },
        { label: 'Non‑White winners', color: COLORS.nom },
      ]);
    }
  }

  function setActive(btn) {
    btnGender.classed('active', false);
    btnRace.classed('active', false);
    btn.classed('active', true);
  }

  btnGender.on('click', () => { container.selectAll('svg, .legend').remove(); setActive(btnGender); draw('gender'); });
  btnRace.on('click', () => { container.selectAll('svg, .legend').remove(); setActive(btnRace); draw('race'); });

  draw('gender');
}

function renderCategoryGroupBars(oscars) {
  const data = oscars.map(d => ({
    year: d.year_ceremony,
    decade: Math.floor(d.year_ceremony / 10) * 10,
    group: categoryGroup(d.Category),
    gender: d.gender.toLowerCase(),
  }));

  const groups = Array.from(new Set(data.map(d => d.group))).sort();
  const decades = Array.from(new Set(data.map(d => d.decade))).sort((a, b) => a - b);

  const byGroup = d3.group(data, d => d.group, d => d.decade);

  const container = d3.select('#chart-bars-groups');
  container.html('');

  const list = container.append('div').style('display', 'flex').style('flex-direction', 'column').style('gap', '16px');

  groups.forEach(group => {
    const box = list.append('div').style('border', '1px solid #e3dccd').style('border-radius', '8px').style('padding', '8px');
    box.append('div').style('font-size', '14px').style('margin-bottom', '6px').style('font-weight', '600').text(group);
    const svgWrap = box.append('div').node();
    const chart = createSVG(svgWrap, 280, { top: 10, right: 14, bottom: 44, left: 48 });
    if (!chart) return;
    const { g, innerWidth, innerHeight } = chart;

    const rows = decades.map(decade => {
      const items = (byGroup.get(group)?.get(decade)) || [];
      const total = items.length;
      const female = items.filter(d => d.gender === 'female').length;
      return { decade, share: total ? female / total : 0 };
    });

    const x = d3.scaleBand().domain(decades).range([0, innerWidth]).padding(0.1);
    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(decades.filter(d => d % 10 === 0)).tickFormat(d3.format('d')))
      .selectAll('text').attr('transform', 'rotate(-30)').style('text-anchor', 'end');
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')));

    g.selectAll('rect').data(rows).enter().append('rect')
      .attr('x', d => x(d.decade))
      .attr('y', d => y(d.share))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.share))
      .attr('fill', COLORS.female);
  });
}

function renderDirectors(directors) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-directors', 360);

  const filtered = directors.filter(d => d.year && d.gender);

  const years = Array.from(new Set(filtered.map(d => d.year))).sort((a, b) => a - b);

  const yearly = years.map(year => {
    const items = filtered.filter(d => d.year === year);
    const counts = {
      year,
      femaleNom: items.filter(d => d.gender === 'Female' && d.status === 'Nomination').length,
      maleNom: items.filter(d => d.gender === 'Male' && d.status === 'Nomination').length,
      femaleWin: items.filter(d => d.gender === 'Female' && d.status === 'Winner').length,
      maleWin: items.filter(d => d.gender === 'Male' && d.status === 'Winner').length,
    };
    return counts;
  });

  let cumFemaleNom = 0, cumMaleNom = 0, cumFemaleWin = 0, cumMaleWin = 0;
  const cumulative = yearly.map(d => {
    cumFemaleNom += d.femaleNom;
    cumMaleNom += d.maleNom;
    cumFemaleWin += d.femaleWin;
    cumMaleWin += d.maleWin;
    return { year: d.year, cumFemaleNom, cumMaleNom, cumFemaleWin, cumMaleWin };
  });

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(cumulative, d => Math.max(d.cumFemaleNom, d.cumMaleNom, d.cumFemaleWin, d.cumMaleWin)) || 1])
    .nice()
    .range([innerHeight, 0]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

  const pointsLayer = g.append('g').attr('class', 'points');

  const line = (key) => d3.line().x(d => x(d.year)).y(d => y(d[key]));

  g.append('path').datum(cumulative).attr('fill', 'none').attr('stroke', COLORS.female).attr('stroke-width', 2).attr('d', line('cumFemaleNom'));
  g.append('path').datum(cumulative).attr('fill', 'none').attr('stroke', COLORS.male).attr('stroke-width', 2).attr('d', line('cumMaleNom'));
  g.append('path').datum(cumulative).attr('fill', 'none').attr('stroke', COLORS.female).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('cumFemaleWin'));
  g.append('path').datum(cumulative).attr('fill', 'none').attr('stroke', COLORS.male).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('cumMaleWin'));

  addLegend('#chart-directors', [
    { label: 'Female – Nominations (cumulative)', color: COLORS.female },
    { label: 'Female – Wins (cumulative, dashed)', color: COLORS.female },
    { label: 'Male – Nominations (cumulative)', color: COLORS.male },
    { label: 'Male – Wins (cumulative, dashed)', color: COLORS.male },
  ]);
}

function renderDirectorsShare(directors) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-directors-share', 320);
  const filtered = directors.filter(d => d.year && d.gender);
  const decades = Array.from(new Set(filtered.map(d => Math.floor(d.year / 10) * 10))).sort((a, b) => a - b);

  const rows = decades.map(decade => {
    const items = filtered.filter(d => Math.floor(d.year / 10) * 10 === decade);
    const nomTotal = items.filter(d => d.status === 'Nomination').length || 1;
    const winTotal = items.filter(d => d.status === 'Winner').length || 1;
    const femaleNom = items.filter(d => d.status === 'Nomination' && d.gender === 'Female').length / nomTotal;
    const femaleWin = items.filter(d => d.status === 'Winner' && d.gender === 'Female').length / winTotal;
    return { decade, femaleNom, femaleWin };
  });

  const x = d3.scaleBand().domain(decades).range([0, innerWidth]).padding(0.2);
  const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d'))).selectAll('text').attr('transform', 'rotate(-30)').style('text-anchor', 'end');
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickFormat(d3.format('.0%')));

  const barW = x.bandwidth() / 2;
  g.selectAll('.bar-nom').data(rows).enter().append('rect')
    .attr('x', d => x(d.decade))
    .attr('y', d => y(d.femaleNom))
    .attr('width', barW)
    .attr('height', d => innerHeight - y(d.femaleNom))
    .attr('fill', COLORS.female);

  g.selectAll('.bar-win').data(rows).enter().append('rect')
    .attr('x', d => x(d.decade) + barW)
    .attr('y', d => y(d.femaleWin))
    .attr('width', barW)
    .attr('height', d => innerHeight - y(d.femaleWin))
    .attr('fill', COLORS.win);

  addLegend('#chart-directors-share', [
    { label: 'Female share of nominations', color: COLORS.female },
    { label: 'Female share of wins', color: COLORS.win },
  ]);
}

function radarChart(container, data, { width = 460, height = 360, label = '' }) {
  const margin = { top: 30, right: 30, bottom: 30, left: 30 };
  const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

  const axes = data.axes;
  const angleSlice = (Math.PI * 2) / axes.length;

  for (let r = 0.25; r <= 1.0; r += 0.25) {
    g.append('circle')
      .attr('r', radius * r)
      .attr('fill', 'none')
      .attr('stroke', COLORS.grid)
      .attr('stroke-dasharray', '2 2');
  }

  axes.forEach((axis, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y).attr('stroke', COLORS.grid);
    g.append('text')
      .attr('x', x * 1.08)
      .attr('y', y * 1.08)
      .attr('class', 'label')
      .attr('text-anchor', x >= 0 ? 'start' : 'end')
      .text(axis);
  });

  const radialLine = d3.lineRadial()
    .radius(d => Math.sqrt(d.value) * radius)
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  data.series.forEach(s => {
    g.append('path')
      .datum(s.values)
      .attr('d', radialLine)
      .attr('fill', s.color)
      .attr('fill-opacity', 0.15)
      .attr('stroke', s.color)
      .attr('stroke-width', 2);
  });

  if (label) {
    svg.append('text')
      .attr('x', 12)
      .attr('y', 18)
      .attr('class', 'label')
      .text(label);
  }
}

function renderRadar(oscars) {
  const container = d3.select('#chart-radar');
  container.html('');

  const axes = ['Acting', 'Directing', 'Writing', 'Music', 'Technical', 'Picture/Production', 'Other'];

  function buildPeriodData(start, end) {
    const filtered = oscars.filter(d => d.year_ceremony >= start && d.year_ceremony <= end);
    const byGroup = d3.group(filtered, d => categoryGroup(d.Category));

    const series = RACES.map(race => {
      const values = axes.map(axis => {
        const items = byGroup.get(axis) || [];
        const total = items.length;
        const count = items.filter(d => d.Race === race).length;
        return { axis, value: total ? count / total : 0 };
      });
      return { race, values, color: race === 'White' ? COLORS.white : race === 'Black' ? COLORS.black : race === 'Asian' ? COLORS.asian : COLORS.hispanic };
    });

    return { axes, series };
  }

  const early = buildPeriodData(1928, 1989);
  const recent = buildPeriodData(1990, 2020);

  const row = container.append('div').style('display', 'grid').style('grid-template-columns', 'repeat(auto-fit, minmax(320px, 1fr))').style('gap', '16px');

  radarChart(row.node(), early, { width: 420, height: 360, label: '1928–1989' });
  radarChart(row.node(), recent, { width: 420, height: 360, label: '1990–2020' });

  addLegend('#chart-radar', [
    { label: 'White', color: COLORS.white },
    { label: 'Black', color: COLORS.black },
    { label: 'Asian', color: COLORS.asian },
    { label: 'Hispanic', color: COLORS.hispanic },
  ]);
}

function renderHeatmap(oscars) {
  const container = d3.select('#chart-heatmap');
  container.html('');

  const recent = oscars.filter(d => d.year_ceremony >= 1990 && d.year_ceremony <= 2020);
  const groups = ['Acting', 'Directing', 'Writing', 'Music', 'Technical', 'Picture/Production', 'Other'];
  const races = RACES;

  const counts = {};
  groups.forEach(g => { counts[g] = {}; races.forEach(r => { counts[g][r] = 0; }); counts[g]._total = 0; });

  recent.forEach(d => {
    const g = categoryGroup(d.Category);
    const r = races.includes(d.Race) ? d.Race : null;
    if (!g || !r) return;
    counts[g][r] += 1;
    counts[g]._total += 1;
  });

  const data = [];
  groups.forEach(g => {
    races.forEach(r => {
      const total = counts[g]._total || 1;
      data.push({ group: g, race: r, share: counts[g][r] / total });
    });
  });

  const { g, innerWidth, innerHeight } = createSVG('#chart-heatmap', 320, { top: 20, right: 20, bottom: 60, left: 120 });
  const x = d3.scaleBand().domain(races).range([0, innerWidth]).padding(0.05);
  const y = d3.scaleBand().domain(groups).range([0, innerHeight]).padding(0.05);

  const color = d3.scaleSequential(d3.interpolateYlOrBr).domain([0, d3.max(data, d => d.share) || 0.01]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

  g.selectAll('rect').data(data).enter().append('rect')
    .attr('x', d => x(d.race))
    .attr('y', d => y(d.group))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => color(d.share));
}

function renderStackedRace(oscars) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-stacked-race', 360);
  const years = Array.from(new Set(oscars.map(d => d.year_ceremony))).sort((a, b) => a - b);
  const byYear = d3.rollups(
    oscars,
    v => {
      const total = v.length;
      const out = { year: v[0].year_ceremony };
      RACES.forEach(r => { out[r] = v.filter(d => d.Race === r).length / (total || 1); });
      return out;
    },
    d => d.year_ceremony
  ).map(([year, v]) => ({ year: +year, ...v })).sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

  const stack = d3.stack().keys(RACES);
  const series = stack(byYear);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  g.selectAll('path').data(series).enter().append('path')
    .attr('d', area)
    .attr('fill', d => d.key === 'White' ? COLORS.white : d.key === 'Black' ? COLORS.black : d.key === 'Asian' ? COLORS.asian : COLORS.hispanic)
    .attr('opacity', 0.7);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickFormat(d3.format('.0%')));

  addLegend('#chart-stacked-race', [
    { label: 'White', color: COLORS.white },
    { label: 'Black', color: COLORS.black },
    { label: 'Asian', color: COLORS.asian },
    { label: 'Hispanic', color: COLORS.hispanic },
  ]);
}

function renderRaceGenderMatrix(oscars) {
  const container = d3.select('#chart-matrix');
  container.html('');

  const controls = container.append('div').style('margin', '4px 0 10px 0').style('display', 'flex').style('gap', '8px');
  const btnPre = controls.append('button').text('Pre‑2015').attr('class', 'toggle-btn active');
  const btnPost = controls.append('button').text('Post‑2015').attr('class', 'toggle-btn');
  const chartWrap = container.append('div').node();

  const genders = ['Male', 'Female'];
  const races = RACES;

  function buildData(start, end) {
    const winners = oscars.filter(d => d.winner === 1 && d.year_ceremony >= start && d.year_ceremony <= end);
    const total = winners.length || 1;
    const data = [];
    races.forEach(race => {
      genders.forEach(gender => {
        const count = winners.filter(d => d.Race === race && d.gender === gender).length;
        data.push({ race, gender, share: count / total });
      });
    });
    return data;
  }

  function draw(start, end) {
    const data = buildData(start, end);
    const { g, innerWidth, innerHeight } = createSVG(chartWrap, 260, { top: 20, right: 20, bottom: 40, left: 90 });
    if (!g) return;

    const x = d3.scaleBand().domain(genders).range([0, innerWidth]).padding(0.1);
    const y = d3.scaleBand().domain(races).range([0, innerHeight]).padding(0.2);
    const barMax = d3.max(data, d => d.share) || 0.01;
    const barScale = d3.scaleLinear().domain([0, barMax]).range([0, x.bandwidth() - 8]);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

    g.selectAll('.cell').data(data).enter().append('rect')
      .attr('x', d => x(d.gender))
      .attr('y', d => y(d.race))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', 'none')
      .attr('stroke', '#e3dccd');

    g.selectAll('.bar').data(data).enter().append('rect')
      .attr('x', d => x(d.gender) + 4)
      .attr('y', d => y(d.race) + y.bandwidth() / 2 - 6)
      .attr('height', 12)
      .attr('width', d => barScale(d.share))
      .attr('fill', '#1b1b1b');

    g.selectAll('.label').data(data).enter().append('text')
      .attr('x', d => x(d.gender) + 4)
      .attr('y', d => y(d.race) + y.bandwidth() / 2 - 10)
      .attr('class', 'label')
      .text(d => d.share > 0 ? d3.format('.1%')(d.share) : '');
  }

  function setActive(btn) {
    btnPre.classed('active', false);
    btnPost.classed('active', false);
    btn.classed('active', true);
  }

  btnPre.on('click', () => { container.selectAll('svg').remove(); setActive(btnPre); draw(1928, 2014); });
  btnPost.on('click', () => { container.selectAll('svg').remove(); setActive(btnPost); draw(2015, 2020); });

  draw(1928, 2014);
}

function renderBulletPlot(oscars) {
  const container = d3.select('#chart-bullet');
  container.html('');

  const races = RACES;
  const genders = ['Male', 'Female'];
  const groups = [];

  const nominees = oscars;
  const winners = oscars.filter(d => d.winner === 1);
  const nomTotal = nominees.length || 1;
  const winTotal = winners.length || 1;

  races.forEach(race => {
    genders.forEach(gender => {
      const nomShare = nominees.filter(d => d.Race === race && d.gender === gender).length / nomTotal;
      const winShare = winners.filter(d => d.Race === race && d.gender === gender).length / winTotal;
      groups.push({ label: `${race} • ${gender}`, nomShare, winShare });
    });
  });

  const { g, innerWidth, innerHeight } = createSVG('#chart-bullet', 320, { top: 20, right: 30, bottom: 30, left: 140 });
  const y = d3.scaleBand().domain(groups.map(d => d.label)).range([0, innerHeight]).padding(0.2);
  const x = d3.scaleLinear().domain([0, d3.max(groups, d => Math.max(d.nomShare, d.winShare)) || 0.05]).nice().range([0, innerWidth]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('.0%')));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

  g.selectAll('.bar').data(groups).enter().append('rect')
    .attr('x', 0)
    .attr('y', d => y(d.label))
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.nomShare))
    .attr('fill', '#d9d2c3');

  g.selectAll('.marker').data(groups).enter().append('line')
    .attr('x1', d => x(d.winShare))
    .attr('x2', d => x(d.winShare))
    .attr('y1', d => y(d.label))
    .attr('y2', d => y(d.label) + y.bandwidth())
    .attr('stroke', COLORS.female)
    .attr('stroke-width', 3);

  addLegend('#chart-bullet', [
    { label: 'Nominee share (benchmark)', color: '#d9d2c3' },
    { label: 'Winner share (marker)', color: COLORS.female },
  ]);
}

function renderAgeChart(ages) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-age', 360);

  const years = ages.map(d => d.award_year);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([d3.min(ages, d => d.age) - 2, d3.max(ages, d => d.age) + 2]).nice().range([innerHeight, 0]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

  g.selectAll('circle').data(ages).enter().append('circle')
    .attr('cx', d => x(d.award_year) + (Math.random() - 0.5) * 3)
    .attr('cy', d => y(d.age))
    .attr('r', 2.2)
    .attr('fill', d => d.gender === 'Female' ? COLORS.female : COLORS.male)
    .attr('opacity', 0.35);

  const roll = 7;
  const byGenderYear = d3.rollups(
    ages,
    v => d3.mean(v, d => d.age),
    d => d.gender,
    d => d.award_year
  );

  const rollingSeries = [];
  byGenderYear.forEach(([gender, yearMap]) => {
    const entries = Array.from(yearMap, ([year, avg]) => ({ year: +year, avg })).sort((a, b) => a.year - b.year);
    for (let i = 0; i < entries.length; i++) {
      const window = entries.slice(Math.max(0, i - roll), Math.min(entries.length, i + roll + 1));
      const avg = d3.mean(window, d => d.avg);
      rollingSeries.push({ gender, year: entries[i].year, avg });
    }
  });

  const seriesByGender = d3.group(rollingSeries, d => d.gender);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.avg));

  seriesByGender.forEach((vals, gender) => {
    const color = gender === 'Female' ? COLORS.female : COLORS.male;
    g.append('path')
      .datum(vals.sort((a, b) => a.year - b.year))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line);
  });

  addLegend('#chart-age', [
    { label: 'Female winners (dots + rolling avg)', color: COLORS.female },
    { label: 'Male winners (dots + rolling avg)', color: COLORS.male },
  ]);
}

function renderAgeMedianMean(ages) {
  const { g, innerWidth, innerHeight } = createSVG('#chart-age-median', 360);
  const roll = 7;

  const byGenderYear = d3.rollups(
    ages,
    v => ({ mean: d3.mean(v, d => d.age), median: d3.median(v, d => d.age) }),
    d => d.gender,
    d => d.award_year
  );

  const rolling = [];
  byGenderYear.forEach(([gender, yearMap]) => {
    const entries = Array.from(yearMap, ([year, stats]) => ({ year: +year, ...stats })).sort((a, b) => a.year - b.year);
    for (let i = 0; i < entries.length; i++) {
      const window = entries.slice(Math.max(0, i - roll), Math.min(entries.length, i + roll + 1));
      rolling.push({
        gender,
        year: entries[i].year,
        mean: d3.mean(window, d => d.mean),
        median: d3.mean(window, d => d.median),
      });
    }
  });

  const x = d3.scaleLinear().domain(d3.extent(rolling, d => d.year)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([d3.min(rolling, d => Math.min(d.mean, d.median)) - 2, d3.max(rolling, d => Math.max(d.mean, d.median)) + 2]).nice().range([innerHeight, 0]);

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

  const byGender = d3.group(rolling, d => d.gender);
  const line = key => d3.line().x(d => x(d.year)).y(d => y(d[key]));

  byGender.forEach((vals, gender) => {
    const color = gender === 'Female' ? COLORS.female : COLORS.male;
    g.append('path').datum(vals).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', line('median'));
    g.append('path').datum(vals).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('d', line('mean'));
  });

  addLegend('#chart-age-median', [
    { label: 'Female median (solid) / mean (dashed)', color: COLORS.female },
    { label: 'Male median (solid) / mean (dashed)', color: COLORS.male },
  ]);
}

function renderBubblePlot(oscars) {
  const container = d3.select('#chart-bubble');
  container.html('');
  d3.select('body').selectAll('.tooltip.bubble-tip').remove();
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip bubble-tip').style('opacity', 0);

  const rows = oscars.map(d => ({
    year: d.year_ceremony,
    group: categoryGroup(d.Category),
    race: d.Race || 'Unknown',
    gender: d.gender || 'Unknown',
    winner: d.winner === 1,
    name: d.name,
    film: d.film,
    category: d.Category,
  })).filter(d => d.year && d.group);

  // Stable jitter per row to avoid flicker on zoom/pan
  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  rows.forEach(d => {
    const seed = hashSeed(`${d.name}|${d.year}|${d.category}|${d.film}`);
    const r1 = (seed % 1000) / 1000;
    const r2 = ((seed * 9301 + 49297) % 233280) / 233280;
    d.jx = (r1 - 0.5);
    d.jy = (r2 - 0.5);
  });

  const groups = Array.from(new Set(rows.map(d => d.group))).sort();
  const years = Array.from(new Set(rows.map(d => d.year))).sort((a, b) => a - b);

  const chart = createSVG('#chart-bubble', 520, { top: 20, right: 20, bottom: 50, left: 140 });
  if (!chart) return;
  const { svg, g, innerWidth, innerHeight } = chart;
  const x0 = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const band = innerHeight / Math.max(groups.length, 1);
  const yIndex0 = d3.scaleLinear().domain([0, groups.length - 1]).range([0, innerHeight]);
  const color = d => d.race === 'White' ? '#2f2f2f' : d.race === 'Black' ? COLORS.black : d.race === 'Asian' ? COLORS.asian : d.race === 'Hispanic' ? COLORS.hispanic : '#888';

  const plotGroup = g.append('g').attr('class', 'plot');
  const xAxisG = plotGroup.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`);
  const yAxisG = plotGroup.append('g').attr('class', 'axis');
  xAxisG.call(d3.axisBottom(x0).tickFormat(d3.format('d')));
  yAxisG.call(d3.axisLeft(yIndex0).tickValues(d3.range(groups.length)).tickFormat(i => groups[i] || ''));

  const defs = svg.append('defs');
  defs.append('clipPath').attr('id', 'bubble-clip')
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', innerHeight);

  const pointsLayer = plotGroup.append('g').attr('class', 'points').attr('clip-path', 'url(#bubble-clip)');
  const jitterY = band * 0.6;
  const jitterX = 12;

  // Precompute symbol path once for performance
  rows.forEach(d => {
    const gender = (d.gender || '').toLowerCase();
    const type = gender === 'female' ? d3.symbolTriangle : d3.symbolCircle;
    const size = d.winner ? 48 : 22;
    d.basePath = d3.symbol().type(type).size(size)();
    d.baseScale = 1;
  });

  const points = pointsLayer.selectAll('path').data(rows).enter().append('path')
    .attr('d', d => d.basePath)
    .attr('fill', d => color(d))
    .attr('stroke', '#7a6d58')
    .attr('opacity', 0.65)
    .style('pointer-events', 'all')
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => {
      tooltip.style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY + 12}px`)
        .html(`<strong>${d.name || 'Unknown'}</strong><br>Year: ${d.year}<br>Category: ${d.category}<br>Group: ${d.group}<br>Race: ${d.race}<br>Gender: ${d.gender}<br>${d.winner ? 'Winner' : 'Nominee'}<br>Film: ${d.film || 'Unknown'}`);
    })
    .on('mousemove', (event, d) => {
      const [px, py] = d3.pointer(event, container.node());
      tooltip.style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY + 12}px`)
        .html(`<strong>${d.name || 'Unknown'}</strong><br>Year: ${d.year}<br>Category: ${d.category}<br>Group: ${d.group}<br>Race: ${d.race}<br>Gender: ${d.gender}<br>${d.winner ? 'Winner' : 'Nominee'}<br>Film: ${d.film || 'Unknown'}`);
    })
    .on('mouseleave', () => tooltip.style('opacity', 0));

  function positionPoints(xz, yz, k) {
    points
      .attr('transform', d => {
        const idx = groups.indexOf(d.group);
        const y = yz(idx) + d.jy * jitterY * k;
        const x = xz(d.year) + d.jx * jitterX * k;
        return `translate(${x},${y}) scale(${k})`;
      });
  }

  function zoomed({ transform }) {
    const xz = transform.rescaleX(x0);
    const yz = transform.rescaleY(yIndex0);
    xAxisG.call(d3.axisBottom(xz).tickFormat(d3.format('d')));
    const [d0, d1] = yz.domain();
    const i0 = Math.max(0, Math.ceil(Math.min(d0, d1)));
    const i1 = Math.min(groups.length - 1, Math.floor(Math.max(d0, d1)));
    const ticks = d3.range(i0, i1 + 1);
    yAxisG.call(d3.axisLeft(yz).tickValues(ticks).tickFormat(i => groups[i] || ''));
    positionPoints(xz, yz, transform.k);
  }

  svg.call(
    d3.zoom()
      .scaleExtent([0.8, 8])
      .on('zoom', zoomed)
  );

  positionPoints(x0, yIndex0, 1);
}

function renderAll(data) {
  renderBubblePlot(data.oscars);
  renderGenderShareLine(data.oscars);
  renderToggleLine(data.oscars);
  renderCategoryGroupBars(data.oscars);
  renderDirectors(data.directors);
  renderDirectorsShare(data.directors);
  renderRadar(data.oscars);
  renderHeatmap(data.oscars);
  renderStackedRace(data.oscars);
  renderRaceGenderMatrix(data.oscars);
  renderBulletPlot(data.oscars);
  renderAgeChart(data.ages);
  renderAgeMedianMean(data.ages);
}

let cachedData = null;

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

loadData().then(data => {
  cachedData = data;
  renderAll(data);
  window.addEventListener('resize', debounce(() => {
    if (cachedData) renderAll(cachedData);
  }, 250));
});
