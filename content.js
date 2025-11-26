// X-COPY content script (debug friendly, robust selectors)

console.log("X-COPY: content script loaded");

const DEBUG = true;

function debugLog(...args) {
    if (DEBUG) console.log("X-COPY:", ...args);
}

// Helper: get tweet text reliably (tries multiple selectors)
function extractTweetText(tweetEl) {
    // Prefer explicit tweet text testid
    let textEl = tweetEl.querySelector("[data-testid='tweetText'], div[lang]");
    if (textEl && textEl.innerText.trim()) return textEl.innerText.trim();

    // Fallback: gather visible text nodes inside article ignoring buttons/links
    const walker = document.createTreeWalker(tweetEl, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            // skip script/style and common UI/class names
            const skip = ["button", "a", "svg", "time"].includes(parent.tagName.toLowerCase()) ||
                parent.closest("a, button, svg, css-1dbjc4n");
            if (skip) return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    let pieces = [];
    let n;
    while (n = walker.nextNode()) pieces.push(n.nodeValue.trim());
    const joined = pieces.join(" ").replace(/\s+/g, " ").trim();
    return joined;
}

// Create the copy button element
function makeCopyButton() {
    const btn = document.createElement("button");
    btn.className = "x-copy-btn";
    btn.type = "button";
    btn.innerText = "Copy";
    btn.style.userSelect = "none";
    return btn;
}

function addCopyButtons() {
    const tweets = document.querySelectorAll("article:not([data-x-copy])");

    tweets.forEach(article => {

        // --------------------------------------------
        // SKIP "Someone followed you" notifications
        // --------------------------------------------
        if (article.querySelector('[data-testid="UserCell"]')) {
            // Mark as processed to avoid re-checking
            article.dataset.xCopy = "skip-follow-notification";
            return;
        }

        // Also skip if no tweet text exists (like some system items)
        if (!article.querySelector("[data-testid='tweetText']") &&
            !article.querySelector("div[lang]")) {
            article.dataset.xCopy = "skip-non-tweet";
            return;
        }

        // ------------------------------------
        // CONTINUE normally for real tweets
        // ------------------------------------
        article.dataset.xCopy = "1";
        article.style.position = "relative"; // anchor for absolute button

        // Create wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "x-copy-btn-wrapper";

        // Create the button
        const btn = document.createElement("button");
        btn.className = "x-copy-btn";
        btn.innerHTML = `
      <svg viewBox="0 0 16 16">
        <path d="M10 1H3C2.4 1 2 1.4 2 2v9h2V3h6V1zm3 3H6C5.4 4 5 4.4 5 5v9c0 .6.4 1 1 1h7c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1zm-1 9H7V6h5v7z"></path>
      </svg>
    `;

        // Copy logic
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();

            const textNode = article.querySelector("[data-testid='tweetText'], div[lang]");
            const text = textNode?.innerText?.trim() ?? "";

            await navigator.clipboard.writeText(text);

            // Toast animation
            const toast = document.createElement("div");
            toast.className = "x-copy-toast";
            toast.innerText = "Copied!";
            article.appendChild(toast);

            requestAnimationFrame(() => toast.classList.add("show"));

            setTimeout(() => {
                toast.classList.remove("show");
                setTimeout(() => toast.remove(), 300);
            }, 1000);
        });

        wrapper.appendChild(btn);
        article.appendChild(wrapper);
    });
}

// Observe DOM changes (infinite scroll)
const observer = new MutationObserver((mutations) => {
    addCopyButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

// Also run periodically for initial load edge cases
const interval = setInterval(() => {
    addCopyButtons();
}, 1500);

// Stop interval after 30s to avoid polling forever
setTimeout(() => clearInterval(interval), 30000);

debugLog("setup complete, attempting initial injection");
addCopyButtons();
