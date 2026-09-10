// section-hero-slider.js
// Vanilla JS controller for the Hero Slider section.
// Handles: background/text crossfade transitions, autoplay, arrow nav,
// dot nav, pause-on-hover, and Shopify theme editor events.

(function () {
  "use strict";

  var SELECTOR = ".hero-slider";

  function HeroSlider(sectionEl) {
    this.section = sectionEl;
    this.track = sectionEl.querySelector(".hero-slider__track");
    this.slides = Array.prototype.slice.call(
      sectionEl.querySelectorAll(".hero-slider__slide"),
    );
    this.dots = Array.prototype.slice.call(
      sectionEl.querySelectorAll(".hero-slider__dot"),
    );
    this.prevBtn = sectionEl.querySelector(".hero-slider__arrow--prev");
    this.nextBtn = sectionEl.querySelector(".hero-slider__arrow--next");

    this.currentIndex = 0;
    this.autoplay = sectionEl.dataset.autoplay === "true";
    this.autoplaySpeed = parseInt(sectionEl.dataset.autoplaySpeed, 10) || 6000;
    this.transitionSpeed =
      parseInt(sectionEl.dataset.transitionSpeed, 10) || 800;
    this.timer = null;
    this.isTransitioning = false;

    if (this.slides.length < 2) return;

    this._bindEvents();
    if (this.autoplay) this._startAutoplay();
  }

  HeroSlider.prototype._bindEvents = function () {
    var self = this;

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", function () {
        self._stopAutoplay();
        self.goTo(self.currentIndex - 1);
        if (self.autoplay) self._startAutoplay();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", function () {
        self._stopAutoplay();
        self.goTo(self.currentIndex + 1);
        if (self.autoplay) self._startAutoplay();
      });
    }

    this.dots.forEach(function (dot, index) {
      dot.addEventListener("click", function () {
        self._stopAutoplay();
        self.goTo(index);
        if (self.autoplay) self._startAutoplay();
      });
    });

    // Pause on hover / focus for accessibility and UX
    this.section.addEventListener("mouseenter", function () {
      self._stopAutoplay();
    });
    this.section.addEventListener("mouseleave", function () {
      if (self.autoplay) self._startAutoplay();
    });
    this.section.addEventListener("focusin", function () {
      self._stopAutoplay();
    });
    this.section.addEventListener("focusout", function () {
      if (self.autoplay) self._startAutoplay();
    });

    // Keyboard navigation
    this.section.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        self._stopAutoplay();
        self.goTo(self.currentIndex - 1);
        if (self.autoplay) self._startAutoplay();
      } else if (e.key === "ArrowRight") {
        self._stopAutoplay();
        self.goTo(self.currentIndex + 1);
        if (self.autoplay) self._startAutoplay();
      }
    });
  };

  HeroSlider.prototype.goTo = function (index) {
    if (this.isTransitioning) return;

    var total = this.slides.length;
    var newIndex = ((index % total) + total) % total;

    if (newIndex === this.currentIndex) return;

    var currentSlide = this.slides[this.currentIndex];
    var nextSlide = this.slides[newIndex];

    this.isTransitioning = true;

    // Prepare incoming slide
    nextSlide.classList.add("hero-slider__slide--entering");
    nextSlide.removeAttribute("aria-hidden");

    // Force reflow so the transition triggers
    void nextSlide.offsetWidth;

    // Crossfade
    currentSlide.classList.remove("hero-slider__slide--active");
    currentSlide.classList.add("hero-slider__slide--leaving");
    nextSlide.classList.add("hero-slider__slide--active");

    // Update dots
    if (this.dots.length) {
      this.dots[this.currentIndex].classList.remove("hero-slider__dot--active");
      this.dots[this.currentIndex].setAttribute("aria-selected", "false");
      this.dots[newIndex].classList.add("hero-slider__dot--active");
      this.dots[newIndex].setAttribute("aria-selected", "true");
    }

    var self = this;
    window.setTimeout(function () {
      currentSlide.classList.remove("hero-slider__slide--leaving");
      currentSlide.setAttribute("aria-hidden", "true");
      nextSlide.classList.remove("hero-slider__slide--entering");
      self.isTransitioning = false;
    }, this.transitionSpeed);

    this.currentIndex = newIndex;
  };

  HeroSlider.prototype._startAutoplay = function () {
    var self = this;
    this._stopAutoplay();
    this.timer = window.setInterval(function () {
      self.goTo(self.currentIndex + 1);
    }, this.autoplaySpeed);
  };

  HeroSlider.prototype._stopAutoplay = function () {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  };

  HeroSlider.prototype.destroy = function () {
    this._stopAutoplay();
  };

  // Registry to track instances per section (needed for theme editor re-init)
  var instances = {};

  function initSection(sectionEl) {
    var id = sectionEl.dataset.sectionId;
    if (instances[id]) {
      instances[id].destroy();
    }
    instances[id] = new HeroSlider(sectionEl);
  }

  function initAll() {
    var sections = document.querySelectorAll(SELECTOR);
    sections.forEach(initSection);
  }

  document.addEventListener("DOMContentLoaded", initAll);

  // Re-init when the section is loaded/edited in the theme editor
  document.addEventListener("shopify:section:load", function (event) {
    var sectionEl = event.target.querySelector(SELECTOR);
    if (sectionEl) initSection(sectionEl);
  });

  // Clean up autoplay when a section is removed/unloaded in the theme editor
  document.addEventListener("shopify:section:unload", function (event) {
    var sectionEl = event.target.querySelector(SELECTOR);
    if (sectionEl) {
      var id = sectionEl.dataset.sectionId;
      if (instances[id]) {
        instances[id].destroy();
        delete instances[id];
      }
    }
  });

  // Pause autoplay while editing a block inside this section
  document.addEventListener("shopify:block:select", function (event) {
    var sectionEl = event.target.closest(SELECTOR);
    if (sectionEl) {
      var id = sectionEl.dataset.sectionId;
      if (instances[id]) instances[id]._stopAutoplay();

      var slideIndex = Array.prototype.indexOf.call(
        sectionEl.querySelectorAll(".hero-slider__slide"),
        event.target,
      );
      if (slideIndex > -1 && instances[id]) {
        instances[id].goTo(slideIndex);
      }
    }
  });

  document.addEventListener("shopify:block:deselect", function (event) {
    var sectionEl = event.target.closest(SELECTOR);
    if (sectionEl) {
      var id = sectionEl.dataset.sectionId;
      if (instances[id] && instances[id].autoplay) {
        instances[id]._startAutoplay();
      }
    }
  });
})();
