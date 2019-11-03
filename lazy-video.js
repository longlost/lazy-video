/**
 * `lazy-video`
 * 
 *  auto lazy-loads, loads when no longer below the fold
 *  html5 video wrapper
 * 
 * 
 */
import {
  AppElement, 
  html
}                 from '@longlost/app-element/app-element.js';
import {
  isOnScreen, 
  listen,
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

      poster: String, // placeholder image url

      presentation: {
        type: Boolean,
        value: false
      },

      src: String

    };
  }


  static get observers() {
    return [
      '__srcChanged(src)'
    ];
  }


  async __srcChanged(src) {
    await isOnScreen(this);
    await this.$.spinner.show();
    this._lazySrc = src;
  }


  __autoPlayWhenVisible() {
    const video            = this.select('video');
    const {top, bottom}    = video.getBoundingClientRect();
    const screenHeight     = window.innerHeight;
    const initialTopPos    = top + window.scrollY;
    const initialBottomPos = bottom + window.scrollY;
    const topDistFromLowerScreen    = () => initialTopPos - (window.scrollY + screenHeight);
    const bottomDistFromUpperScreen = () => initialBottomPos - window.scrollY;
    let playState = false;

    listen(window, 'scroll', () => {
      window.requestAnimationFrame(() => {
        if (topDistFromLowerScreen() <= 0 && bottomDistFromUpperScreen() >= 0) {
          if (playState) { return; }
          playState = true;
          video.play();
        } 
        else {
          if (!playState) { return; }
          playState = false;
          video.pause();
        }
      });
    });
  }


  async __metadataLoaded() {
    this.fire('metadata-loaded', {src: this.src});
    await schedule();
    this.$.spinner.hide();
    if (!this.presentation) { return; }
    this.__autoPlayWhenVisible();
  }

}

window.customElements.define(LazyVideo.is, LazyVideo);
