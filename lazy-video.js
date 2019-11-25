
/**
  * `lazy-video`
  * 
  *   Auto lazy-loads when visible on screen.
  *   html5 video wrapper.
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
  schedule
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
      // 'classic', 'landscape', 'portrait' or 'square'
      aspectRatio: {
        type: String,
        value: 'landscape'
      },
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
      _lazySrc: String,
      // True when <template is="dom-if"> is done stamping.
      _stamped: {
        type: Boolean,
        value: false
      }

    };
  }


  static get observers() {
    return [
      '__presentationChanged(presentation)',
      '__placeholderSrcChanged(placeholder, src, poster, trigger, _stamped)'
    ];
  }


  disconnectedCallback() {
    this.__unobserve();
  }


  async __placeholderSrcChanged(placeholder, src, poster, trigger, stamped) {
    try {
      if ((!placeholder && !src) || !stamped) { return; }

      await isOnScreen(this, trigger);
      await this.$.spinner.show();

      if (placeholder && (!src || src === '#')) {
        this._lazySrc = placeholder;
      }
      else if (!poster && src !== '#') {        
        // Safari Hack!!!
        // Adding the '#t=0.001' string to the end of the
        // src url tells the browser to start at the
        // first frame. This makes Safari show the first
        // frame as a poster, which is the default
        // behavior in other browsers.
        this._lazySrc = `${src}#t=0.001`; // Safari Hack!!!  
      }
      else {
        this._lazySrc = src || '#';
      } 
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
    const videoEl = this.select('video');
    this._stamped = videoEl ? true : false;
  }


  __autoPlayWhenVisible() {
    let playState = false;
    const video   = this.select('video');

    const options = {
      root:        null, // 'null' sets root to device viewport.
      rootMargin: `${this.trigger}px`,
      threshold:   0.75
    };

    const callback = entries => {
      const {isIntersecting} = entries[0];

      if (isIntersecting) {
        if (playState) { return; }
        playState = true;
        video.play();
      }
      else {
        if (!playState) { return; }
        playState = false;
        video.pause();
      }
    };

    this._intersectionObserver = 
      new window.IntersectionObserver(callback, options);
    this._intersectionObserver.observe(this);
  }


  async __metadataLoaded(event) {
    consumeEvent(event);
    this.fire('lazy-video-metadata-loaded', {src: this.src});
    await schedule();
    await this.$.spinner.hide();

    if (this.presentation) {
      this.__autoPlayWhenVisible();
    }
  }


  __unobserve() {
    if (this._intersectionObserver) {
      this._intersectionObserver.unobserve(this);
    }
  }

}

window.customElements.define(LazyVideo.is, LazyVideo);
