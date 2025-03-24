// GlacierMassBalanceVisualization.js
const { useState, useEffect } = React;
const { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Area 
} = Recharts;

const GlacierMassBalanceVisualization = () => {
  const [cumulativeData, setCumulativeData] = useState([]);
  const [currentYearData, setCurrentYearData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('de'); // 'de' for German, 'en' for English
  const [animationStep, setAnimationStep] = useState(0);
  const [lastUpdateDate, setLastUpdateDate] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  
  // Translations
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
      stdDev: 'Standardabweichung'
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
      stdDev: 'Standard deviation'
    }
  };

  // Function to fetch and process data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch historical data (2010-2024)
        const historicalResponse = await fetch('https://doi.glamos.ch/figures/massbalance_current/mb-cum-cycle_2010-2024.txt');
        const historicalText = await historicalResponse.text();
        
        // Process historical data
        const historicalRows = historicalText.trim().split('\n');
        const headers = historicalRows[0].split('\t');
        
        // Create data structure for cumulative data
        const processedHistoricalData = [];
        
        for (let i = 1; i < historicalRows.length; i++) {
          const values = historicalRows[i].split('\t');
          const dataPoint = { date: values[0] };
          
          // Add each year's data
          for (let j = 1; j < values.length; j++) {
            dataPoint[headers[j]] = parseFloat(values[j]);
          }
          
          processedHistoricalData.push(dataPoint);
        }
        
        // Find the last update date
        if (processedHistoricalData.length > 0) {
          setLastUpdateDate(processedHistoricalData[processedHistoricalData.length - 1].date);
        }
        
        setCumulativeData(processedHistoricalData);
        
        // Fetch current year data (2025)
        const currentYearResponse = await fetch('https://doi.glamos.ch/figures/massbalance_current/mb-course-avg_2025.txt');
        const currentYearText = await currentYearResponse.text();
        
        // Process current year data
        const currentYearRows = currentYearText.trim().split('\n');
        
        const processedCurrentYearData = [];
        
        for (let i = 1; i < currentYearRows.length; i++) {
          const values = currentYearRows[i].split('\t');
          const dataPoint = { 
            date: values[0],
            currentValue: parseFloat(values[1]),
            average: parseFloat(values[2]),
            stdDevLower: parseFloat(values[3]),
            stdDevUpper: parseFloat(values[4])
          };
          
          processedCurrentYearData.push(dataPoint);
        }
        
        setCurrentYearData(processedCurrentYearData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up animation
    const animationInterval = setInterval(() => {
      setAnimationStep(prev => {
        const nextStep = prev + 1;
        if (!showDetailView && nextStep >= 16) { // 15 years + 1 for transition
          setShowDetailView(true);
          return 0;
        } else if (showDetailView && nextStep >= 5) { // Show detail view for 5 seconds
          setShowDetailView(false);
          return 0;
        }
        return nextStep;
      });
    }, 1000); // Advance every second
    
    return () => clearInterval(animationInterval);
  }, [showDetailView]);

  // Switch language
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'de' ? 'en' : 'de');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  // Determine visible years based on animation step
  const visibleYears = showDetailView 
    ? [] 
    : Array.from({ length: Math.min(animationStep, 15) }, (_, i) => `${2010 + i}`);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
      <button 
        onClick={toggleLanguage}
        className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
      >
        {language === 'de' ? 'EN' : 'DE'}
      </button>
      
      <h1 className="text-2xl md:text-3xl mb-4 text-center animate-fadeIn">
        {showDetailView 
          ? translations[language].titleDetail
          : translations[language].title + ' (2010-2024)'}
      </h1>
      
      <div className="w-full h-3/4 animate-fadeIn">
        <ResponsiveContainer width="100%" height="100%">
          {showDetailView ? (
            // Detail view for current year
            <LineChart
              data={currentYearData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis 
                dataKey="date" 
                stroke="#fff"
                label={{ value: translations[language].xAxisDetail, position: 'insideBottom', offset: -10, fill: '#fff' }}
              />
              <YAxis 
                stroke="#fff"
                label={{ value: translations[language].yAxis, angle: -90, position: 'insideLeft', fill: '#fff' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`${value.toFixed(2)} m w.e.`, '']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="stdDevUpper"
                stroke="none"
                fill="#555"
                fillOpacity={0.3}
                activeDot={false}
                name={translations[language].stdDev}
              />
              <Area 
                type="monotone" 
                dataKey="stdDevLower"
                stroke="none"
                fill="#555"
                fillOpacity={0}
                activeDot={false}
                name=""
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#3182ce" 
                dot={false}
                strokeWidth={2}
                name={translations[language].average}
              />
              <Line 
                type="monotone" 
                dataKey="currentValue" 
                stroke="#e53e3e" 
                dot={{ r: 4 }}
                strokeWidth={3}
                name={translations[language].currentValue}
              />
            </LineChart>
          ) : (
            // Cumulative view for all years
            <LineChart
              data={cumulativeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis 
                dataKey="date" 
                stroke="#fff"
                label={{ value: translations[language].xAxisCumulative, position: 'insideBottom', offset: -10, fill: '#fff' }}
              />
              <YAxis 
                stroke="#fff"
                label={{ value: translations[language].yAxis, angle: -90, position: 'insideLeft', fill: '#fff' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`${value.toFixed(2)} m w.e.`, '']}
              />
              <ReferenceLine y={0} stroke="#fff" strokeDasharray="3 3" />
              {visibleYears.map((year, index) => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={year}
                  stroke={index === visibleYears.length - 1 ? '#e53e3e' : '#3182ce'}
                  strokeWidth={index === visibleYears.length - 1 ? 3 : 1.5}
                  dot={index === visibleYears.length - 1 ? { r: 4 } : false}
                  name={year}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {lastUpdateDate && (
        <div className="mt-4 text-gray-400 animate-fadeIn">
          {translations[language].lastUpdate} {lastUpdateDate}
        </div>
      )}
    </div>
  );
};