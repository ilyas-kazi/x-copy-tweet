(async function () {
    const prefix = "The visible start of the tweet.…";
    const fullText = "The visible start of the tweet.\nThe previously hidden ending.";
    const copies = [];
    const fallbackCopies = [];
    let rejectClipboard = false;
    let fallbackSucceeds = true;
    let passed = 0;
    let failed = 0;

    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
            async writeText(text) {
                if (rejectClipboard) throw new Error("Clipboard unavailable");
                copies.push(text);
            }
        }
    });
    document.execCommand = function (command) {
        if (command !== "copy") throw new Error("Unexpected command");
        if (fallbackSucceeds) fallbackCopies.push(document.querySelector("textarea").value);
        return fallbackSucceeds;
    };

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    function equal(actual, expected) {
        assert(actual === expected, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitFor(check, timeout = 1000) {
        const deadline = Date.now() + timeout;
        while (!check()) {
            if (Date.now() >= deadline) throw new Error("Timed out waiting for result");
            await delay(10);
        }
    }

    function fixture(text = prefix, collapsed = true) {
        const article = document.createElement("article");
        article.dataset.xCopy = "fixture";
        article.innerHTML = `
            <div data-testid="User-Name"><a href="/tester" role="link"><span>Test User</span></a></div>
            <a href="/tester/status/123" role="link"><time>Now</time></a>
            <div class="body"><div data-testid="tweetText" lang="en"></div></div>
            <div role="group"></div>
        `;
        const body = article.querySelector(".body");
        const textNode = body.querySelector("[data-testid='tweetText']");
        textNode.style.whiteSpace = "pre-wrap";
        textNode.innerText = text;
        let more;
        if (collapsed) {
            more = document.createElement("button");
            more.dataset.testid = "tweet-text-show-more-link";
            more.textContent = "Show more";
            body.appendChild(more);
        }
        document.querySelector("#fixtures").appendChild(article);
        return {
            article, body, textNode, more,
            replaceText(value) {
                const replacement = textNode.cloneNode(false);
                replacement.innerText = value;
                body.querySelector("[data-testid='tweetText']").replaceWith(replacement);
            }
        };
    }

    function menuItem(f, index) {
        delete f.article.dataset.xCopy;
        addCopyButtons();
        const button = f.article.querySelector(".x-copy-btn");
        button.click();
        return button._xcopyMenu.children[index];
    }

    async function test(name, run) {
        copies.length = 0;
        fallbackCopies.length = 0;
        rejectClipboard = false;
        fallbackSucceeds = true;
        const result = document.createElement("li");
        document.querySelector("#results").appendChild(result);
        try {
            await run();
            result.textContent = `PASS: ${name}`;
            passed++;
        } catch (error) {
            result.textContent = `FAIL: ${name}\n${error.message}`;
            failed++;
        } finally {
            document.querySelector("#fixtures").replaceChildren();
            document.querySelectorAll(".x-copy-menu, .x-copy-tooltip").forEach(el => el.remove());
        }
    }

    await test("An ordinary tweet keeps its existing copy behavior", async () => {
        const f = fixture(fullText, false);
        menuItem(f, 0).click();
        await waitFor(() => copies.length);
        equal(copies[0], fullText);
    });

    for (const index of [0, 1]) {
        await test(`Copy menu ${index + 1} waits for the full tweet without a manual Show more click`, async () => {
            const f = fixture();
            let clicks = 0;
            f.more.addEventListener("click", () => {
                clicks++;
                setTimeout(() => {
                    f.replaceText(fullText);
                    f.more.remove();
                }, 20);
            });
            menuItem(f, index).click();
            await waitFor(() => copies.length);
            equal(copies[0], index ? `Test User (@tester)\n${fullText}` : fullText);
            equal(clicks, 1);
        });
    }

    await test("Synchronous expansion is not missed", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => {
            f.replaceText(fullText);
            f.more.remove();
        });
        equal(await getFullTweetText(f.article), fullText);
    });

    await test("CSS-only folding can copy unchanged full text after the layout expands", async () => {
        const f = fixture(fullText);
        f.textNode.style.cssText = "width: 100px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; white-space: pre-wrap";
        assert(f.textNode.scrollHeight > f.textNode.clientHeight, "Fixture should be clipped");
        f.more.addEventListener("click", () => {
            f.textNode.style.removeProperty("-webkit-line-clamp");
            f.more.remove();
        });
        equal(await getFullTweetText(f.article), fullText);
    });

    await test("Text-node mutations are observed", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => setTimeout(() => {
            f.textNode.firstChild.data = fullText;
            f.more.remove();
        }, 20));
        equal(await getFullTweetText(f.article), fullText);
    });

    await test("Removing Show more before rendering the text does not copy the prefix", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => {
            f.more.remove();
            setTimeout(() => f.replaceText(fullText), 20);
        });
        equal(await getFullTweetText(f.article), fullText);
    });

    await test("Changing text while Show more remains does not finish early", async () => {
        const f = fixture();
        let finished = false;
        f.more.addEventListener("click", () => f.replaceText(fullText));
        const pending = getFullTweetText(f.article).then(text => {
            finished = true;
            return text;
        });
        await delay(20);
        equal(finished, false);
        f.more.remove();
        equal(await pending, fullText);
    });

    await test("A quoted tweet's Show more control is left alone", async () => {
        const f = fixture(fullText, false);
        const quoted = document.createElement("div");
        quoted.innerHTML = '<div data-testid="tweetText">Quoted prefix…</div><button data-testid="tweet-text-show-more-link">Show more</button>';
        let clicks = 0;
        quoted.querySelector("button").addEventListener("click", () => clicks++);
        f.article.appendChild(quoted);
        equal(await getFullTweetText(f.article), fullText);
        equal(clicks, 0);
    });

    await test("Overlapping requests share a single expansion", async () => {
        const f = fixture();
        let clicks = 0;
        f.more.addEventListener("click", () => {
            clicks++;
            setTimeout(() => {
                f.replaceText(fullText);
                f.more.remove();
            }, 20);
        });
        const first = getFullTweetText(f.article);
        const second = getFullTweetText(f.article);
        equal(first, second);
        equal(await first, fullText);
        equal(clicks, 1);
    });

    await test("A navigation link is not clicked", async () => {
        const f = fixture();
        const link = document.createElement("a");
        link.href = "/tester/status/123";
        link.dataset.testid = "tweet-text-show-more-link";
        link.textContent = "Show more";
        let clicks = 0;
        link.addEventListener("click", event => {
            event.preventDefault();
            clicks++;
        });
        f.more.replaceWith(link);
        await getFullTweetText(f.article).then(() => {
            throw new Error("Expected expansion to fail");
        }, () => equal(clicks, 0));
    });

    await test("A removed tweet is not copied after asynchronous rendering", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => setTimeout(() => {
            f.article.remove();
            f.replaceText(fullText);
            f.more.remove();
        }, 20));
        await getFullTweetText(f.article).then(() => {
            throw new Error("Expected expansion to fail");
        }, () => {});
    });

    await test("An expansion click error is handled", async () => {
        const f = fixture();
        f.more.click = () => { throw new Error("Click failed"); };
        await getFullTweetText(f.article).then(() => {
            throw new Error("Expected expansion to fail");
        }, error => equal(error.message, "Click failed"));
    });

    await test("A recycled article does not copy a different tweet", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => setTimeout(() => {
            f.article.querySelector("a[href*='/status/']").setAttribute("href", "/tester/status/456");
            f.replaceText(fullText);
            f.more.remove();
        }, 20));
        await getFullTweetText(f.article).then(() => {
            throw new Error("Expected expansion to fail");
        }, error => equal(error.message, "Tweet changed during expansion"));
    });

    await test("Clipboard fallback receives the expanded text", async () => {
        const f = fixture();
        rejectClipboard = true;
        f.more.addEventListener("click", () => {
            f.replaceText(fullText);
            f.more.remove();
        });
        menuItem(f, 1).click();
        await waitFor(() => fallbackCopies.length);
        equal(fallbackCopies[0], `Test User (@tester)\n${fullText}`);
    });

    await test("A failed clipboard fallback does not report success", async () => {
        const f = fixture(fullText, false);
        rejectClipboard = true;
        fallbackSucceeds = false;
        menuItem(f, 0).click();
        await waitFor(() => f.article.querySelector(".x-copy-toast")?.innerText === "Copy failed");
        equal(copies.length, 0);
        equal(fallbackCopies.length, 0);
    });

    await test("An unchanged prefix times out, leaves the clipboard alone, and permits retry", async () => {
        const f = fixture();
        menuItem(f, 0).click();
        await waitFor(() => f.article.querySelector(".x-copy-toast")?.innerText === "Could not expand tweet", 6000);
        equal(copies.length, 0);
        equal(fallbackCopies.length, 0);
        f.more.addEventListener("click", () => {
            f.replaceText(fullText);
            f.more.remove();
        });
        equal(await getFullTweetText(f.article), fullText);
    });

    await test("Removing only the control still refuses to copy an unchanged prefix", async () => {
        const f = fixture();
        f.more.addEventListener("click", () => f.more.remove());
        await getFullTweetText(f.article).then(() => {
            throw new Error("Expected expansion to fail");
        }, error => equal(error.message, "Tweet expansion timed out"));
    });

    document.querySelector("#status").textContent = `${passed} passed, ${failed} failed`;
    document.title = `${passed} passed, ${failed} failed — X Copy Tweet tests`;
})();
