// Small bits of behavior for playultimatum.us. The page works without this file;
// it only adds the phone menu, pop-ups, tabs and the smart "Get the app" button.

document.addEventListener("DOMContentLoaded", () => {
  // Small header logo shows only after the big neon sign scrolls out of view
  const header = document.querySelector(".site-header");
  const sign = document.querySelector(".sign");
  if (header && sign && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("sign-in-view", entry.isIntersecting);
    }, { rootMargin: "-68px 0px 0px 0px" }).observe(sign);
  } else if (header) {
    header.classList.remove("sign-in-view");
  }

  // Seed generator: every visit gets a fresh seed from the browser's secure random
  // source, and that seed drives the dare order and every pass/fail. Add ?seed=12345
  // to the address to replay the exact same sequence (handy for testing).
  const seed = (() => {
    const fromUrl = new URLSearchParams(location.search).get("seed");
    if (fromUrl !== null && /^\d+$/.test(fromUrl)) return Number(fromUrl) >>> 0;
    if (window.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
    return (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0;
  })();
  document.documentElement.dataset.seed = String(seed);
  let state = seed;
  const random = () => {               // mulberry32: turns the seed into numbers from 0 to 1
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Rotating game moments under the headline: 24 lines in random order, a new one
  // every few seconds. Pauses only while it's off screen or the tab is hidden, and
  // stays on the first dare if the visitor asked their phone for less motion.
  const DARES = [
    "Stay hidden for 20 minutes.", "Tag all four players downtown.", "Find the gold envelope.",
    "Reach the safe zone in time.", "Solve three clues in 30 minutes.", "Be first to the fountain.",
    "Escape the seeker for 10 blocks.", "Say the code word at the café.", "Find the mural on 5th Ave.",
    "Outrun the tagger to Main St.", "Six wings before the buzzer.", "Build a look under $50.",
    "Be first through the door.", "Sing the song the crowd picked.", "Find the hider in 20 minutes.",
    "Cross the park without a tag.", "Crack the last clue.", "Get to the finish line first.",
    "Survive the final two minutes.", "Do what the crowd voted for.",
    "Ten minutes alone in the attic.", "Explore the mall by flashlight.", "Open the door the crowd picked.",
    "Stay till the candle burns out."
  ];
  const slot = document.querySelector(".dares");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The crowd's verdict: about 1.3 s after each dare lands, "pass" or "fail" lights up.
  // A true coin flip from the seeded generator, so streaks can happen like real votes.
  const votes = [...document.querySelectorAll(".vote")];
  let verdictTimer = null;
  const decide = () => {
    if (votes.length < 2) return;
    votes.forEach((v) => v.classList.remove("is-lit"));
    clearTimeout(verdictTimer);
    verdictTimer = setTimeout(() => {
      votes[random() < 0.5 ? 0 : 1].classList.add("is-lit");      // pass or fail
    }, 1300);
  };
  if (calm && votes.length) votes[0].classList.add("is-lit");
  if (slot && !calm) {
    let shown = slot.querySelector(".dare");
    let spare = document.createElement("span");
    spare.className = "dare";
    slot.appendChild(spare);
    // Shuffled "bag": every dare shows once per lap, never the same one twice in a row.
    let bag = [], firstLap = true;
    let current = DARES.indexOf(shown.textContent.replace(/[“”]/g, ""));
    const draw = () => {
      if (!bag.length) {
        bag = DARES.map((_, n) => n).filter((n) => !(firstLap && n === current));
        for (let k = bag.length - 1; k > 0; k--) {
          const r = Math.floor(random() * (k + 1));
          [bag[k], bag[r]] = [bag[r], bag[k]];
        }
        const last = bag.length - 1;
        if (bag[last] === current) [bag[0], bag[last]] = [bag[last], bag[0]];
        firstLap = false;
      }
      return bag.pop();
    };
    const next = () => {
      current = draw();
      spare.textContent = "“" + DARES[current] + "”";
      spare.classList.add("reset"); spare.classList.remove("is-out");
      void spare.offsetWidth;            // park it below the slot before it rolls in
      spare.classList.remove("reset");
      spare.classList.add("is-on");
      shown.classList.remove("is-on"); shown.classList.add("is-out");
      [shown, spare] = [spare, shown];
      decide();
    };
    let timer = null, onScreen = true;
    const run = () => {
      const go = onScreen && !document.hidden;
      if (go && !timer) timer = setInterval(next, 2800);
      if (!go && timer) { clearInterval(timer); timer = null; }
    };
    const hero = document.querySelector(".hero");
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", run);
    run();
    decide();
  }

  // Phone menu
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  // "Get the app" goes straight to the right store on phones
  const ua = navigator.userAgent;
  const store = /iPhone|iPad|iPod/.test(ua)
    ? "https://apps.apple.com/us/app/ultimatum-challenges/id6443896103"
    : /Android/.test(ua) ? "https://play.google.com/store/apps/details?id=com.ultimatum" : null;
  if (store) document.querySelectorAll(".get-app").forEach((a) => { a.href = store; });

  // "Ways to play" pop-ups (Esc closes them natively)
  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.open);
      if (dialog && dialog.showModal) dialog.showModal();
    });
  });
  document.querySelectorAll("dialog.round").forEach((dialog) => {
    // Tapping the dark area outside the pop-up closes it
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  });

  // Business tabs
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length], true);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });
});
