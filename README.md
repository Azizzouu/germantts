# German Text-to-Speech

A browser-based German Text-to-Speech application with article determination.

## Features

- **Text-to-Speech**: Convert German text to speech using browser voices
- **Article Determiner**: Determine the article (der/die/das) for German nouns using the `german-noun` npm package

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run dev
```

3. Open `index.html` in your browser

## Usage

### Text-to-Speech
- Enter German text in the textarea
- Select a German voice
- Adjust rate, pitch, and volume settings
- Click "Speak" or press Ctrl/⌘ + Enter

### Article Determiner
- Type a German noun in the input field
- The article (der, die, or das) will be displayed automatically

## Browser Support

Works best in Chrome, Edge, or Safari with German voices installed.

## Dependencies

- `german-noun`: npm package for determining German noun articles
- `webpack`: Build tool for bundling the application

