// glacier-visualization.js - Visualisierung ohne React/Babel

// Konfiguration
const config = {
    cumulativeDataUrl: 'https://doi.glamos.ch/figures/massbalance_current/mb-cum-cycle_2010-2024.txt',
    currentYearDataUrl: 'https://doi.glamos.ch/figures/massbalance_current/mb-course-avg_2025.txt',
    animationDuration: 1000, // Millisekunden pro Jahr
    detailViewDuration: 5000, // Millisekunden für Detailansicht
    colors: {
      current: '#e53e3e',  // Rot
      historical: '#3182ce', // Blau
      grid: '#555',
      background: '#000',
      text: '#fff',
      stdDev: '#555'
    }
  };
  
  // Übersetzungen
  const translations = {
    de: {
      title: 'Kumulative Massenbilanz gemittelt über 12 gemessene Gletscher in der Schweizer Alpen',
      titleDetail: 'Realtime Massenbilanz gemittelt über 12 gemessene Gletscher in der Schweizer Alpen 2025',
      yAxis: 'Kumulative Massenbilanz (m w.e.)',
      xAxisCumulative: 'Hydrologisches Jahr',
      xAxisDetail: 'Monat',
      lastUpdate: 'Letztes Update:',
      currentValue: 'Aktueller Wert',
      average: 'Durchschnitt',
      stdDev: 'Standardabweichung',
      loading: 'Daten werden geladen...'
    },
    en: {
      title: 'Cumulative Mass Balance averaged over 12 measured glaciers in the Swiss Alps',
      titleDetail: 'Real-time Mass Balance averaged over 12 measured glaciers in the Swiss Alps 2025',
      yAxis: 'Cumulative Mass Balance (m w.e.)',
      xAxisCumulative: 'Hydrological Year',
      xAxisDetail: 'Month',
      lastUpdate: 'Last update:',
      currentValue: 'Current value',
      average: 'Average',
      stdDev: 'Standard deviation',
      loading: 'Loading data...'
    }
  };
  
  // Globale Variablen
  let cumulativeData = [];
  let currentYearData = [];
  let language = 'de';
  let showDetailView = false;
  let animationStep = 0;
  let lastUpdateDate = null;
  let animationInterval = null;
  
  // DOM-Elemente
  const titleElement = document.getElementById('title');
  const chartContainer = document.getElementById('chart-container');
  const updateInfoElement = document.getElementById('update-info');
  const languageToggle = document.getElementById('language-toggle');
  
  // Hauptfunktion
  async function initialize() {
    // Event-Listener für Sprachumschaltung
    languageToggle.addEventListener('click', toggleLanguage);
    
    // Zeige Ladezustand an
    updateInfoElement.textContent = translations[language].loading;
    
    try {
      // Daten laden
      await fetchData();
      
      // Starte Animation
      startAnimation();
      
      // Vollbildmodus-Erkennung
      setupFullscreenMode();
      
      // Verhindere Bildschirmschoner
      preventScreensaver();
      
    } catch (error) {
      console.error('Fehler beim Initialisieren:', error);
      updateInfoElement.textContent = 'Fehler beim Laden der Daten. Versuche es erneut...';
      
      // Automatischer Neustart bei Fehler nach 30 Sekunden
      setTimeout(() => {
        window.location.reload();
      }, 30 * 1000);
    }
  }
  
  // Daten laden
  async function fetchData() {
    try {
      // Historische Daten laden
      const historicalResponse = await fetch(config.cumulativeDataUrl);
      const historicalText = await historicalResponse.text();
      
      // Historische Daten verarbeiten
      const historicalRows = historicalText.trim().split('\n');
      const headers = historicalRows[0].split('\t');
      
      cumulativeData = [];
      
      for (let i = 1; i < historicalRows.length; i++) {
        const values = historicalRows[i].split('\t');
        const dataPoint = { date: values[0] };
        
        for (let j = 1; j < values.length; j++) {
          dataPoint[headers[j]] = parseFloat(values[j]);
        }
        
        cumulativeData.push(dataPoint);
      }
      
      // Letztes Update-Datum ermitteln
      if (cumulativeData.length > 0) {
        lastUpdateDate = cumulativeData[cumulativeData.length - 1].date;
        updateInfoElement.textContent = `${translations[language].lastUpdate} ${lastUpdateDate}`;
      }
      
      // Aktuelle Jahresdaten laden
      const currentYearResponse = await fetch(config.currentYearDataUrl);
      const currentYearText = await currentYearResponse.text();
      
      // Aktuelle Jahresdaten verarbeiten
      const currentYearRows = currentYearText.trim().split('\n');
      
      currentYearData = [];
      
      for (let i = 1; i < currentYearRows.length; i++) {
        const values = currentYearRows[i].split('\t');
        const dataPoint = { 
          date: values[0],
          currentValue: parseFloat(values[1]),
          average: parseFloat(values[2]),
          stdDevLower: parseFloat(values[3]),
          stdDevUpper: parseFloat(values[4])
        };
        
        currentYearData.push(dataPoint);
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      throw new Error('Daten konnten nicht geladen werden');
    }
  }
  
  // Animation starten
  function startAnimation() {
    // Falls bereits eine Animation läuft, diese stoppen
    if (animationInterval) {
      clearInterval(animationInterval);
    }
    
    // Animation-Interval starten
    animationInterval = setInterval(() => {
      animationStep++;
      
      if (!showDetailView && animationStep >= 16) { // 15 Jahre + 1 für Übergang
        showDetailView = true;
        animationStep = 0;
        updateTitle();
      } else if (showDetailView && animationStep >= 5) { // 5 Sekunden Detailansicht
        showDetailView = false;
        animationStep = 0;
        updateTitle();
      }
      
      renderChart();
    }, 1000);
    
    // Initial rendern
    updateTitle();
    renderChart();
  }
  
  // Titel aktualisieren
  function updateTitle() {
    if (showDetailView) {
      titleElement.textContent = translations[language].titleDetail;
    } else {
      titleElement.textContent = `${translations[language].title} (2010-2024)`;
    }
  }
  
  // Chart rendern mit D3.js
  function renderChart() {
    // Container leeren
    chartContainer.innerHTML = '';
    
    // Dimensionen ermitteln
    const width = chartContainer.clientWidth;
    const height = chartContainer.clientHeight;
    const margin = { top: 40, right: 70, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // SVG erstellen
    const svg = d3.select(chartContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Gruppe mit Margin erstellen
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    if (showDetailView) {
      renderDetailView(g, innerWidth, innerHeight);
    } else {
      renderCumulativeView(g, innerWidth, innerHeight);
    }
  }
  
  // Kumulative Ansicht rendern
  function renderCumulativeView(g, width, height) {
    // Sichtbare Jahre basierend auf Animation bestimmen
    const visibleYears = Array.from(
      { length: Math.min(animationStep, 15) }, 
      (_, i) => `${2010 + i}`
    );
    
    if (visibleYears.length === 0) return;
    
    // X-Achse
    const xScale = d3.scalePoint()
      .domain(cumulativeData.map(d => d.date))
      .range([0, width]);
    
    // Y-Achse
    const yValues = cumulativeData.flatMap(d => 
      visibleYears.map(year => d[year]).filter(v => v !== undefined)
    );
    
    const yMin = Math.min(0, ...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([height, 0]);
    
    // Gitter
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', config.colors.grid)
      .attr('stroke-dasharray', '3,3');
    
    // Nulllinie
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', config.colors.text)
      .attr('stroke-dasharray', '3,3');
    
    // X-Achse zeichnen
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .attr('color', config.colors.text);
    
    // X-Achsen-Beschriftung
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', config.colors.text)
      .text(translations[language].xAxisCumulative);
    
    // Y-Achse zeichnen
    g.append('g')
      .call(d3.axisLeft(yScale))
      .attr('color', config.colors.text);
    
    // Y-Achsen-Beschriftung
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', config.colors.text)
      .text(translations[language].yAxis);
    
    // Linien für jedes Jahr zeichnen
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    visibleYears.forEach((year, index) => {
      const yearData = cumulativeData
        .map(d => ({ date: d.date, value: d[year] }))
        .filter(d => d.value !== undefined);
      
      const isLatestYear = index === visibleYears.length - 1;
      
      g.append('path')
        .datum(yearData)
        .attr('fill', 'none')
        .attr('stroke', isLatestYear ? config.colors.current : config.colors.historical)
        .attr('stroke-width', isLatestYear ? 3 : 1.5)
        .attr('d', line);
      
      // Punkte für das letzte Jahr
      if (isLatestYear) {
        g.selectAll('.dot')
          .data(yearData)
          .enter()
          .append('circle')
          .attr('cx', d => xScale(d.date))
          .attr('cy', d => yScale(d.value))
          .attr('r', 4)
          .attr('fill', config.colors.current);
      }
    });
  }
  
  // Detailansicht rendern
  function renderDetailView(g, width, height) {
    // X-Achse
    const xScale = d3.scalePoint()
      .domain(currentYearData.map(d => d.date))
      .range([0, width]);
    
    // Y-Achse
    const allValues = currentYearData.flatMap(d => [
      d.currentValue, d.average, d.stdDevLower, d.stdDevUpper
    ]);
    
    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    const yPadding = (yMax - yMin) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([height, 0]);
    
    // Gitter
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', config.colors.grid)
      .attr('stroke-dasharray', '3,3');
    
    // X-Achse zeichnen
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .attr('color', config.colors.text);
    
    // X-Achsen-Beschriftung
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', config.colors.text)
      .text(translations[language].xAxisDetail);
    
    // Y-Achse zeichnen
    g.append('g')
      .call(d3.axisLeft(yScale))
      .attr('color', config.colors.text);
    
    // Y-Achsen-Beschriftung
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', config.colors.text)
      .text(translations[language].yAxis);
    
    // Standardabweichungsbereich
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.stdDevLower))
      .y1(d => yScale(d.stdDevUpper))
      .curve(d3.curveMonotoneX);
    
    g.append('path')
      .datum(currentYearData)
      .attr('fill', config.colors.stdDev)
      .attr('fill-opacity', 0.3)
      .attr('d', area);
    
    // Durchschnittslinie
    const avgLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.average))
      .curve(d3.curveMonotoneX);
    
    g.append('path')
      .datum(currentYearData)
      .attr('fill', 'none')
      .attr('stroke', config.colors.historical)
      .attr('stroke-width', 2)
      .attr('d', avgLine);
    
    // Aktuelle Werte Linie
    const currentLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.currentValue))
      .curve(d3.curveMonotoneX);
    
    g.append('path')
      .datum(currentYearData)
      .attr('fill', 'none')
      .attr('stroke', config.colors.current)
      .attr('stroke-width', 3)
      .attr('d', currentLine);
    
    // Punkte für aktuelle Werte
    g.selectAll('.dot')
      .data(currentYearData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.currentValue))
      .attr('r', 4)
      .attr('fill', config.colors.current);
    
    // Legende
    const legendItems = [
      { label: translations[language].currentValue, color: config.colors.current },
      { label: translations[language].average, color: config.colors.historical },
      { label: translations[language].stdDev, color: config.colors.stdDev }
    ];
    
    const legend = g.append('g')
      .attr('transform', `translate(${width - 200}, 20)`);
    
    legendItems.forEach((item, i) => {
      const lg = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      lg.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('fill-opacity', item.color === config.colors.stdDev ? 0.3 : 1);
      
      lg.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('fill', config.colors.text)
        .text(item.label);
    });
  }
  
  // Sprache umschalten
  function toggleLanguage() {
    language = language === 'de' ? 'en' : 'de';
    languageToggle.textContent = language === 'de' ? 'EN' : 'DE';
    
    updateTitle();
    updateInfoElement.textContent = `${translations[language].lastUpdate} ${lastUpdateDate}`;
    renderChart();
  }
  
  // Vollbildmodus
  function setupFullscreenMode() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'f' || e.key === 'F') {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
          document.documentElement.msRequestFullscreen();
        }
      }
    });
  }
  
  // Bildschirmschoner verhindern
  function preventScreensaver() {
    setInterval(() => {
      const event = new MouseEvent('mousemove', {
        'view': window,
        'bubbles': true,
        'cancelable': true,
        'clientX': Math.random() * window.innerWidth,
        'clientY': Math.random() * window.innerHeight
      });
      document.dispatchEvent(event);
    }, 60 * 1000);
  }
  
  // Fehlerbehandlung
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Unerwarteter Fehler:', message, error);
    
    if (message.includes('fetch') || message.includes('network')) {
      setTimeout(() => {
        window.location.reload();
      }, 30 * 1000);
    }
    
    return true;
  };
  
  // Automatischer Neustart alle 24 Stunden
  setTimeout(() => {
    window.location.reload();
  }, 24 * 60 * 60 * 1000);
  
  // Initialisierung starten
  document.addEventListener('DOMContentLoaded', initialize);