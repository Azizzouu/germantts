(function(){
  'use strict';

  // ==========================================
  // CORE / UTILITIES
  // ==========================================
  
  // Utility function for status messages
  function setStatusForFeature(featureId, message, isGood = true) {
    const statusEl = document.getElementById(`${featureId}-status`);
    if (statusEl) {
      statusEl.textContent = message || '';
      statusEl.style.color = isGood ? 'var(--success)' : 'var(--error)';
    }
  }

  // ==========================================
  // TTS SECTION
  // ==========================================
  
  (function initTTS() {
    // Check browser support
    const supports = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    
    // DOM elements
    const textEl = document.getElementById('tts-text');
    const voiceSel = document.getElementById('tts-voice');
    const voiceHint = document.getElementById('tts-voiceHint');
    const speakBtn = document.getElementById('tts-speakBtn');
    const pauseBtn = document.getElementById('tts-pauseBtn');
    const resumeBtn = document.getElementById('tts-resumeBtn');
    const stopBtn = document.getElementById('tts-stopBtn');
    const rate = document.getElementById('tts-rate');
    const pitch = document.getElementById('tts-pitch');
    const volume = document.getElementById('tts-volume');
    const rateVal = document.getElementById('tts-rateVal');
    const pitchVal = document.getElementById('tts-pitchVal');
    const volVal = document.getElementById('tts-volVal');
    const statusEl = document.getElementById('tts-status');
    const countEl = document.getElementById('tts-charCount');

    if (!textEl || !voiceSel) return; // Feature not present in DOM

    // Load saved preferences
    if (localStorage.getItem('tts_text')) {
      textEl.value = localStorage.getItem('tts_text');
    }
    
    let selectedVoiceURI = null;
    ['rate', 'pitch', 'volume', 'voiceURI'].forEach(k => {
      const v = localStorage.getItem('tts_' + k);
      if (k === 'voiceURI' && v) selectedVoiceURI = v;
      if (v && k !== 'voiceURI') {
        const el = document.getElementById('tts-' + k);
        if (el) el.value = v;
      }
    });

    // Character count and text saving
    function updateCounts() { 
      if (countEl) countEl.textContent = textEl.value.length.toString(); 
      localStorage.setItem('tts_text', textEl.value); 
    }
    textEl.addEventListener('input', updateCounts); 
    updateCounts();

    // Status display
    function setStatus(msg, good = true) { 
      if (statusEl) {
        statusEl.textContent = msg || ''; 
        statusEl.style.color = good ? 'var(--success)' : 'var(--error)'; 
      }
    }

    // Check browser support
    if (!supports) {
      setStatus('Your browser does not support Speech Synthesis. Try Chrome, Edge, or Safari.', false);
      [speakBtn, pauseBtn, resumeBtn, stopBtn, voiceSel, rate, pitch, volume].forEach(el => {
        if (el) el.disabled = true;
      });
      return;
    }

    // Voice management
    let voices = [];

    function populateVoices() {
      if (!voiceSel) return;
      voiceSel.innerHTML = '';
      voices = window.speechSynthesis.getVoices();
      const german = voices.filter(v => /de(-|_|\b)/i.test(v.lang) || /German/i.test(v.name));
      const list = german.length ? german : voices;
      if (!german.length) {
        if (voiceHint) {
          voiceHint.textContent = 'No German voices detected.';
          const btn = document.createElement('button');
          btn.id = 'tts-installHelp';
          btn.textContent = 'How to install';
          btn.style.marginLeft = '8px';
          btn.style.padding = '4px 8px';
          btn.style.background = 'var(--accent)';
          btn.style.border = 'none';
          btn.style.borderRadius = '6px';
          btn.style.cursor = 'pointer';
          btn.style.color = 'var(--bg)';
          btn.style.fontWeight = '600';
          btn.addEventListener('click', showInstallGuide);
          voiceHint.appendChild(btn);
        }
      } else {
        if (voiceHint) voiceHint.textContent = `Found ${german.length} German voice(s).`;
      }
      list.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} — ${v.lang}${v.default ? ' (default)' : ''}`;
        if (selectedVoiceURI && v.voiceURI === selectedVoiceURI) opt.selected = true;
        voiceSel.appendChild(opt);
      });
      if (!selectedVoiceURI && list[0]) selectedVoiceURI = list[0].voiceURI;
      checkGermanVoices();
    }

    function checkGermanVoices() {
      const germanVoices = voices.filter(v => /de(-|_|\b)/i.test(v.lang));
      if (germanVoices.length === 0 && voiceHint) {
        voiceHint.style.color = 'var(--error)';
      }
    }

    function showInstallGuide() {
      const guide = `
        <div class="modal">
          <div class="modal-content">
            <h3>Install German Voices</h3>
            <p><strong>Chrome/Edge:</strong> Settings → Advanced → Accessibility → Text-to-speech → Manage voices</p>
            <p><strong>Windows:</strong> Settings → Time & Language → Speech → Manage voices</p>
            <p><strong>macOS:</strong> System Preferences → Accessibility → Spoken Content → System Voice</p>
            <p><strong>Android:</strong> Settings → Accessibility → Text-to-speech output</p>
            <button onclick="this.closest('.modal').remove()">Close</button>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', guide);
    }

    // Initialize voices
    populateVoices();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      speechSynthesis.onvoiceschanged = () => { populateVoices(); };
    }

    // Get selected voice
    function getSelectedVoice() {
      const uri = voiceSel.value || selectedVoiceURI;
      return voices.find(v => v.voiceURI === uri) || null;
    }

    // Get the best available German voice
    function getBestGermanVoice() {
      const germanVoices = voices.filter(v => /de(-|_|\b)/i.test(v.lang));
      const exactMatch = germanVoices.find(v => v.lang === 'de-DE' || v.lang === 'de-CH' || v.lang === 'de-AT');
      return exactMatch || germanVoices[0] || voices[0];
    }

    // UI state management
    function updateUI() {
      const speaking = speechSynthesis.speaking;
      const paused = speechSynthesis.paused;
      if (speakBtn) speakBtn.disabled = speaking;
      if (pauseBtn) pauseBtn.disabled = !speaking || paused;
      if (resumeBtn) resumeBtn.disabled = !speaking || !paused;
      if (stopBtn) stopBtn.disabled = !speaking;
    }

    // Speech functions
    function speak() {
      const text = (textEl.value || '').trim();
      if (!text) { 
        setStatus('Please enter some German text first.', false); 
        return; 
      }
      try {
        if (window.speechSynthesis.getVoices().length === 0) {
          setStatus('No local voices available.', false);
          return;
        }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = getSelectedVoice() || getBestGermanVoice();
        if (v) { 
          u.voice = v; 
          u.lang = v.lang || 'de-DE'; 
        } else { 
          u.lang = 'de-DE'; 
        }
        u.rate = parseFloat(rate.value);
        u.pitch = parseFloat(pitch.value);
        u.volume = parseFloat(volume.value);
        u.onstart = () => { setStatus('Speaking…'); updateUI(); };
        u.onend = () => { setStatus('Done.'); updateUI(); };
        u.onerror = (e) => { setStatus('Error: ' + (e.error || 'unknown'), false); updateUI(); };
        u.onpause = () => { setStatus('Paused'); updateUI(); };
        u.onresume = () => { setStatus('Speaking…'); updateUI(); };
        speechSynthesis.speak(u);
        updateUI();
      } catch (error) {
        setStatus(`Error: ${error.message}`, false);
        console.error('TTS Error:', error);
      }
    }

    // Event listeners
    if (speakBtn) speakBtn.addEventListener('click', speak);
    if (pauseBtn) pauseBtn.addEventListener('click', () => { 
      speechSynthesis.pause(); 
      updateUI(); 
    });
    if (resumeBtn) resumeBtn.addEventListener('click', () => { 
      speechSynthesis.resume(); 
      updateUI(); 
    });
    if (stopBtn) stopBtn.addEventListener('click', () => { 
      speechSynthesis.cancel(); 
      setStatus('Stopped.'); 
      updateUI(); 
    });

    // Keyboard shortcut for TTS (Ctrl/⌘ + Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
        // Check if focus is in TTS textarea
        if (document.activeElement === textEl || document.activeElement?.closest('[data-feature="tts"]')) {
          e.preventDefault(); 
          speak(); 
        }
      }
    });

    // Voice selection
    if (voiceSel) {
      voiceSel.addEventListener('change', () => {
        selectedVoiceURI = voiceSel.value; 
        localStorage.setItem('tts_voiceURI', selectedVoiceURI);
      });
    }

    // Settings sliders
    if (rate && pitch && volume) {
      [rate, pitch, volume].forEach(el => {
        const map = {
          'tts-rate': rateVal, 
          'tts-pitch': pitchVal, 
          'tts-volume': volVal
        };
        el.addEventListener('input', () => {
          const valEl = map[el.id];
          if (valEl) valEl.textContent = parseFloat(el.value).toFixed(1);
          localStorage.setItem('tts_' + el.id.replace('tts-', ''), el.value);
        });
        const valEl = map[el.id];
        if (valEl) valEl.textContent = parseFloat(el.value).toFixed(1);
      });
    }

    // Initial UI state
    updateUI();
  })();

  // ==========================================
  // ARTIKEL SECTION
  // ==========================================
  
  (function initArtikel() {
    // DOM elements
    const nounInput = document.getElementById('artikel-noun');
    const resultEl = document.getElementById('artikel-result');

    if (!nounInput || !resultEl) return; // Feature not present in DOM

    // Dictionary of common German nouns with their articles
    const nounDictionary = {
      // Masculine (der)
      'der': new Set([
        'mann', 'tisch', 'stuhl', 'baum', 'hund', 'tag', 'berg', 'fluss', 'weg', 'zug',
        'computer', 'fernseher', 'kühlschrank', 'stift', 'buch', 'koffer', 'schuh',
        'automat', 'apfel', 'ball', 'bruder', 'vater', 'sohn', 'kopf', 'fuß', 'arm',
        'augen', 'mund', 'zahn', 'bart', 'hut', 'mantel', 'schrank', 'turm', 'wald',
        'park', 'platz', 'bahnhof', 'flughafen', 'hafen', 'bürger', 'könig', 'kaiser'
      ]),
      // Feminine (die)
      'die': new Set([
        'frau', 'tür', 'wand', 'straße', 'stadt', 'zeit', 'welt', 'nacht', 'sonne',
        'blume', 'hand', 'katze', 'maus', 'milch', 'woche', 'uhr', 'tasche', 'zeitung',
        'schule', 'universität', 'mutter', 'tochter', 'schwester', 'nase', 'zunge',
        'brille', 'jacke', 'schuhe', 'flasche', 'tasse', 'lampe', 'straße', 'bahn',
        'maschine', 'fabrik', 'bank', 'kirche', 'schule', 'bibliothek', 'musik',
        'kamera', 'karte', 'post', 'pizza', 'frage', 'antwort', 'sprache'
      ]),
      // Neuter (das)
      'das': new Set([
        'haus', 'auto', 'kind', 'buch', 'wasser', 'bier', 'essen', 'brot', 'glas',
        'fenster', 'bild', 'rad', 'flugzeug', 'schiff', 'tier', 'pferd', 'schwein',
        'huhn', 'ei', 'messer', 'bett', 'sofa', 'telefon', 'radio', 'telefon',
        'computer', 'handy', 'tablet', 'spiel', 'video', 'foto', 'jahr', 'monat',
        'jahrhundert', 'jahrzehnt', 'maß', 'ziel', 'problem', 'thema', 'klima',
        'system', 'projekt', 'werk', 'museum', 'kino', 'theater', 'hotel'
      ])
    };

    // Pattern-based rules for article determination
    function determineArticleByPattern(word) {
      const lower = word.toLowerCase();
      
      // Neuter (das) patterns
      if (lower.endsWith('chen') || lower.endsWith('lein')) return 'das';
      if (lower.endsWith('tum') || lower.endsWith('um')) return 'das';
      if (lower.endsWith('ment')) return 'das';
      
      // Feminine (die) patterns
      if (lower.endsWith('ung')) return 'die';
      if (lower.endsWith('heit') || lower.endsWith('keit')) return 'die';
      if (lower.endsWith('schaft')) return 'die';
      if (lower.endsWith('ion')) return 'die';
      if (lower.endsWith('tät')) return 'die';
      if (lower.endsWith('ik')) return 'die';
      if (lower.endsWith('ur')) return 'die';
      
      // Masculine (der) patterns
      if (lower.endsWith('er') && lower.length > 3 && !lower.endsWith('ier')) return 'der';
      if (lower.endsWith('ling')) return 'der';
      if (lower.endsWith('ismus')) return 'der';
      if (lower.endsWith('or') && lower.length > 3) return 'der';
      if (lower.endsWith('eur')) return 'der';
      
      return null;
    }

    // Main function to determine article
    function determineArticle(word) {
      if (!word || word.trim().length === 0) {
        return null;
      }

      const normalized = word.trim().toLowerCase();
      
      // Remove common plural endings and capitalize first letter for dictionary lookup
      let lookupWord = normalized;
      if (lookupWord.endsWith('e') && lookupWord.length > 2) {
        lookupWord = lookupWord.slice(0, -1);
      }
      
      // Check dictionary first
      for (const [article, nouns] of Object.entries(nounDictionary)) {
        if (nouns.has(normalized) || nouns.has(lookupWord)) {
          return article;
        }
      }
      
      // If not in dictionary, use pattern matching
      const patternResult = determineArticleByPattern(normalized);
      if (patternResult) {
        return patternResult;
      }
      
      // Default fallback (most common is 'der' but we'll say unknown)
      return null;
    }

    // Display result
    function displayResult(noun, article) {
      if (!noun || noun.trim().length === 0) {
        resultEl.textContent = '';
        resultEl.style.color = '';
        return;
      }

      if (article) {
        const capitalized = noun.charAt(0).toUpperCase() + noun.slice(1);
        resultEl.textContent = `${article} ${capitalized}`;
        resultEl.style.color = 'var(--success)';
        resultEl.style.fontSize = '16px';
        resultEl.style.fontWeight = '600';
      } else {
        resultEl.textContent = `Unable to determine article for "${noun}". Try checking a dictionary.`;
        resultEl.style.color = 'var(--muted)';
        resultEl.style.fontSize = '14px';
        resultEl.style.fontWeight = '400';
      }
    }

    // Event listener for input
    nounInput.addEventListener('input', (e) => {
      const noun = e.target.value.trim();
      const article = determineArticle(noun);
      displayResult(noun, article);
    });

    // Also handle Enter key
    nounInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const noun = e.target.value.trim();
        const article = determineArticle(noun);
        displayResult(noun, article);
      }
    });
  })();

})();
