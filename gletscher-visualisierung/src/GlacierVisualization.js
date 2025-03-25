import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area
} from 'recharts';

/**
 * 1) Parsen der kumulativen Datei (mb-cum-cycle_2010-2024.txt)
 *    Tageswerte → Monatlich aggregiert (letzter Wert pro Monat)
 */
function parseCumulativeMonthly(text) {
  const lines = text.trim().split('\n').filter(line => line.trim() !== '');
  // Header entfernen, falls vorhanden
  if (lines[0].includes('Year')) {
    lines.shift();
  }

  const monthMap = {};

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const value = parseFloat(parts[3]);

    // Nur Daten von 2010–2024
    if (year < 2010 || year > 2024) continue;

    // "year-month" als Schlüssel
    const key = `${year}-${String(month).padStart(2, '0')}`;

    // Speichere pro (year,month) den letzten Wert (höchstes day)
    if (!monthMap[key]) {
      monthMap[key] = { year, month, day, value };
    } else {
      if (day > monthMap[key].day) {
        monthMap[key].day = day;
        monthMap[key].value = value;
      }
    }
  }

  // In Array umwandeln und nach Jahr,Monat sortieren
  const monthlyData = Object.values(monthMap).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Format: { date: "2010-01", value: -0.619 }
  return monthlyData.map(item => ({
    date: `${item.year}-${String(item.month).padStart(2, '0')}`,
    value: item.value
  }));
}

/**
 * 2) Parsen der Detail-Datei (mb-course-avg_2025.txt)
 *    Wir extrahieren: dayOfYear, thisYear, avg, stdevUpper, stdevLower
 */
function parseDetailData(text) {
  const lines = text.trim().split('\n');
  if (lines[0].includes('Year')) {
    lines.shift();
  }

  const result = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 8) continue;

    // columns: 0=Year,1=Month,2=Day,3=Day_of_Year,4=cumMB,5=ID,6=PeriodAVG,7=PeriodSTDEV
    const dayOfYear = parseInt(parts[3], 10);
    const cumMB = parseFloat(parts[4]);
    const id = parseInt(parts[5], 10);
    const avg = parseFloat(parts[6]);
    const stdev = parseFloat(parts[7]);

    // Nur ID=1 oder 2 => thisYear
    let thisYearVal = null;
    if (id === 1 || id === 2) {
      thisYearVal = cumMB;
    }
    // ±2×Stdev
    const stdevUpper = avg + 2 * stdev;
    const stdevLower = avg - 2 * stdev;

    result.push({
      dayOfYear,
      thisYear: thisYearVal,
      avg,
      stdevUpper,
      stdevLower
    });
  }

  // Sortieren nach dayOfYear
  result.sort((a, b) => a.dayOfYear - b.dayOfYear);
  return result;
}

/**
 * 3) Hauptkomponente, die beide Grafiken in einer Animation abwechselnd zeigt.
 */
