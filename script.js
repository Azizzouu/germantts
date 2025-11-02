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

    /**
     * Comprehensive rule-based German noun gender determination
     * Based on linguistic patterns and morphological rules for German nouns
     */
    
    // Normalize word for pattern matching (lowercase, handle ß)
    function normalizeForMatching(word) {
      return word.trim().toLowerCase().replace(/ß/g, 'ss');
    }

    // Extract base form from plural (common patterns)
    function getBaseForm(word) {
      const normalized = normalizeForMatching(word);
      
      // Plural patterns (return base singular form)
      if (normalized.endsWith('innen')) return normalized.slice(0, -5) + 'in';
      if (normalized.endsWith('en') && normalized.length > 3) {
        // Could be plural, but be careful not to strip valid endings
        if (normalized.endsWith('chen') || normalized.endsWith('lein')) return normalized;
        if (normalized.endsWith('tion') || normalized.endsWith('sion')) return normalized;
        // Try without 'en' but validate it's still a valid noun ending
        const withoutEn = normalized.slice(0, -2);
        if (withoutEn.length >= 2) return withoutEn;
      }
      if (normalized.endsWith('er') && normalized.length > 3 && !normalized.endsWith('ier')) {
        // Could be plural of nouns ending in 'el', 'en', etc.
        // But 'er' plural is less common, so be conservative
      }
      if (normalized.endsWith('e') && normalized.length > 2) {
        const withoutE = normalized.slice(0, -1);
        if (withoutE.length >= 2) return withoutE;
      }
      
      return normalized;
    }

    /**
     * Determine article based on comprehensive morphological rules
     * Priority: Specific endings > Semantic patterns > Length-based rules
     */
    function determineArticleByRules(word) {
      const normalized = normalizeForMatching(word);
      const baseForm = getBaseForm(word);
      
      // ==========================================
      // NEUTER (das) RULES - Check first (most specific)
      // ==========================================
      
      // Diminutive endings (100% reliable)
      if (normalized.endsWith('chen') || normalized.endsWith('lein')) {
        return 'das';
      }
      
      // Nouns ending in -tum (nearly 100%)
      if (normalized.endsWith('tum') && normalized.length > 3) {
        return 'das';
      }
      
      // Nouns ending in -um (foreign words, scientific terms)
      if (normalized.endsWith('um') && normalized.length > 3 && !normalized.endsWith('tum')) {
        return 'das';
      }
      
      // Nouns ending in -ment (French/Latin loans)
      if (normalized.endsWith('ment')) {
        return 'das';
      }
      
      // Nouns ending in -nis (usually neuter, but some exceptions exist)
      if (normalized.endsWith('nis')) {
        return 'das';
      }
      
      // Nouns ending in -sal, -sel
      if (normalized.endsWith('sal') || normalized.endsWith('sel')) {
        return 'das';
      }
      
      // Infinitives used as nouns (das Laufen, das Lesen)
      // Note: This is context-dependent, but if word ends with -en and is capitalized, often das
      if (normalized.endsWith('en') && normalized.length > 4 && 
          !normalized.endsWith('chen') && !normalized.endsWith('tion')) {
        // Could be infinitive, but check other patterns first
      }
      
      // Ge- prefix + noun stem (often neuter)
      if (normalized.startsWith('ge') && normalized.length > 4) {
        return 'das';
      }
      
      // Nouns from adjectives (das Gute, das Böse) - usually das + adjective
      // Hard to detect without context
      
      // ==========================================
      // FEMININE (die) RULES
      // ==========================================
      
      // -ung ending (very reliable, ~99%)
      if (normalized.endsWith('ung')) {
        return 'die';
      }
      
      // -heit, -keit endings (very reliable)
      if (normalized.endsWith('heit') || normalized.endsWith('keit')) {
        return 'die';
      }
      
      // -schaft ending
      if (normalized.endsWith('schaft')) {
        return 'die';
      }
      
      // -ion, -tion, -sion endings (French/Latin loans)
      if (normalized.endsWith('ion') || normalized.endsWith('tion') || normalized.endsWith('sion')) {
        return 'die';
      }
      
      // -tät, -ität endings
      if (normalized.endsWith('tät') || normalized.endsWith('ität')) {
        return 'die';
      }
      
      // -ik ending
      if (normalized.endsWith('ik') && normalized.length > 3) {
        return 'die';
      }
      
      // -ur ending
      if (normalized.endsWith('ur') && normalized.length > 3 && !normalized.endsWith('atur')) {
        return 'die';
      }
      
      // -ei ending
      if (normalized.endsWith('ei') && normalized.length > 3 && !normalized.endsWith('erei')) {
        return 'die';
      }
      
      // -e ending (many feminine nouns, but many exceptions)
      if (normalized.endsWith('e') && normalized.length > 2) {
        // Exceptions: some masculine (der Name, der See) and neuter (das Auge, das Ende)
        // But statistically, -e ending favors feminine
        // Check for known exceptions first
        const eExceptions = ['name', 'see', 'auge', 'ende', 'interesse', 'ergebnis'];
        if (!eExceptions.includes(baseForm)) {
          return 'die';
        }
      }
      
      // -in ending (female person/occupation)
      if (normalized.endsWith('in') && normalized.length > 2 && !normalized.endsWith('chin')) {
        return 'die';
      }
      
      // -ade, -age, -anz, -enz endings
      if (normalized.endsWith('ade') || normalized.endsWith('age') || 
          normalized.endsWith('anz') || normalized.endsWith('enz')) {
        return 'die';
      }
      
      // ==========================================
      // MASCULINE (der) RULES
      // ==========================================
      
      // -er ending (agent nouns, many masculine)
      if (normalized.endsWith('er') && normalized.length > 3) {
        // Exceptions: -ier (often neuter in compounds), but standalone -er is often masculine
        if (!normalized.endsWith('ier') && !normalized.endsWith('chen') && !normalized.endsWith('lein')) {
          return 'der';
        }
      }
      
      // -ling ending (diminutive/masculine)
      if (normalized.endsWith('ling')) {
        return 'der';
      }
      
      // -ismus ending (ideologies, movements)
      if (normalized.endsWith('ismus')) {
        return 'der';
      }
      
      // -or ending (often masculine, especially occupations)
      if (normalized.endsWith('or') && normalized.length > 3) {
        return 'der';
      }
      
      // -eur, -är endings (occupations, often masculine)
      if (normalized.endsWith('eur') || normalized.endsWith('är')) {
        return 'der';
      }
      
      // -ig, -ich endings (often masculine)
      if (normalized.endsWith('ig') || normalized.endsWith('ich')) {
        return 'der';
      }
      
      // -us ending (often masculine, Latin loans)
      if (normalized.endsWith('us') && normalized.length > 3 && !normalized.endsWith('mus')) {
        return 'der';
      }
      
      // Days of week, months (masculine)
      const daysMonths = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag',
                         'januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 
                         'september', 'oktober', 'november', 'dezember'];
      if (daysMonths.includes(normalized)) {
        return 'der';
      }
      
      // Seasons (masculine)
      if (['frühling', 'sommer', 'herbst', 'winter'].includes(normalized)) {
        return 'der';
      }
      
      // Compass directions (masculine)
      if (['norden', 'süden', 'osten', 'westen'].includes(normalized)) {
        return 'der';
      }
      
      // ==========================================
      // SEMANTIC PATTERNS (less reliable but useful)
      // ==========================================
      
      // Body parts (mixed, but patterns exist)
      // Many body parts are feminine, but many exceptions
      
      // Trees (usually masculine)
      const trees = ['baum', 'birke', 'eiche', 'buche', 'fichte', 'tanne', 'linde', 'ahorn', 'ulme'];
      if (trees.includes(baseForm)) {
        return 'der';
      }
      
      // Mountains, hills (usually masculine)
      if (normalized.endsWith('berg') || normalized.includes('berg')) {
        return 'der';
      }
      
      // Rivers (usually masculine in Germany, but feminine in Austria/Switzerland)
      // Default to masculine
      if (normalized.endsWith('fluss') || normalized.includes('fluss')) {
        return 'der';
      }
      
      // Cars, vehicles (usually masculine or neuter)
      // Brands often masculine (der BMW), generic terms often neuter (das Auto)
      
      // If no pattern matches, return null (unknown)
      return null;
    }

    /**
     * Main function to determine article
     * Uses rule-based approach with fallback handling
     */
    function determineArticle(word) {
      if (!word || word.trim().length === 0) {
        return null;
      }

      // Apply comprehensive rule-based determination
      const article = determineArticleByRules(word);
      
      return article;
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
