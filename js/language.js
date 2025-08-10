// Language management for PirkagiesGr
class LanguageManager {
    constructor() {
        this.currentLanguage = 'el'; // Default to Greek
        this.translations = {
            'el': {
                // Header
                'site-title': 'PirkagiesGr',
                'active-fires': 'Ενεργές Πυρκαγιές',
                'data-fetched': 'Δεδομένα Ενημ.',
                'next-update': 'Δεδομένα ενημερώνονται κάθε 30 λεπτά',
                
                // Beta disclaimer
                'beta-version': '🚧 ΕΚΔΟΣΗ BETA',
                'beta-text': 'Αυτός ο ιστότοπος είναι σε ενεργή ανάπτυξη και μπορεί να εμφανίσει λανθασμένες ή ελλιπείς πληροφορίες πυρκαγιών. Πάντα επαληθεύετε με επίσημες πηγές και τοπικές αρχές για καταστάσεις έκτακτης ανάγκης.',
                
                // Navigation
                'live-map': 'Ζωντανός Χάρτης Πυρκαγιών',
                'last-7-days': 'Πυρκαγιές Τελευταίων 7 Ημερών',
                'about': 'Σχετικά',
                
                // Disclaimer banner
                'disclaimer-banner': '<strong>Μόνο για ενημερωτικούς σκοπούς.</strong> Δεδομένα πυρκαγιών από το NASA FIRMS (ενημερώνονται κάθε 3 ώρες παγκοσμίως). Σε περίπτωση έκτακτης ανάγκης, επικοινωνήστε με τοπικές αρχές (Ελλάδα: 199, ΕΕ: 112).',
                
                // Map controls
                'fire-controls': '🔥 Έλεγχος Πυρκαγιών',
                'detection-confidence': '🎯 Βεβαιότητα Ανίχνευσης:',
                'all-detections': 'Όλες οι Ανιχνεύσεις',
                'good-detections': '🔥🟡 Καλές Ανιχνεύσεις (≥50%)',
                'low-confidence': '⚠️ Χαμηλή Βεβαιότητα (<50%)',
                'time-period': '⏱️ Χρονική Περίοδος:',
                'last-hour': 'Τελευταία Ώρα',
                'last-24-hours': 'Τελευταίες 24 ώρες',
                'last-3-days': 'Τελευταίες 3 ημέρες',
                'last-week': 'Τελευταία εβδομάδα',
                'satellite-data': '🛰️ Δεδομένα MODIS & VIIRS σε πραγματικό χρόνο',
                'satellite-description': 'Συνδυασμένη δορυφορική θερμική ανίχνευση από δορυφόρους NASA Terra, Aqua & Suomi NPP. Διαφορετικά εικονίδια διακρίνουν πηγές δεδομένων και επίπεδα βεβαιότητας.',
                
                // Fire Info Panel
                'fire-information': 'Πληροφορίες Πυρκαγιάς',
                'click-fire-marker': 'Κάντε κλικ σε έναν δείκτη πυρκαγιάς για να δείτε λεπτομέρειες',
                'location': 'Τοποθεσία:',
                'detection-time': 'Ώρα Ανίχνευσης:',
                'confidence-level': 'Επίπεδο Βεβαιότητας:',
                'brightness-temperature': 'Θερμοκρασία Φωτεινότητας:',
                'fire-radiative-power': 'Ακτινοβολούμενη Ισχύς Πυρκαγιάς:',
                'data-source': 'Πηγή Δεδομένων:',
                'satellite': 'Δορυφόρος:',
                'data-version': 'Έκδοση Δεδομένων:',
                'accuracy-information': 'Πληροφορίες Ακρίβειας',
                'greece-time': 'Ώρα Ελλάδας',
                
                // Legend
                'fire-detection-legend': 'Υπόμνημα Ανίχνευσης Πυρκαγιών',
                'modis-fire-detection': 'Ανίχνευση Πυρκαγιάς MODIS (≥50% βεβαιότητα)',
                'viirs-thermal-detection': 'Θερμική Ανίχνευση VIIRS (≥50% βεβαιότητα)',
                'low-confidence-detection': 'Ανίχνευση Χαμηλής Βεβαιότητας (<50%)',
                
                // Historical Tab
                'historical-fire-data': 'Ιστορικά Δεδομένα Πυρκαγιών',
                'historical-disclaimer': '📅 Τα ιστορικά δεδομένα δείχνουν τις τελευταίες 7 ημέρες ανιχνεύσεων πυρκαγιάς από δορυφόρους NASA MODIS.',
                'start-date': 'Ημερομηνία Έναρξης',
                'end-date': 'Ημερομηνία Λήξης',
                'filter': 'Φίλτρο',
                'total-fires': 'Συνολικές Πυρκαγιές',
                'avg-daily': 'Μέσος Ημερήσιος',
                'avg-intensity': 'Μέση Ένταση',
                'detection-time-greece': 'Ώρα Ανίχνευσης (Ελλάδα)',
                'confidence': 'Βεβαιότητα',
                'brightness': 'Φωτεινότητα',
                
                // About Tab
                'about-title': '🔥 PirkagiesGr',
                'about-subtitle': 'Παρακολούθηση δασικών πυρκαγιών σε πραγματικό χρόνο για την Ελλάδα και την Κύπρο χρησιμοποιώντας δορυφορικά δεδομένα της NASA',
                'beta-notice': '🚧 Ειδοποίηση Έκδοσης Beta',
                'beta-notice-text': 'Αυτή η εφαρμογή βρίσκεται αυτή τη στιγμή στη φάση δοκιμών BETA.',
                'features-incomplete': 'Χαρακτηριστικά μπορεί να μην λειτουργούν όπως αναμένεται ή να είναι ελλιπή',
                'data-validation': 'Η ακρίβεια των δεδομένων πυρκαγιάς εξακολουθεί να επικυρώνεται και βελτιώνεται',
                'frequent-changes': 'Η λειτουργικότητα του ιστότοπου υπόκειται σε συχνές αλλαγές',
                'report-issues': 'Αναφέρετε τυχόν προβλήματα ή σφάλματα που αντιμετωπίζετε για βελτίωση',
                'use-discretion': '<strong>Χρησιμοποιήστε με δική σας διακριτικότητα.</strong> Πάντα επαληθεύετε τις πληροφορίες πυρκαγιάς με επίσημες πηγές και τοπικές αρχές.',
                'important-disclaimer': '⚠️ Σημαντική Αποποίηση Ευθυνών',
                'informational-only': '<strong>Αυτή η εφαρμογή είναι μόνο για ενημερωτικούς σκοπούς.</strong>',
                'data-delays': 'Τα δεδομένα ανίχνευσης πυρκαγιάς μπορεί να έχουν καθυστερήσεις ή ανακρίβειες',
                'small-fires': 'Μικρές πυρκαγιές μπορεί να μην ανιχνεύονται από δορυφόρους',
                'weather-affects': 'Οι καιρικές συνθήκες μπορεί να επηρεάσουν την ακρίβεια ανίχνευσης',
                'follow-official': 'Πάντα ακολουθείτε επίσημες εντολές εκκένωσης και οδηγίες ασφαλείας',
                'emergency-contacts': '🚨 Τηλέφωνα Έκτακτης Ανάγκης',
                'greece-fire-service': '<strong>Πυροσβεστική Υπηρεσία Ελλάδας:</strong> 199',
                'european-emergency': '<strong>Ευρωπαϊκή Έκτακτη Ανάγκη:</strong> 112',
                
                // Data Sources & Attribution
                'data-sources-attribution': '🛰️ Πηγές Δεδομένων & Αναφορά',
                'nasa-firms': 'NASA FIRMS',
                'nasa-firms-desc': 'Δεδομένα ανίχνευσης πυρκαγιάς παρέχονται από το Σύστημα Πληροφοριών Πυρκαγιάς για Διαχείριση Πόρων της NASA (FIRMS)',
                'visit-nasa-firms': 'Επισκεφθείτε το NASA FIRMS',
                'satellite-data-title': 'Δορυφορικά Δεδομένα',
                'satellite-data-desc': 'Όργανα MODIS και VIIRS στους δορυφόρους Terra, Aqua, NOAA-20 και NOAA-21',
                'weather-data-title': 'Καιρικά Δεδομένα',
                'weather-data-desc': 'Πληροφορίες καιρού παρέχονται από το OpenWeatherMap API',
                'satellite-imagery-title': 'Δορυφορικές Εικόνες',
                'satellite-imagery-desc': 'Δορυφορικός χάρτης βάσης παρέχεται από την Esri',
                
                // Fire Detection Technology
                'fire-detection-tech': '📊 Τεχνολογία Ανίχνευσης Πυρκαγιάς',
                'confidence-levels': 'Επίπεδα Βεβαιότητας',
                'high-confidence': 'Υψηλή (80-100%)',
                'high-confidence-desc': 'Επιβεβαιωμένες ενεργές πυρκαγιές με ισχυρές θερμικές υπογραφές',
                'medium-confidence': 'Μεσαία (50-79%)',
                'medium-confidence-desc': 'Πιθανές πυρκαγιές που μπορεί να χρειάζονται επαλήθευση από το έδαφος',
                'low-confidence-desc': 'Πιθανές πυρκαγιές, θα μπορούσαν να είναι άλλες πηγές θερμότητας',
                
                // Automatic Data Updates
                'auto-data-updates': '🔄 Αυτόματες Ενημερώσεις Δεδομένων',
                'how-it-works': '<strong>Πώς λειτουργεί:</strong> Αυτός ο ιστότοπος ενημερώνει αυτόματα τα δεδομένα πυρκαγιάς κάθε 30 λεπτά χρησιμοποιώντας GitHub Actions.',
                'github-action-30min': '<strong>Το GitHub Action τρέχει κάθε 30 λεπτά</strong> για να λάβει νέα δεδομένα πυρκαγιάς από το NASA FIRMS',
                'data-processed-auto': '<strong>Τα νέα δεδομένα επεξεργάζονται αυτόματα</strong> και αποθηκεύονται ως αρχεία JSON',
                'website-updates-instant': '<strong>Ο ιστότοπος ενημερώνεται άμεσα</strong> όταν ανανεώνετε τη σελίδα ή την επισκέπτεστε',
                'no-manual-intervention': '<strong>Δεν απαιτείται χειροκίνητη παρέμβαση</strong> - όλα συμβαίνουν αυτόματα',
                'update-note': 'Δεν χρειάζεται να ανανεώνετε χειροκίνητα τη σελίδα. Απλά επαναφορτώστε τον ιστότοπο για να λάβετε τα πιο πρόσφατα δεδομένα πυρκαγιάς που ανακτήθηκαν από το αυτοματοποιημένο μας σύστημα.',
                
                // Technical Information
                'technical-info': '🔧 Τεχνικές Πληροφορίες',
                'nasa-update-freq': '<strong>Συχνότητα Ενημέρωσης Δεδομένων NASA:</strong> Κάθε 3-6 ώρες (ανάλογα με τη διέλευση δορυφόρου)',
                'our-fetch-freq': '<strong>Η Συχνότητά μας Λήψης:</strong> Κάθε 30 λεπτά μέσω GitHub Actions',
                'detection-resolution': '<strong>Ανάλυση Ανίχνευσης:</strong> 375m - 1km ανάλογα με τον αισθητήρα',
                'geographic-coverage': '<strong>Γεωγραφική Κάλυψη:</strong> Ελλάδα και Κύπρος',
                'data-storage': '<strong>Αποθήκευση Δεδομένων:</strong> Στατικά αρχεία JSON που ενημερώνονται αυτόματα',
                
                // Legal
                'legal': '📄 Νομικά',
                'legal-text': 'Αυτή η εφαρμογή παρέχεται "ως έχει" χωρίς εγγύηση οποιουδήποτε είδους. Οι προγραμματιστές δεν είναι υπεύθυνοι για τυχόν αποφάσεις που λαμβάνονται με βάση τις πληροφορίες που παρέχονται.',
                'attribution-text': 'Δεδομένα πυρκαγιάς χάρη του NASA FIRMS. Καιρικά δεδομένα χάρη του OpenWeatherMap. Δορυφορικές εικόνες χάρη της Esri.',
                
                // Cookie consent
                'cookie-consent': '🍪 Συγκατάθεση Cookies',
                'cookie-text': 'Χρησιμοποιούμε το Google Analytics για να κατανοήσουμε πώς αλληλεπιδρούν οι επισκέπτες με τον ιστότοπό μας. Αυτό μας βοηθά να βελτιώσουμε την εμπειρία χρήστη. Μπορείτε να επιλέξετε να αποδεχτείτε ή να απορρίψετε τα cookies analytics.',
                'reject': 'Απόρριψη',
                'accept': 'Αποδοχή',
                
                // Messages
                'loading': 'Φόρτωση...',
                'loading-fire-data': 'Φόρτωση δεδομένων πυρκαγιάς...',
                'loading-historical': 'Φόρτωση ιστορικών δεδομένων πυρκαγιάς...',
                'filtering-historical': 'Φιλτράρισμα ιστορικών δεδομένων...',
                'failed-to-load': 'Απέτυχε η φόρτωση δεδομένων πυρκαγιάς',
                'select-dates': 'Παρακαλώ επιλέξτε ημερομηνίες έναρξης και λήξης',
                'data-7-days-only': 'Ιστορικά δεδομένα διαθέσιμα μόνο για τις τελευταίες 7 ημέρες',
                'fires-found-range': 'Βρέθηκαν φωτιές στο επιλεγμένο εύρος ημερομηνιών',
                'fire-data-refreshed': 'Τα δεδομένα πυρκαγιάς ανανεώθηκαν επιτυχώς!'
            },
            'en': {
                // Header
                'site-title': 'PirkagiesGr',
                'active-fires': 'Active Fires',
                'data-fetched': 'Data Fetched',
                'next-update': 'Data updates every 30 minutes',
                
                // Beta disclaimer
                'beta-version': '🚧 BETA VERSION',
                'beta-text': 'This site is in active development and may show incorrect or incomplete fire information. Always verify with official sources and local authorities for emergency situations.',
                
                // Navigation
                'live-map': 'Live Fire Map',
                'last-7-days': 'Last 7 Days Fires',
                'about': 'About',
                
                // Disclaimer banner
                'disclaimer-banner': '<strong>For informational purposes only.</strong> Fire data provided by NASA FIRMS (updated every 3 hours globally). In case of emergency, contact local authorities (Greece: 199, EU: 112).',
                
                // Map controls
                'fire-controls': '🔥 Fire Controls',
                'detection-confidence': '🎯 Detection Confidence:',
                'all-detections': 'All Detections',
                'good-detections': '🔥🟡 Good Detections (≥50%)',
                'low-confidence': '⚠️ Low Confidence (<50%)',
                'time-period': '⏱️ Time Period:',
                'last-hour': 'Last Hour',
                'last-24-hours': 'Last 24 hours',
                'last-3-days': 'Last 3 days',
                'last-week': 'Last week',
                'satellite-data': '🛰️ MODIS & VIIRS Real-time Data',
                'satellite-description': 'Combined satellite thermal detection from NASA Terra, Aqua & Suomi NPP satellites. Different emojis distinguish data sources and confidence levels.',
                
                // Fire Info Panel
                'fire-information': 'Fire Information',
                'click-fire-marker': 'Click on a fire marker to see details',
                'location': 'Location:',
                'detection-time': 'Detection Time:',
                'confidence-level': 'Confidence Level:',
                'brightness-temperature': 'Brightness Temperature:',
                'fire-radiative-power': 'Fire Radiative Power:',
                'data-source': 'Data Source:',
                'satellite': 'Satellite:',
                'data-version': 'Data Version:',
                'accuracy-information': 'Accuracy Information',
                'greece-time': 'Greece Time',
                
                // Legend
                'fire-detection-legend': 'Fire Detection Legend',
                'modis-fire-detection': 'MODIS Fire Detection (≥50% confidence)',
                'viirs-thermal-detection': 'VIIRS Thermal Detection (≥50% confidence)',
                'low-confidence-detection': 'Low Confidence Detection (<50%)',
                
                // Historical Tab
                'historical-fire-data': 'Historical Fire Data',
                'historical-disclaimer': '📅 Historical data shows the last 7 days of fire detections from NASA MODIS satellites.',
                'start-date': 'Start Date',
                'end-date': 'End Date',
                'filter': 'Filter',
                'total-fires': 'Total Fires',
                'avg-daily': 'Avg Daily',
                'avg-intensity': 'Avg Intensity',
                'detection-time-greece': 'Detection Time (Greece)',
                'confidence': 'Confidence',
                'brightness': 'Brightness',
                
                // About Tab
                'about-title': '🔥 PirkagiesGr',
                'about-subtitle': 'Real-time wildfire monitoring for Greece and Cyprus using NASA satellite data',
                'beta-notice': '🚧 Beta Version Notice',
                'beta-notice-text': 'This application is currently in BETA testing phase.',
                'features-incomplete': 'Features may not work as expected or may be incomplete',
                'data-validation': 'Fire data accuracy is still being validated and improved',
                'frequent-changes': 'Website functionality is subject to frequent changes',
                'report-issues': 'Report any issues or bugs you encounter for improvement',
                'use-discretion': '<strong>Use at your own discretion.</strong> Always verify fire information with official sources and local authorities.',
                'important-disclaimer': '⚠️ Important Disclaimer',
                'informational-only': '<strong>This application is for informational purposes only.</strong>',
                'data-delays': 'Fire detection data may have delays or inaccuracies',
                'small-fires': 'Small fires may not be detected by satellites',
                'weather-affects': 'Weather conditions can affect detection accuracy',
                'follow-official': 'Always follow official evacuation orders and safety guidelines',
                'emergency-contacts': '🚨 Emergency Contacts',
                'greece-fire-service': '<strong>Greece Fire Service:</strong> 199',
                'european-emergency': '<strong>European Emergency:</strong> 112',
                
                // Cookie consent
                'cookie-consent': '🍪 Cookie Consent',
                'cookie-text': 'We use Google Analytics to understand how visitors interact with our website. This helps us improve the user experience. You can choose to accept or reject analytics cookies.',
                'reject': 'Reject',
                'accept': 'Accept',
                
                // Messages
                'loading': 'Loading...',
                'loading-fire-data': 'Loading fire data...',
                'loading-historical': 'Loading historical fire data...',
                'filtering-historical': 'Filtering historical data...',
                'failed-to-load': 'Failed to load fire data',
                'select-dates': 'Please select both start and end dates',
                'data-7-days-only': 'Historical data is only available for the last 7 days',
                'fires-found-range': 'fires found in selected date range',
                'fire-data-refreshed': 'Fire data refreshed successfully!'
            }
        };
        
        this.init();
    }
    