const GlacierMassBalanceApp = () => {
  // Daten-States
  const [cumulativeData, setCumulativeData] = useState([]);
  const [detailData, setDetailData] = useState([]);

  // Ladezustand
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Animation-States
  const [animationPhase, setAnimationPhase] = useState('EMPTY'); 
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showDetailView, setShowDetailView] = useState(false);

  // Daten holen
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1) Kumulative Datei
        const resCum = await fetch('https://doi.glamos.ch/figures/massbalance_current/mb-cum-cycle_2010-2024.txt');
        if (!resCum.ok) {
          throw new Error(`Fehler: ${resCum.status}`);
        }
        const textCum = await resCum.text();
        const parsedCum = parseCumulativeMonthly(textCum);

        // 2) Detail-Datei
        const resDetail = await fetch('https://doi.glamos.ch/figures/massbalance_current/mb-course-avg_2025.txt');
        if (!resDetail.ok) {
          throw new Error(`Fehler: ${resDetail.status}`);
        }
        const textDetail = await resDetail.text();
        const parsedDetail = parseDetailData(textDetail);

        setCumulativeData(parsedCum);
        setDetailData(parsedDetail);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Animation
  useEffect(() => {
    // Nur starten, wenn Daten geladen + kein Fehler
    if (loading || error) return;
    if (!cumulativeData.length || !detailData.length) return;

    let cancelled = false;

    const runAnimation = async () => {
      if (cancelled) return;

      // 1) EMPTY
      setAnimationPhase('EMPTY');
      setAnimationProgress(0);
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (cancelled) return;

      // 2) BUILDING
      setAnimationPhase('BUILDING');
      const maxSteps = showDetailView ? detailData.length : cumulativeData.length;

      // Schrittweises Einblenden
      for (let step = 1; step <= maxSteps; step++) {
        if (cancelled) return;
        setAnimationProgress(step);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (cancelled) return;

      // 3) COMPLETE
      setAnimationPhase('COMPLETE');
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (cancelled) return;

      // 4) TRANSITIONING
      setAnimationPhase('TRANSITIONING');
      await new Promise(resolve => setTimeout(resolve, 800));
      if (cancelled) return;

      // Ansicht umschalten
      setShowDetailView(prev => !prev);
    };

    runAnimation();

    return () => { cancelled = true; };
  }, [showDetailView, loading, error, cumulativeData, detailData]);

  // getVisibleData: steuert, welche Punkte "sichtbar" sind
  const getVisibleDataCumulative = () => {
    if (animationPhase === 'EMPTY') {
      // Leerer Chart => value=null
      return cumulativeData.map(item => ({ ...item, value: null }));
    } else if (animationPhase === 'BUILDING' || animationPhase === 'COMPLETE') {
      const visible = Math.min(animationProgress, cumulativeData.length);
      return cumulativeData.map((item, index) => {
        if (index < visible) {
          return item;
        } else {
          return { ...item, value: null };
        }
      });
    }
    return cumulativeData;
  };

  const getVisibleDataDetail = () => {
    if (animationPhase === 'EMPTY') {
      return detailData.map(d => ({
        ...d,
        thisYear: null,
        avg: null,
        stdevUpper: null,
        stdevLower: null
      }));
    } else if (animationPhase === 'BUILDING' || animationPhase === 'COMPLETE') {
      const visible = Math.min(animationProgress, detailData.length);
      return detailData.map((item, index) => {
        if (index < visible) {
          return item;
        } else {
          return {
            ...item,
            thisYear: null,
            avg: null,
            stdevUpper: null,
            stdevLower: null
          };
        }
      });
    }
    return detailData;
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(to bottom, #1E3B8A, #1a1a2e)',
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff'
      }}>
        Lade Daten ...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'linear-gradient(to bottom, #1E3B8A, #1a1a2e)',
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'red'
      }}>
        {error}
      </div>
    );
  }

  // Sichtbare Daten (abh. von animationProgress)
  const visibleCumulative = getVisibleDataCumulative();
  const visibleDetail = getVisibleDataDetail();

  // Kleiner Transition-Effekt
  const transitionStyle = (animationPhase === 'TRANSITIONING')
    ? { transform: 'scale(0.9)', opacity: 0.5, transition: 'all 0.8s ease' }
    : { transform: 'scale(1)', opacity: 1, transition: 'all 0.5s ease' };

  // Tooltip-Formatierung
  const formatTooltip = (val, name) => {
    if (val == null) return null;
    return [`${val.toFixed(3)} m w.e.`, name];
  };

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #1E3B8A, #1a1a2e)',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Alpine Silhouette */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '6rem', overflow: 'hidden', zIndex: 0
      }}>
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 120">
          <path d="M0,120 L60,110 L140,90 L200,70 L240,100 L290,80 L340,100 L380,70 L420,90 L500,40 L580,70 L640,50 L700,90 L750,60 L800,80 L850,50 L900,70 L950,90 L1000,60 L1000,120 Z"
            fill="#fff" fillOpacity="0.1" />
          <path d="M0,120 L40,100 L100,80 L160,100 L220,60 L280,80 L350,40 L420,80 L480,60 L540,90 L600,70 L660,95 L720,75 L780,90 L850,70 L900,90 L950,70 L1000,85 L1000,120 Z"
            fill="#fff" fillOpacity="0.15" />
        </svg>
      </div>

      <h1 style={{
        fontSize: '1.5rem', color: '#fff', textAlign: 'center',
        zIndex: 10, marginBottom: '1rem'
      }}>
        {showDetailView
          ? 'Detail: Massenbilanz 2025 vs. Durchschnitt'
          : 'Kumulative Massenbilanz (Monatswerte) 2010–2024'}
      </h1>

      <div style={{
        width: '90%', height: '70%', zIndex: 10,
        ...transitionStyle
      }}>
        <ResponsiveContainer>
          {showDetailView ? (
            // -------------------------------------------
            // Detail-Grafik (2025 + PeriodAVG + ±2σ)
            // -------------------------------------------
            <LineChart data={visibleDetail} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="dayOfYear"
                stroke="#fff"
                tick={{ fill: '#fff' }}
                label={{
                  value: 'Tag des hydrologischen Jahres',
                  position: 'insideBottom', offset: -5, fill: '#fff'
                }}
              />
              <YAxis
                stroke="#fff"
                tick={{ fill: '#fff' }}
                domain={[-2, 2]}
                label={{
                  value: 'Kumulative MB (m w.e.)',
                  angle: -90, position: 'insideLeft', offset: -10, fill: '#fff'
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(30,59,138,0.9)', border: 'none' }}
                labelStyle={{ color: '#fff' }}
                formatter={formatTooltip}
              />
              <ReferenceLine y={0} stroke="#fff" strokeDasharray="3 3" />

              {/* ±2σ-Band */}
              <Area
                type="monotone"
                dataKey="stdevUpper"
                stroke="none"
                fill="gray"
                fillOpacity={0.2}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="stdevLower"
                stroke="none"
                fill="#1a1a2e"
                fillOpacity={1}
                activeDot={false}
                stackId="stddev"
              />
              <Area
                type="monotone"
                dataKey="stdevUpper"
                stroke="none"
                fill="gray"
                fillOpacity={0.2}
                activeDot={false}
                stackId="stddev"
              />

              {/* Linie: Durchschnitt (blau) */}
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#3182ce"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              {/* Linie: Dieses Jahr (rot) */}
              <Line
                type="monotone"
                dataKey="thisYear"
                stroke="#e53e3e"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          ) : (
            // -------------------------------------------
            // Kumulative Grafik (Monatswerte)
            // -------------------------------------------
            <LineChart data={visibleCumulative} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="date"
                stroke="#fff"
                tick={{ fill: '#fff' }}
                label={{
                  value: 'Monat (aggregiert)',
                  position: 'insideBottom', offset: -5, fill: '#fff'
                }}
              />
              <YAxis
                stroke="#fff"
                tick={{ fill: '#fff' }}
                domain={[-20, 1]}
                label={{
                  value: 'Kumulative MB (m w.e.)',
                  angle: -90, position: 'insideLeft', offset: -10, fill: '#fff'
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(30,59,138,0.9)', border: 'none' }}
                labelStyle={{ color: '#fff' }}
                formatter={formatTooltip}
              />
              <ReferenceLine y={0} stroke="#fff" strokeDasharray="3 3" />

              {/* Linie: kumulative MB (Monatswerte) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#36DBFF"
                strokeWidth={4}
                dot={{ r: 5, fill: '#36DBFF', strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GlacierMassBalanceApp;
