
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


import {
  AppElement, 
  html
}                 from '@longlost/app-element/app-element.js';
import {
  consumeEvent,
  isOnScreen, 
  schedule,
  wait
}                 from '@longlost/utils/utils.js';
import htmlString from './lazy-video.html';
import '@longlost/app-spinner/app-spinner.js';


class LazyVideo extends AppElement {
  static get is() { return 'lazy-video'; }

  static get template() {
    return html([htmlString]);
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

      // Set this to a local blob url for fast initial loading.
      placeholder: String,

      // Placeholder image url. 
      // Optional.
      poster: String, 

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
      '__presentationChanged(presentation)',
      '__placeholderSrcChanged(placeholder, src, trigger, _videoEl)',
      '__posterChanged(poster, trigger, _videoEl)'
    ];
  }


  disconnectedCallback() {
    super.connectedCallback();

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


  async __placeholderSrcChanged(placeholder, src, trigger, el) {
    try {

      if ((!placeholder && !src) || !el) { 
        this._lazySrc = '#';
        return; 
      }

      await isOnScreen(this, trigger);

      if (!this.poster) {
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
    }
  }


  async __posterChanged(poster, trigger, el) {
    try {

      if (!poster || !el) { 
        this._lazyPoster = '#';
        return; 
      }

      await isOnScreen(this, trigger);

      // NOT using closure values here to work
      // correctly within template repeaters
      // where data can be changed by the time the 
      // above schedule and isOnScreen have resolved.

      this._lazyPoster = this.poster;
    }
    catch (error) {
      if (error === 'Element removed.') { return; }
      console.error(error);
    }
  }


  __presentationChanged(presentation) {
    if (!presentation) {
      this.__unobserve();
    }
  }


  __onDomChange() {
    this._videoEl = this.select('video');
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


  async __firstFrameLoaded(event) {
    consumeEvent(event);

    this.fire('lazy-video-first-frame-loaded', {src: this.src});

    await schedule();
    await this.$.spinner.hide();

    if (this.presentation) {
      this.__autoPlayWhenVisible();
    }
  }


  __metadataLoaded(event) {
    consumeEvent(event);

    this.fire('lazy-video-metadata-loaded', {src: this.src});
  }


  __unobserve() {
    if (this._intersectionObserver) {
      this._intersectionObserver.unobserve(this);
    }
  }

}

window.customElements.define(LazyVideo.is, LazyVideo);