    init() {
        // Get saved language or default to Greek
        const savedLanguage = localStorage.getItem('preferred_language');
        this.currentLanguage = savedLanguage || 'el';
        this.createLanguageSwitcher();
        this.applyLanguage();
    }
    
    createLanguageSwitcher() {
        // Add language switcher to header controls
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const langSwitcher = document.createElement('div');
            langSwitcher.className = 'language-switcher';
            langSwitcher.innerHTML = `
                <button class="lang-btn ${this.currentLanguage === 'el' ? 'active' : ''}" data-lang="el">
                    🇬🇷 ΕΛ
                </button>
                <button class="lang-btn ${this.currentLanguage === 'en' ? 'active' : ''}" data-lang="en">
                    🇬🇧 EN
                </button>
            `;
            
            headerControls.appendChild(langSwitcher);
            
            // Add event listeners
            langSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchLanguage(e.target.dataset.lang);
                });
            });
        }
    }
    
    switchLanguage(lang) {
        if (lang !== this.currentLanguage) {
            this.currentLanguage = lang;
            localStorage.setItem('preferred_language', lang);
            
            // Update button states
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === lang);
            });
            
            this.applyLanguage();
        }
    }
    
    applyLanguage() {
        const translations = this.translations[this.currentLanguage];
        
        // Apply all translations
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            if (translations[key]) {
                if (element.tagName === 'INPUT' && (element.type === 'date' || element.type === 'button')) {
                    element.title = translations[key];
                } else if (element.tagName === 'OPTION') {
                    element.textContent = translations[key];
                } else {
                    element.innerHTML = translations[key];
                }
            }
        });
        
        // Update loading text if loading overlay is active
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay && loadingOverlay.classList.contains('active')) {
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText && loadingText.textContent.includes('Loading')) {
                loadingText.textContent = translations['loading'] || 'Loading...';
            }
        }
        
        // Update document language attribute
        document.documentElement.lang = this.currentLanguage;
        
        // Trigger custom event for other components to update
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLanguage } 
        }));
        
        console.log(`🌍 Language switched to: ${this.currentLanguage === 'el' ? 'Greek' : 'English'}`);
    }
    
    t(key) {
        // Translation helper method
        return this.translations[this.currentLanguage][key] || key;
    }
}

// Export for use in main application
window.LanguageManager = LanguageManager;