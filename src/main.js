import './styles/style.css'

console.log('Hello from VS Code')

// -----------------------------------------
// OSMO PAGE TRANSITION BOILERPLATE
// -----------------------------------------

gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches)); 

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });



// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
  
  // Runs once on first load
  // if (has('[data-something]')) initSomething();
  initBasicCustomCursor();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
  
  // Runs before the enter animation
  // if (has('[data-something]')) initSomething();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;
  
  // Runs after enter animation completes
  // if (has('[data-something]')) initSomething();
  if(has('[data-highlight-marker-reveal]')) initHighlightMarkerTextReveal();
  
  
  if(hasLenis){
    lenis.resize();
  }
  
  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}



// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next)
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  const tl = gsap.timeline({
    onComplete: () => { current.remove() }
  });
  
  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.to(current, { autoAlpha: 0, duration: 0.4 });

  return tl;
}

function runPageEnterAnimation(next){
  const tl = gsap.timeline();
  
  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady")
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }
  
  tl.add("startEnter", 0.6);
  
  tl.fromTo(next, {
    autoAlpha: 0,
  },{
    autoAlpha: 1,
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {
  // Position new container on top
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });
  
  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }
  
  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if(hasScrollTrigger){
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
})

barba.hooks.afterEnter(data => {
  // Run page functions
  initAfterEnterFunctions(data.next.container);
  
  // Settle
  if(hasLenis){
    lenis.resize();
    lenis.start();    
  }
  
  if(hasScrollTrigger){
    ScrollTrigger.refresh(); 
  }
});

barba.init({
  debug: true, // Set to 'false' in production
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,
      
      // First load
      async once(data) {
        initOnceFunctions();

        return runPageOnceAnimation(data.next.container);
      },

      // Current page leaves
      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      // New page enters
      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});



// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;
  
  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return; // already created
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container){
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });
  
  if(hasLenis){
    lenis.resize();
    lenis.start();    
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth,
    timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;

    // Aria-current sync
    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    // Class list sync
    var newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}



// -----------------------------------------
// YOUR FUNCTIONS GO BELOW HERE
// -----------------------------------------

/* Highlight Marker Text Reveal */
function initHighlightMarkerTextReveal() {
    const defaults = {
      direction: "right",
      theme: "pink",
      scrollStart: "top 90%",
      staggerStart: "start",
      stagger: 100,
      barDuration: 0.6,
      barEase: "power3.inOut",
    };
  
    const colorMap = {
      pink: "#C700EF",
      white: "#FFFFFF",
    };
  
    const directionMap = {
      right: { prop: "scaleX", origin: "right center" },
      left: { prop: "scaleX", origin: "left center" },
      up: { prop: "scaleY", origin: "center top" },
      down: { prop: "scaleY", origin: "center bottom" },
    };
  
    function resolveColor(value) {
      if (colorMap[value]) return colorMap[value];
      if (value.startsWith("--")) {
        return getComputedStyle(document.body).getPropertyValue(value).trim() || value;
      }
      return value;
    }
  
    function createBar(color, origin) {
      const bar = document.createElement("div");
      bar.className = "highlight-marker-bar";
      Object.assign(bar.style, {
        backgroundColor: color,
        transformOrigin: origin,
      });
      return bar;
    }
  
    function cleanupElement(el) {
      if (!el._highlightMarkerReveal) return;
      el._highlightMarkerReveal.timeline?.kill();
      el._highlightMarkerReveal.scrollTrigger?.kill();
      el._highlightMarkerReveal.split?.revert();
      el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());
      delete el._highlightMarkerReveal;
    }
  
    let reduceMotion = false;
  
    gsap.matchMedia().add(
      { reduce: "(prefers-reduced-motion: reduce)" },
      (context) => {
        reduceMotion = context.conditions.reduce;
      }
    );
  
    // Reduced motion: no animation at all
    if (reduceMotion) {
      document.querySelectorAll("[data-highlight-marker-reveal]").forEach((el) => {
        gsap.set(el, { autoAlpha: 1 });
      });
      return;
    }
  
    // Cleanup previous instances
    document.querySelectorAll("[data-highlight-marker-reveal]").forEach(cleanupElement);
  
    const elements = document.querySelectorAll("[data-highlight-marker-reveal]");
    if (!elements.length) return;
  
    elements.forEach((el) => {
      const direction = el.getAttribute("data-marker-direction") || defaults.direction;
      const theme = el.getAttribute("data-marker-theme") || defaults.theme;
      const scrollStart = el.getAttribute("data-marker-scroll-start") || defaults.scrollStart;
      const staggerStart = el.getAttribute("data-marker-stagger-start") || defaults.staggerStart;
      const staggerOffset = (parseFloat(el.getAttribute("data-marker-stagger")) || defaults.stagger) / 1000;
  
      const color = resolveColor(theme);
      const dirConfig = directionMap[direction] || directionMap.right;
  
      el._highlightMarkerReveal = {};
  
      const split = SplitText.create(el, {
        type: "lines",
        linesClass: "highlight-marker-line",
        autoSplit: true,
        onSplit(self) {
          const instance = el._highlightMarkerReveal;
  
          // Teardown previous build
          instance.timeline?.kill();
          instance.scrollTrigger?.kill();
          el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());
  
          // Build bars and timeline
          const lines = self.lines;
          const tl = gsap.timeline({ paused: true });
  
          lines.forEach((line, i) => {
            gsap.set(line, { position: "relative", overflow: "hidden" });
  
            const bar = createBar(color, dirConfig.origin);
            line.appendChild(bar);
  
            const staggerIndex = staggerStart === "end" ? lines.length - 1 - i : i;
  
            tl.to(bar, {
              [dirConfig.prop]: 0,
              duration: defaults.barDuration,
              ease: defaults.barEase,
            }, staggerIndex * staggerOffset);
          });
  
          // Reveal parent — bars are covering the text
          gsap.set(el, { autoAlpha: 1 });
  
          // ScrollTrigger
          const st = ScrollTrigger.create({
            trigger: el,
            start: scrollStart,
            once: true,
            onEnter: () => tl.play(),
          });
  
          instance.timeline = tl;
          instance.scrollTrigger = st;
        },
      });
  
      el._highlightMarkerReveal.split = split;
    });
  }

  /* Custom Cursor  */
  function initBasicCustomCursor() {  
  
    gsap.set(".cursor", {xPercent:-50, yPercent: -50});
  
    let xTo = gsap.quickTo(".cursor", "x", {duration: 1, ease: "power3"});
    let yTo = gsap.quickTo(".cursor", "y", {duration: 1, ease: "power3"});
  
    window.addEventListener("mousemove", e => {
      xTo(e.clientX);
      yTo(e.clientY);
    });
  }
