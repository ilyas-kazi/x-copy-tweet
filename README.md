<p align="center"><img width="128" height="128" src="https://raw.githubusercontent.com/ilyas-kazi/x-copy-tweet/5527a8a18e5d69c43dede5696a45017225ab9de1/src/icons/icon.svg"></p>
<h1 align="center">X Copy Tweet - Cross-Browser Extension</h1>

## Description
A lightweight browser extension that adds a clean **Copy Tweet** button to every real tweet on **X.com** (formerly Twitter).  
It works across **Chrome, Edge, Brave, Opera, Vivaldi, Firefox, and Safari** using a unified `/src` codebase with platform-specific build folders.

## Screenshot

![Screenshot](screenshot.png)

---

# Project Structure (Cross-Browser)

```
x-copy-tweet/
│
├── src/                     # Master source (shared across all browsers)
│   ├── content.js
│   ├── styles.css
│   └── manifest.base.json
│
├── chrome/                  # Chrome / Edge / Brave / Opera / Vivaldi (Chromium)
│   ├── manifest.json
│   ├── content.js
│   ├── styles.css
│   └── icon.png
│
├── firefox/                 # Firefox MV3-compatible build
│   ├── manifest.json
│   ├── content.js
│   ├── styles.css
│   └── icon.png
│
└── safari/                  # Safari Web Extension (Xcode build folder)
    └── XCopyTweet/
        ├── manifest.json
        ├── content.js
        ├── styles.css
        ├── Resources/
        │   └── icon.png
        └── _metadata.json
```

---

# Browser Support

| Browser | Support | Folder |
|--------|---------|--------|
| Chrome |  Full  | `/chrome` |
| Edge |  Full  | `/chrome` |
| Brave |  Full  | `/chrome` |
| Opera |  Full  | `/chrome` |
| Vivaldi |  Full  | `/chrome` |
| Firefox |  MV3  | `/firefox` |
| Safari |  MV2  | `/safari/XCopyTweet` |

---

# Installation Instructions

## Chrome / Edge / Brave / Opera / Vivaldi

1. Open: `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select folder:

```
/chrome
```

---

## Firefox

1. Open: `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select:

```
/firefox/manifest.json
```

---

## Safari

Safari requires Xcode.

1. Open Xcode  
2. File → Open → select:

```
/safari/XCopyTweet/
```

3. Build & Run → enable the extension in Safari Preferences → Extensions

---

# How It Works

### ➣ Detects real tweets  
Only `<article>` elements containing tweet text are modified.

### ➣ Skips notifications  
No button appears for:
- Likes  
- Replies  
- Mentions  
- Follows  
- Suggestions  
- System notifications  

### ➣ Injects copy button into action bar  
Button becomes the *first icon*, maintaining native UX.

### ➣ Click → Copies text + shows toast  
Works via:
- `navigator.clipboard.writeText`
- Safari/Firefox fallback using `execCommand("copy")`

For collapsed long tweets, both copy options automatically click the native **Show more** control next to the target text and wait up to five seconds for expansion. The tweet stays expanded afterward. If X only offers a link to another page or does not expand the text in place, the extension shows **Could not expand tweet** and leaves the clipboard unchanged.

No additional permissions, API requests, or third-party dependencies are required. This relies on X's current DOM structure and native expansion behavior.

---

# Build Workflow

Place your working files in `/src`.

When you update:

```
content.js
styles.css
```

Copy them into:

```
/chrome
/firefox
/safari/XCopyTweet
```

(Optionally automate using a build script.)

### Regression tests

Open `tests/content.html` in a browser. It runs the shared content script against real DOM fixtures, including asynchronous text replacement, CSS-only folding, both copy menus, clipboard fallback, quoted tweets, and failed expansion. Clipboard writes are mocked; the tests do not touch your clipboard or contact X.

All tests should report **PASS**. For a live check, load the relevant browser build, find a collapsed long tweet, and use each copy option without clicking **Show more** yourself. Verify that the copied text includes the ending and that the username option retains its author header.

---

# Future Enhancements

- ~~Implement menu on click for more options~~
- Copy full thread  
- ~~Copy tweet + username~~
- Options page  
- Publish to Chrome Web Store  
- Firefox `.xpi` packaging  
- Safari App Store distribution  

---

# License  
MIT License - free to use, modify, and distribute.

---

# Credits  
Created for productivity - copy tweets with one click.
