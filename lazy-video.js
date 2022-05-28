
/**
  * `lazy-video`
  * 
  *   Auto lazy-loads when visible on screen.
  *   html5 video wrapper.
  * 
  *
  * @customElement
  * @polymer
  * @demo demo/index.html
  *
  * 
  **/


import {AppElement} from '@longlost/app-core/app-element.js';

import {
  consumeEvent,
  isOnScreen,
  naturals, 
  schedule,
  wait
} from '@longlost/app-core/utils.js';

import template from './lazy-video.html';
import '@longlost/app-spinner/app-spinner.js';


class LazyVideo extends AppElement {

  static get is() { return 'lazy-video'; }

  static get template() {
    return template;
  }


  static get properties() {
    return {

      // Sets the proportion of width to height.
      // 'classic', 'fill', 'landscape', 'portrait' or 'square'
      aspectRatio: {
        type: String,
        value: 'landscape'
      },

      // Sets or removes HTML5 video 'controls' attribute.
      controls: Boolean,

      error: Boolean,

      firstFrameLoaded: Boolean,

      metadataLoaded: Boolean,

      // Set this to a local blob url for fast initial loading.
      placeholder: String,

      // Placeholder image url. 
      // Optional.
      poster: String,

      posterError: Boolean,

      posterLoaded: Boolean,

      // When set to true, video will 
      // autoplay with no controls, 
      // on mute and loop continuously.
      // Optional.
      presentation: {
        type: Boolean,
        value: false
      },

      // Similar to image sizing.
      sizing: {
        type: String,
        value: 'cover' // Or 'contain'.
      },

      // Video source url.
      src: String,

      // The distance in pixels to pad
      // to the carousel trigger threshold.
      // For instance, 0 would mean that the
      // next lazy image would not start to download
      // until a single pixel intersects the edge of
      // the carousel.
      // Or 128 means that the image would start to
      // download 128px before the next image comes
      // into view.
      // Optional.
      trigger: {
        type: Number,
        value: 0
      },

      // Cached IntersectionObserver instance.
      // Used to unobserve and cleanup when not needed.
      _intersectionObserver: Object,

      // Set after element comes into view on screen.
      _lazyPoster: String,

      // Set after element comes into view on screen.
      _lazySrc: String,

      // <video> tag ref.
      _videoEl: Object

    };
  }


  static get observers() {
    return [
      '__controlsChanged(controls, _videoEl)',
      '__errorChanged(error)',
      '__firstFrameLoadedChanged(firstFrameLoaded)',
      '__metadataLoadedChanged(metadataLoaded)',
      '__placeholderSrcChanged(placeholder, src, trigger, _videoEl)',
      '__posterChanged(poster, trigger, _videoEl)',
      '__posterErrorChanged(posterError)',
      '__posterLoadedChanged(posterLoaded)',
      '__presentationChanged(presentation)'
    ];
  }


  disconnectedCallback() {

    super.disconnectedCallback();

    this.__unobserve();
  }


  __controlsChanged(controls, el) {

    // Noop unless this property is explicitly set by consumer.
    if (typeof controls !== 'boolean' || !el) { return; }

    if (controls) {
      el.setAttribute('controls', 'true');
    }
    else {
      el.removeAttribute('controls');
    }
  }


  __errorChanged(error) {

    this.fire('lazy-video-error-changed', {value: error});
  }


  __firstFrameLoadedChanged(loaded) {

    this.fire('lazy-video-first-frame-loaded-changed', {value: loaded});
  }


  __metadataLoadedChanged(loaded) {

    this.fire('lazy-video-metadata-loaded-changed', {value: loaded});
  }


  async __placeholderSrcChanged(placeholder, src, trigger, el) {

    try {

      this.error            = false;
      this.firstFrameLoaded = false;
      this.metadataLoaded   = false;

      if ((!placeholder && !src) || !el) { 
        this._lazySrc = '#';
        return; 
      }

      await isOnScreen(this, trigger);

      if (!this.poster) {

        // Fade in.
        this.style['opacity'] = '1';

        await this.$.spinner.show();

        // Smooth out the spinner show/hide timing for fast connections.
        await wait(300); 
      }

      // NOT using closure values here to work
      // correctly within template repeaters
      // where data can be changed by the time the 
      // above schedule and isOnScreen have resolved.
      
      if (this.placeholder && (!this.src || this.src === '#')) {
        this._lazySrc = this.placeholder;
      }
      else if (!this.poster && this.src !== '#') {  

        // Safari Hack!!!
        // Adding the '#t=0.1' string to the end of the
        // src url tells the browser to start at the
        // first frame. This makes Safari show the first
        // frame as a poster, which is the default
        // behavior in other browsers.
        this._lazySrc = `${this.src}#t=0.1`; // Safari Hack!!!  
      }
      else {
        this._lazySrc = this.src || '#';
      }
    }
    catch (error) {
      if (error === 'Element removed.') { return; }
      console.error(error);

      this.error = true;
    }
  }


  async __posterChanged(poster, trigger, el) {

    try {

      this.posterLoaded = false;
      this.posterError  = false;

      if (!poster || !el) { 
        this._lazyPoster  = '#';

        return; 
      }

      await isOnScreen(this, trigger);

      // NOT using closure values here to work
      // correctly within template repeaters
      // where data can be changed by the time the 
      // above schedule and isOnScreen have resolved.

      this._lazyPoster = this.poster;

      // Wait for poster to load then fade in.
      // Only using the 'naturals' function for
      // its image load timing.
      await naturals(this.poster);

      this.posterLoaded = true;
    }
    catch (error) {
      if (error === 'Element removed.') { return; }

      console.error(error);

      this.posterError = true;
    }
    finally {
      this.style['opacity'] = '1';
    }
  }


  __posterErrorChanged(error) {

    this.fire('lazy-video-poster-error-changed', {value: error});
  }


  __posterLoadedChanged(loaded) {

    this.fire('lazy-video-poster-loaded-changed', {value: loaded});
  }


  __presentationChanged(presentation) {

    if (!presentation) {
      this.__unobserve();
    }
  }


  __domChangeHandler(event) {

    consumeEvent(event);

    this._videoEl = this.select('video');
  }


  __errorHandler(event) {

    consumeEvent(event);

    this.error = true;
  }


  __autoPlayWhenVisible() {

    const options = {
      root:        null, // 'null' sets root to device viewport.
      rootMargin: `${this.trigger}px`,
      threshold:   0.75
    };

    const callback = entries => {
      const {isIntersecting} = entries[0];

      if (isIntersecting) {
        this._videoEl.play();
      }
      else {
        this._videoEl.pause();
      }
    };

    this._intersectionObserver = 
      new window.IntersectionObserver(callback, options);
    this._intersectionObserver.observe(this);
  }


  async __firstFrameLoadedHandler(event) {

    consumeEvent(event);

    this.firstFrameLoaded = true;

    await schedule();
    await this.$.spinner.hide();

    if (this.presentation) {
      this.__autoPlayWhenVisible();
    }
  }

  // WARNING - DO NOT USE 'event.stopImmediatePropagation', 
  //           'hijackEvent' OR 'consumeEvent' here as it 
  //           will prevent Chrome from enabling certain
  //           controls, such as mute and fullscreen buttons.
  __metadataLoadedHandler(event) {

    event.stopPropagation();

    this.metadataLoaded = true;
  }


  __unobserve() {
    
    if (this._intersectionObserver) {
      this._intersectionObserver.unobserve(this);
    }
  }

}

window.customElements.define(LazyVideo.is, LazyVideo);
