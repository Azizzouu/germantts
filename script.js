(function(){
  'use strict';

  // ==========================================
  // TTS SECTION
  // ==========================================
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
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
    
      if (!germanVoices.length) return voices[0] || null;
    
      // ✅ Desktop Chrome / Android Chrome
      const googleVoice = germanVoices.find(v =>
        v.name.toLowerCase().includes("google") ||
        v.voiceURI.toLowerCase().includes("google")
      );
      if (!isIOS() && googleVoice) return googleVoice;
    
      // ✅ iOS (Safari/Chrome → same WebKit engine)
      if (isIOS()) {
        const markus = germanVoices.find(v =>
          v.name.toLowerCase().includes("markus")
        );
        if (markus) return markus;
      }
      return germanVoices[0];
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

})();

// ==========================================
// ARTICLE LOOKUP SECTION
// ==========================================

(function initArticleLookup() {
  const wordEl = document.getElementById('article-word');
  const lookupBtn = document.getElementById('article-lookupBtn');
  const statusEl = document.getElementById('article-status');
  const resultPanel = document.getElementById('article-result');
  const contentEl = document.getElementById('article-content');

  if (!wordEl || !lookupBtn) return;

  function setStatus(msg, good = true) {
    if (statusEl) {
      statusEl.textContent = msg || '';
      statusEl.style.color = good ? 'var(--success)' : 'var(--error)';
    }
  }

  function showResult(html) {
    if (contentEl) contentEl.innerHTML = html;
    if (resultPanel) resultPanel.style.display = 'block';
  }

  function hideResult() {
    if (resultPanel) resultPanel.style.display = 'none';
  }

  async function lookupArticle() {
    const word = (wordEl.value || '').trim();
    if (!word) {
      setStatus('Please enter a German word.', false);
      hideResult();
      return;
    }

    setStatus('Looking up…');
    hideResult();
    lookupBtn.disabled = true;

    try {
      // Wiktionary API endpoint for German
      const url = `https://de.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          setStatus('Word not found in Wiktionary.', false);
        } else {
          setStatus('Error fetching data from Wiktionary.', false);
        }
        lookupBtn.disabled = false;
        return;
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract article information
      const article = extractArticle(doc, word);
      
      if (article) {
        const resultHTML = formatResult(article);
        showResult(resultHTML);
        setStatus('Found!');
      } else {
        setStatus('Could not find article information.', false);
        hideResult();
      }

    } catch (error) {
      console.error('Lookup error:', error);
      setStatus('Error: Could not connect to Wiktionary.', false);
    } finally {
      lookupBtn.disabled = false;
    }
  }

  function extractArticle(doc, word) {
    // Look for German section
    let germanSection = null;
    const headers = doc.querySelectorAll('h2, h3, h4');
    
    for (let header of headers) {
      if (header.textContent.includes('Deutsch') || header.id === 'Deutsch') {
        germanSection = header;
        break;
      }
    }

    if (!germanSection) return null;

    // Find the article in nearby content
    let current = germanSection.nextElementSibling;
    let article = null;
    let genus = null;
    let plural = null;

    while (current && !current.matches('h2')) {
      const text = current.textContent;
      
      // Look for article patterns
      if (text.includes('der ') || text.includes('die ') || text.includes('das ')) {
        const match = text.match(/\b(der|die|das)\s+\w+/i);
        if (match) {
          article = match[1].toLowerCase();
        }
      }

      // Look for genus in tables or declension sections
      if (current.tagName === 'TABLE') {
        const cells = current.querySelectorAll('td, th');
        for (let cell of cells) {
          const cellText = cell.textContent.toLowerCase();
          if (cellText.includes('genus') || cellText.includes('geschlecht')) {
            const genusCell = cell.nextElementSibling;
            if (genusCell) {
              const genusText = genusCell.textContent.toLowerCase();
              if (genusText.includes('maskulin') || genusText.includes('männlich')) {
                article = 'der';
                genus = 'maskulinum';
              } else if (genusText.includes('feminin') || genusText.includes('weiblich')) {
                article = 'die';
                genus = 'femininum';
              } else if (genusText.includes('neutrum') || genusText.includes('sächlich')) {
                article = 'das';
                genus = 'neutrum';
              }
            }
          }
          if (cellText.includes('plural')) {
            const pluralCell = cell.nextElementSibling;
            if (pluralCell) plural = pluralCell.textContent.trim();
          }
        }
      }

      // Check strong/template elements for article indicators
      const strong = current.querySelector('strong, b');
      if (strong && strong.textContent.includes(word)) {
        const parent = strong.parentElement;
        if (parent) {
          const fullText = parent.textContent;
          const articleMatch = fullText.match(/\b(der|die|das)\s+/i);
          if (articleMatch) {
            article = articleMatch[1].toLowerCase();
          }
        }
      }

      if (article) break;
      current = current.nextElementSibling;
    }

    if (article) {
      return { word, article, genus, plural };
    }

    return null;
  }

  function formatResult(data) {
    const articleColors = {
      'der': '#7aa2ff',
      'die': '#ff7aa2', 
      'das': '#a2ff7a'
    };

    const color = articleColors[data.article] || 'var(--accent)';

    let html = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; font-weight: 700; color: ${color}; margin-bottom: 8px;">
          ${data.article}
        </div>
        <div style="font-size: 32px; font-weight: 600; color: var(--text);">
          ${data.word}
        </div>
      </div>
    `;

    if (data.genus) {
      html += `
        <div style="margin: 12px 0; padding: 12px; background: rgba(122, 162, 255, 0.1); border-radius: 8px;">
          <strong style="color: var(--accent);">Genus:</strong> ${data.genus}
        </div>
      `;
    }

    if (data.plural) {
      html += `
        <div style="margin: 12px 0; padding: 12px; background: rgba(122, 162, 255, 0.1); border-radius: 8px;">
          <strong style="color: var(--accent);">Plural:</strong> ${data.plural}
        </div>
      `;
    }

    html += `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(122, 162, 255, 0.15); font-size: 12px; color: var(--muted); text-align: center;">
        Data from <a href="https://de.wiktionary.org/wiki/${encodeURIComponent(data.word)}" target="_blank" style="color: var(--accent);">Wiktionary</a>
      </div>
    `;

    return html;
  }

  // Event listeners
  if (lookupBtn) {
    lookupBtn.addEventListener('click', lookupArticle);
  }

  if (wordEl) {
    wordEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lookupArticle();
      }
    });
  }
})();

