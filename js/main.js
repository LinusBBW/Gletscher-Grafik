// main.js - Hauptanwendungsdatei
// Rendert die GlacierMassBalanceVisualization-Komponente im root-Element

document.addEventListener('DOMContentLoaded', function() {
    // Vollbildmodus für Ausstellungsmodus aktivieren (optional)
    function activateFullscreen() {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }
    
    // Automatischer Neustart bei Inaktivität (für Ausstellungen)
    let inactivityTimer;
    
    function resetInactivityTimer() {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        window.location.reload();
      }, 30 * 60 * 1000); // 30 Minuten Inaktivität
    }
    
    // Event-Listener für Benutzerinteraktionen
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    
    // Initial Timer starten
    resetInactivityTimer();
    
    // Verhindere Screensaver/Bildschirmschoner
    function preventScreensaver() {
      // Bewege den Mauszeiger minimal alle 60 Sekunden
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          'view': window,
          'bubbles': true,
          'cancelable': true,
          'clientX': Math.random() * window.innerWidth,
          'clientY': Math.random() * window.innerHeight
        });
        document.dispatchEvent(event);
        preventScreensaver();
      }, 60 * 1000);
    }
    
    // Ausstellungsmodus mit Tastendruck aktivieren (optional)
    document.addEventListener('keydown', function(e) {
      // Aktiviere Vollbildmodus mit 'F'-Taste
      if (e.key === 'f' || e.key === 'F') {
        activateFullscreen();
        preventScreensaver();
      }
    });
    
    // Fehlerbehandlung für unerwartete Fehler
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Unerwarteter Fehler:', message, error);
      
      // Automatischer Neustart bei kritischen Fehlern
      if (message.includes('fetch') || message.includes('network')) {
        setTimeout(() => {
          window.location.reload();
        }, 30 * 1000); // Nach 30 Sekunden neu laden
      }
      
      return true;
    };
    
    // Automatischer Neustart alle 24 Stunden
    setTimeout(() => {
      window.location.reload();
    }, 24 * 60 * 60 * 1000);
    
    // Rendere die Hauptkomponente
    ReactDOM.render(
      <GlacierMassBalanceVisualization />,
      document.getElementById('root')
    );
  });