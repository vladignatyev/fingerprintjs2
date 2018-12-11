/*
* Fingerprintjs2 2.0.0 - Modern & flexible browser fingerprint library v2
* https://github.com/Valve/fingerprintjs2
* Copyright (c) 2015 Valentin Vasilyev (valentin.vasilyev@outlook.com)
* Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
* AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
* IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
* ARE DISCLAIMED. IN NO EVENT SHALL VALENTIN VASILYEV BE LIABLE FOR ANY
* DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
* THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function (name, context, definition) {
  'use strict'
  if (typeof window !== 'undefined' && typeof window.define === 'function' && window.define.amd) { window.define(definition) } else if (typeof module !== 'undefined' && module.exports) { module.exports = definition() } else if (context.exports) { context.exports = definition() } else { context[name] = definition() }
})('Fingerprint2', this, function () {
  'use strict'

  var defaultOptions = {
    preprocessor: null,
    audio: {
      timeout: 1000,
        // On iOS 11, audio context can only be used in response to user interaction.
        // We require users to explicitly enable audio fingerprinting on iOS 11.
        // See https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
      excludeIOS11: true
    },
    fonts: {
      userDefinedFonts: [],
      extendedJsFonts: false
    },
    screen: {
       // To ensure consistent fingerprints when users rotate their mobile devices
      detectScreenOrientation: true
    },
    plugins: {
      sortPluginsFor: [/palemoon/i],
      excludeIE: false
    },
    extraComponents: [],
    excludes: {
      // Unreliable on Windows, see https://github.com/Valve/fingerprintjs2/issues/375
      'enumerateDevices': true,
      // devicePixelRatio depends on browser zoom, and it's impossible to detect browser zoom
      'pixelRatio': true,
      // DNT depends on incognito mode for some browsers (Chrome) and it's impossible to detect incognito mode
      'doNotTrack': true,
      // uses js fonts already
      'fontsFlash': true
    },
    NOT_AVAILABLE: 'NA',
    ERROR: 'ER',
    EXCLUDED: 'EX'
  }

  var each = function (obj, iterator) {
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator)
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        iterator(obj[i], i, obj)
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          iterator(obj[key], key, obj)
        }
      }
    }
  }

  var map = function (obj, iterator) {
    var results = []
    // Not using strict equality so that this acts as a
    // shortcut to checking for `null` and `undefined`.
    if (obj == null) {
      return results
    }
    if (Array.prototype.map && obj.map === Array.prototype.map) { return obj.map(iterator) }
    each(obj, function (value, index, list) {
      results.push(iterator(value, index, list))
    })
    return results
  }

  var extendSoft = function (target, source) {
    if (source == null) { return target }
    var value
    var key
    for (key in source) {
      value = source[key]
      if (value != null && !(Object.prototype.hasOwnProperty.call(target, key))) {
        target[key] = value
      }
    }
    return target
  }

  var isEnumerateDevicesSupported = function () {
    return (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
  }

  var UserAgent = function (done) {
    done(navigator.userAgent)
  }
  var languageKey = function (done, options) {
    done(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || options.NOT_AVAILABLE)
  }
  var colorDepthKey = function (done, options) {
    done(window.screen.colorDepth || options.NOT_AVAILABLE)
  }
  var deviceMemoryKey = function (done, options) {
    done(navigator.deviceMemory || options.NOT_AVAILABLE)
  }
  var pixelRatioKey = function (done, options) {
    done(window.devicePixelRatio || options.NOT_AVAILABLE)
  }
  var screenResolutionKey = function (done, options) {
    done(getScreenResolution(options))
  }
  var getScreenResolution = function (options) {
    var resolution = [window.screen.width, window.screen.height]
    if (options.screen.detectScreenOrientation) {
      resolution.sort().reverse()
    }
    return resolution
  }
  var availableScreenResolutionKey = function (done, options) {
    done(getAvailableScreenResolution(options))
  }
  var getAvailableScreenResolution = function (options) {
    if (window.screen.availWidth && window.screen.availHeight) {
      var available = [window.screen.availHeight, window.screen.availWidth]
      if (options.screen.detectScreenOrientation) {
        available.sort().reverse()
      }
      return available
    }
    // headless browsers
    return options.NOT_AVAILABLE
  }
  var timezoneOffset = function (done) {
    done(new Date().getTimezoneOffset())
  }
  var timezone = function (done, options) {
    if (window.Intl && window.Intl.DateTimeFormat) {
      done(new window.Intl.DateTimeFormat().resolvedOptions().timeZone)
      return
    }
    done(options.NOT_AVAILABLE)
  }
  var sessionStorageKey = function (done, options) {
    done(hasSessionStorage(options))
  }
  var localStorageKey = function (done, options) {
    done(hasLocalStorage(options))
  }
  var indexedDbKey = function (done, options) {
    done(hasIndexedDB(options))
  }
  var addBehaviorKey = function (done) {
      // body might not be defined at this point or removed programmatically
    done(!!(document.body && document.body.addBehavior))
  }
  var openDatabaseKey = function (done) {
    done(!!window.openDatabase)
  }
  var cpuClassKey = function (done, options) {
    done(getNavigatorCpuClass(options))
  }
  var platformKey = function (done, options) {
    done(getNavigatorPlatform(options))
  }
  var doNotTrackKey = function (done, options) {
    done(getDoNotTrack(options))
  }
  var canvasKey = function (done, options) {
    if (isCanvasSupported()) {
      done(getCanvasFp(options))
      return
    }
    done(options.NOT_AVAILABLE)
  }
  var webglKey = function (done, options) {
    if (isWebGlSupported()) {
      done(getWebglFp())
      return
    }
    done(options.NOT_AVAILABLE)
  }
  var adBlockKey = function (done) {
    done(getAdBlock())
  }
  var hasLiedLanguagesKey = function (done) {
    done(getHasLiedLanguages())
  }
  var hasLiedResolutionKey = function (done) {
    done(getHasLiedResolution())
  }
  var hasLiedOsKey = function (done) {
    done(getHasLiedOs())
  }
  var hasLiedBrowserKey = function (done) {
    done(getHasLiedBrowser())
  }

// kudos to http://www.lalit.org/lab/javascript-css-font-detect/
  var jsFontsKey = function (done, options) {
      // a font will be compared against all the three default fonts.
      // and if it doesn't match all 3 then that font is not available.
    var baseFonts = ['monospace', 'sans-serif', 'serif']

    var fontList = [
      'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
      'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style',
      'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
      'Geneva', 'Georgia',
      'Helvetica', 'Helvetica Neue',
      'Impact',
      'Lucida Bright', 'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode',
      'Microsoft Sans Serif', 'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO',
      'Palatino', 'Palatino Linotype',
      'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
      'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS',
      'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3'
    ]

    if (options.fonts.extendedJsFonts) {
      var extendedFontList = [
        'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter',
        'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Aparajita', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arabic Typesetting', 'ARCHER',
        'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'AVENIR', 'Ayuthaya', 'Bandy', 'Bangla Sangam MN', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville',
        'Baskerville Old Face', 'Batang', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bell MT', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'Big Caslon', 'BinnerD',
        'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed',
        'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Calligrapher', 'Candara',
        'CaslonOpnface BT', 'Castellar', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer',
        'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cochin', 'Colonna MT', 'Constantia', 'Cooper Black', 'Copperplate', 'Copperplate Gothic', 'Copperplate Gothic Bold',
        'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Corbel', 'Cordia New', 'CordiaUPC', 'Cornerstone', 'Coronet', 'Cuckoo', 'Curlz MT', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark',
        'DFKai-SB', 'Didot', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC',
        'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'Forte',
        'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER',
        'Futura', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Gabriola', 'Galliard BT', 'Gautami', 'Geeza Pro', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT',
        'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD',
        'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'Gujarati Sangam MN', 'Gulim', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Gurmukhi MN', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti SC', 'Heiti TC', 'HELV',
        'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Hoefler Text', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT',
        'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Jokerman', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN',
        'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Krungthep', 'Kunstler Script', 'Lao UI', 'Latha', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island',
        'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Malgun Gothic',
        'Mangal', 'Marigold', 'Marion', 'Marker Felt', 'Market', 'Marlett', 'Matisse ITC', 'Matura MT Script Capitals', 'Meiryo', 'Meiryo UI', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Tai Le',
        'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'MingLiU-ExtB', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'Mongolian Baiti',
        'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS Mincho', 'MS PMincho', 'MS Reference Specialty', 'MS UI Gothic', 'MT Extra', 'MUSEO', 'MV Boli',
        'Nadeem', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'Noteworthy', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OPTIMA', 'Oriya Sangam MN',
        'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Papyrus', 'Parchment', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Plantagenet Cherokee', 'Playbill', 'PMingLiU', 'PMingLiU-ExtB',
        'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla',
        'Santa Fe LET', 'Savoye LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood',
        'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'SimHei', 'Simplified Arabic', 'Simplified Arabic Fixed', 'SimSun', 'SimSun-ExtB', 'Sinhala Sangam MN', 'Sketch Rockwell', 'Skia', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Socket',
        'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Sylfaen', 'Synchro LET', 'System', 'Tamil Sangam MN', 'Technical', 'Teletype', 'Telugu Sangam MN', 'Tempus Sans ITC',
        'Terminal', 'Thonburi', 'Traditional Arabic', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold',
        'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Vrinda', 'Westminster', 'WHITNEY', 'Wide Latin',
        'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zapfino', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF']
      fontList = fontList.concat(extendedFontList)
    }

    fontList = fontList.concat(options.fonts.userDefinedFonts)

      // remove duplicate fonts
    fontList = fontList.filter(function (font, position) {
      return fontList.indexOf(font) === position
    })

      // we use m or w because these two characters take up the maximum width.
      // And we use a LLi so that the same matching fonts can get separated
    var testString = 'mmmmmmmmmmlli'

      // we test using 72px font size, we may use any size. I guess larger the better.
    var testSize = '72px'

    var h = document.getElementsByTagName('body')[0]

      // div to load spans for the base fonts
    var baseFontsDiv = document.createElement('div')

      // div to load spans for the fonts to detect
    var fontsDiv = document.createElement('div')

    var defaultWidth = {}
    var defaultHeight = {}

      // creates a span where the fonts will be loaded
    var createSpan = function () {
      var s = document.createElement('span')
        /*
         * We need this css as in some weird browser this
         * span elements shows up for a microSec which creates a
         * bad user experience
         */
      s.style.position = 'absolute'
      s.style.left = '-9999px'
      s.style.fontSize = testSize

        // css font reset to reset external styles
      s.style.fontStyle = 'normal'
      s.style.fontWeight = 'normal'
      s.style.letterSpacing = 'normal'
      s.style.lineBreak = 'auto'
      s.style.lineHeight = 'normal'
      s.style.textTransform = 'none'
      s.style.textAlign = 'left'
      s.style.textDecoration = 'none'
      s.style.textShadow = 'none'
      s.style.whiteSpace = 'normal'
      s.style.wordBreak = 'normal'
      s.style.wordSpacing = 'normal'

      s.innerHTML = testString
      return s
    }

      // creates a span and load the font to detect and a base font for fallback
    var createSpanWithFonts = function (fontToDetect, baseFont) {
      var s = createSpan()
      s.style.fontFamily = "'" + fontToDetect + "'," + baseFont
      return s
    }

      // creates spans for the base fonts and adds them to baseFontsDiv
    var initializeBaseFontsSpans = function () {
      var spans = []
      for (var index = 0, length = baseFonts.length; index < length; index++) {
        var s = createSpan()
        s.style.fontFamily = baseFonts[index]
        baseFontsDiv.appendChild(s)
        spans.push(s)
      }
      return spans
    }

      // creates spans for the fonts to detect and adds them to fontsDiv
    var initializeFontsSpans = function () {
      var spans = {}
      for (var i = 0, l = fontList.length; i < l; i++) {
        var fontSpans = []
        for (var j = 0, numDefaultFonts = baseFonts.length; j < numDefaultFonts; j++) {
          var s = createSpanWithFonts(fontList[i], baseFonts[j])
          fontsDiv.appendChild(s)
          fontSpans.push(s)
        }
        spans[fontList[i]] = fontSpans // Stores {fontName : [spans for that font]}
      }
      return spans
    }

      // checks if a font is available
    var isFontAvailable = function (fontSpans) {
      var detected = false
      for (var i = 0; i < baseFonts.length; i++) {
        detected = (fontSpans[i].offsetWidth !== defaultWidth[baseFonts[i]] || fontSpans[i].offsetHeight !== defaultHeight[baseFonts[i]])
        if (detected) {
          return detected
        }
      }
      return detected
    }

      // create spans for base fonts
    var baseFontsSpans = initializeBaseFontsSpans()

      // add the spans to the DOM
    h.appendChild(baseFontsDiv)

      // get the default width for the three base fonts
    for (var index = 0, length = baseFonts.length; index < length; index++) {
      defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth // width for the default font
      defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight // height for the default font
    }

      // create spans for fonts to detect
    var fontsSpans = initializeFontsSpans()

      // add all the spans to the DOM
    h.appendChild(fontsDiv)

      // check available fonts
    var available = []
    for (var i = 0, l = fontList.length; i < l; i++) {
      if (isFontAvailable(fontsSpans[fontList[i]])) {
        available.push(fontList[i])
      }
    }

      // remove spans from DOM
    h.removeChild(fontsDiv)
    h.removeChild(baseFontsDiv)
    done(available)
  }
  var pluginsComponent = function (done, options) {
    if (isIE()) {
      if (!options.plugins.excludeIE) {
        done(getIEPlugins(options))
      } else {
        done(options.EXCLUDED)
      }
    } else {
      done(getRegularPlugins(options))
    }
  }
  var getRegularPlugins = function (options) {
    if (navigator.plugins == null) {
      return options.NOT_AVAILABLE
    }

    var plugins = []
      // plugins isn't defined in Node envs.
    for (var i = 0, l = navigator.plugins.length; i < l; i++) {
      if (navigator.plugins[i]) { plugins.push(navigator.plugins[i]) }
    }

      // sorting plugins only for those user agents, that we know randomize the plugins
      // every time we try to enumerate them
    if (pluginsShouldBeSorted(options)) {
      plugins = plugins.sort(function (a, b) {
        if (a.name > b.name) { return 1 }
        if (a.name < b.name) { return -1 }
        return 0
      })
    }
    return map(plugins, function (p) {
      var mimeTypes = map(p, function (mt) {
        return [mt.type, mt.suffixes]
      })
      return [p.name, p.description, mimeTypes]
    })
  }
  var getIEPlugins = function (options) {
    var result = []
    if ((Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) || ('ActiveXObject' in window)) {
      var names = [
        'AcroPDF.PDF', // Adobe PDF reader 7+
        'Adodb.Stream',
        'AgControl.AgControl', // Silverlight
        'DevalVRXCtrl.DevalVRXCtrl.1',
        'MacromediaFlashPaper.MacromediaFlashPaper',
        'Msxml2.DOMDocument',
        'Msxml2.XMLHTTP',
        'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
        'QuickTime.QuickTime', // QuickTime
        'QuickTimeCheckObject.QuickTimeCheck.1',
        'RealPlayer',
        'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
        'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
        'Scripting.Dictionary',
        'SWCtl.SWCtl', // ShockWave player
        'Shell.UIHelper',
        'ShockwaveFlash.ShockwaveFlash', // flash plugin
        'Skype.Detection',
        'TDCCtl.TDCCtl',
        'WMPlayer.OCX', // Windows media player
        'rmocx.RealPlayer G2 Control',
        'rmocx.RealPlayer G2 Control.1'
      ]
        // starting to detect plugins in IE
      result = map(names, function (name) {
        try {
            // eslint-disable-next-line no-new
          new window.ActiveXObject(name)
          return name
        } catch (e) {
          return options.ERROR
        }
      })
    } else {
      result.push(options.NOT_AVAILABLE)
    }
    if (navigator.plugins) {
      result = result.concat(getRegularPlugins(options))
    }
    return result
  }
  var pluginsShouldBeSorted = function (options) {
    var should = false
    for (var i = 0, l = options.plugins.sortPluginsFor.length; i < l; i++) {
      var re = options.plugins.sortPluginsFor[i]
      if (navigator.userAgent.match(re)) {
        should = true
        break
      }
    }
    return should
  }
  var touchSupportKey = function (done) {
    done(getTouchSupport())
  }
  var hardwareConcurrencyKey = function (done, options) {
    done(getHardwareConcurrency(options))
  }
  var hasSessionStorage = function (options) {
    try {
      return !!window.sessionStorage
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  }

// https://bugzilla.mozilla.org/show_bug.cgi?id=781447
  var hasLocalStorage = function (options) {
    try {
      return !!window.localStorage
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  }
  var hasIndexedDB = function (options) {
    try {
      return !!window.indexedDB
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  }
  var getHardwareConcurrency = function (options) {
    if (navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency
    }
    return options.NOT_AVAILABLE
  }
  var getNavigatorCpuClass = function (options) {
    return navigator.cpuClass || options.NOT_AVAILABLE
  }
  var getNavigatorPlatform = function (options) {
    if (navigator.platform) {
      return navigator.platform
    } else {
      return options.NOT_AVAILABLE
    }
  }
  var getDoNotTrack = function (options) {
    if (navigator.doNotTrack) {
      return navigator.doNotTrack
    } else if (navigator.msDoNotTrack) {
      return navigator.msDoNotTrack
    } else if (window.doNotTrack) {
      return window.doNotTrack
    } else {
      return options.NOT_AVAILABLE
    }
  }
// This is a crude and primitive touch screen detection.
// It's not possible to currently reliably detect the  availability of a touch screen
// with a JS, without actually subscribing to a touch event.
// http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
// https://github.com/Modernizr/Modernizr/issues/548
// method returns an array of 3 values:
// maxTouchPoints, the success or failure of creating a TouchEvent,
// and the availability of the 'ontouchstart' property

  var getTouchSupport = function () {
    var maxTouchPoints = 0
    var touchEvent
    if (typeof navigator.maxTouchPoints !== 'undefined') {
      maxTouchPoints = navigator.maxTouchPoints
    } else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
      maxTouchPoints = navigator.msMaxTouchPoints
    }
    try {
      document.createEvent('TouchEvent')
      touchEvent = true
    } catch (_) {
      touchEvent = false
    }
    var touchStart = 'ontouchstart' in window
    return [maxTouchPoints, touchEvent, touchStart]
  }
// https://www.browserleaks.com/canvas#how-does-it-work

  var getCanvasFp = function (options) {
    var result = []
      // Very simple now, need to make it more complex (geo shapes etc)
    var canvas = document.createElement('canvas')
    if (options.debug) {
      document.body.appendChild(canvas)
    }
    var w = 380, h = 65

    canvas.width = w
    canvas.height = h
    canvas.style.display = 'inline'
    var ctx = canvas.getContext('2d')
      // detect browser support of canvas winding
      // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
      // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
    ctx.rect(0, 0, 10, 10)
    ctx.rect(2, 2, 6, 6)
    result.push({'winding': ((ctx.isPointInPath(5, 5, 'evenodd') === false) ? 'yes' : 'no')})

    if (options.canvasfp) {
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
        // https://github.com/Valve/fingerprintjs2/issues/66
      if (options.dontUseFakeFontInCanvas) {
        ctx.font = '11pt Arial'
      } else {
        ctx.font = '11pt no-real-font-123'
      }
      ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.2)'
      ctx.font = '18pt Arial'
      ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 4, 45)

        // canvas blending
        // http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
        // http://jsfiddle.net/NDYV8/16/
      var baseSize = 20
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = 'rgb(255,0,255)'
      ctx.beginPath()
      ctx.arc(baseSize, baseSize, baseSize, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(0,255,255)'
      ctx.beginPath()
      ctx.arc(baseSize * 2, baseSize, baseSize, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(255,255,0)'
      ctx.beginPath()
      ctx.arc(baseSize * 1.5, baseSize * 2, baseSize, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(255,0,255)'
        // canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // http://jsfiddle.net/NDYV8/19/
      ctx.arc(baseSize * 1.5, baseSize * 1.5, baseSize * 1.5, 0, Math.PI * 2, true)
      ctx.arc(baseSize * 1.5, baseSize * 1.5, baseSize * 0.5, 0, Math.PI * 2, true)
      ctx.fill('evenodd')

      var imageData = ctx.getImageData(0, 0, w, h)
      //todo: performance
      result.push({'fp': Fingerprint2.x64hash128(JSON.stringify(imageData.data))})
    }
    return result
  }
  var getWebglFp = function () {
    var gl
    var fa2s = function (fa) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      return [fa[0], fa[1]]
    }
    var maxAnisotropy = function (gl) {
      var ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic')
      if (ext) {
        var anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
        if (anisotropy === 0) {
          anisotropy = 2
        }
        return anisotropy
      } else {
        return null
      }
    }

    gl = getWebglCanvas()
    if (!gl) { return null }


      // WebGL fingerprinting is a combination of techniques, found in MaxMind antifraud script & Augur fingerprinting.
      // First it draws a gradient object with shaders and convers the image to the Base64 string.
      // Then it enumerates all WebGL extensions & capabilities and appends them to the Base64 string, resulting in a huge WebGL string, potentially very unique on each device
      // Since iOS supports webgl starting from version 8.1 and 8.1 runs on several graphics chips, the results may be different across ios devices, but we need to verify it.
    var result = []

    result.push({'max viewport dims': fa2s(gl.getParameter(gl.MAX_VIEWPORT_DIMS))})
    result.push({'aliased line width range': fa2s(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE))})
    result.push({'aliased point size range': fa2s(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE))})

    gl.clearColor(1.0, 1.0, 1.0, 1.0)
    gl.disable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    var vShaderTemplate = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}'
    var fShaderTemplate = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}'
    var vertexPosBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer)
    var vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0])
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    vertexPosBuffer.itemSize = 3
    vertexPosBuffer.numItems = 3
    var program = gl.createProgram()
    var vshader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vshader, vShaderTemplate)
    gl.compileShader(vshader)
    var fshader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fshader, fShaderTemplate)
    gl.compileShader(fshader)
    gl.attachShader(program, vshader)
    gl.attachShader(program, fshader)
    gl.linkProgram(program)
    gl.useProgram(program)
    program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex')
    program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset')
    gl.enableVertexAttribArray(program.vertexPosArray)
    gl.vertexAttribPointer(program.vertexPosAttrib, vertexPosBuffer.itemSize, gl.FLOAT, !1, 0, 0)
    gl.uniform2f(program.offsetUniform, 1, 1)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems)

    if (options.webglfp) {
      var j = new Uint8Array(256*128*4)
      gl.readPixels(0, 0, 256, 128, gl.RGBA, gl.UNSIGNED_BYTE, j)

      // todo: performance

      var te = JSON.stringify(j)

      var i = te.replace(/,?"[0-9]+":/g, "")
      if ("" == i.replace(/^{[0]+}$/g, "")) {
        result.push({'fp onlyzeros': true});
      } else {
        result.push({'fp onlyzeros': false});
      }

      result.push({'fp': Fingerprint2.x64hash128(te)})
    }

    result.push({'extensions': (gl.getSupportedExtensions() || [])})

    result.push({'alpha bits': gl.getParameter(gl.ALPHA_BITS)})
    result.push({'antialiasing': (gl.getContextAttributes().antialias ? 'yes' : 'no')})
    result.push({'blue bits': gl.getParameter(gl.BLUE_BITS)})
    result.push({'depth bits': gl.getParameter(gl.DEPTH_BITS)})
    result.push({'green bits': gl.getParameter(gl.GREEN_BITS)})


    result.push({'max anisotropy': maxAnisotropy(gl)})
    result.push({'max combined texture image units': gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)})
    result.push({'max cube map texture size': gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)})
    result.push({'max fragment uniform vectors': gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)})
    result.push({'max render buffer size': gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)})
    result.push({'max texture image units': gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)})
    result.push({'max texture size': gl.getParameter(gl.MAX_TEXTURE_SIZE)})
    result.push({'max varying vectors': gl.getParameter(gl.MAX_VARYING_VECTORS)})
    result.push({'max vertex attribs': gl.getParameter(gl.MAX_VERTEX_ATTRIBS)})
    result.push({'max vertex texture image units': gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)})
    result.push({'max vertex uniform vectors': gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)})
    result.push({'red bits': gl.getParameter(gl.RED_BITS)})
    result.push({'renderer': gl.getParameter(gl.RENDERER)})
    result.push({'shading language version': gl.getParameter(gl.SHADING_LANGUAGE_VERSION)})
    result.push({'stencil bits': gl.getParameter(gl.STENCIL_BITS)})
    result.push({'vendor': gl.getParameter(gl.VENDOR)})
    result.push({'version': gl.getParameter(gl.VERSION)})

    try {
        // Add the unmasked vendor and unmasked renderer if the debug_renderer_info extension is available
      var extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (extensionDebugRendererInfo) {
        result.push({'unmasked vendor': gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL)})
        result.push({'unmasked renderer': gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)})
      }
    } catch (e) { /* squelch */ }

    if (!gl.getShaderPrecisionFormat) {
      return result
    }

    var shaders = {};

    each(['FLOAT', 'INT'], function (numType) {
      each(['VERTEX', 'FRAGMENT'], function (shader) {
        each(['HIGH', 'MEDIUM', 'LOW'], function (numSize) {
          var k = shader[0] + numSize[0] + numType[0];
          shaders[k] = map(['precision', 'rangeMin', 'rangeMax'], function (key) {
            return gl.getShaderPrecisionFormat(gl[shader + '_SHADER'], gl[numSize + '_' + numType])[key]
          })
        })
      })
    })

    result.push({'shaders': shaders})
    var resultDict = {};
    for (var i in result) {
      for (var k in result[i]) {
        resultDict[k] = result[i][k]
      }
    }
    return resultDict
  }
  var getAdBlock = function () {
    var ads = document.createElement('div')
    ads.innerHTML = '&nbsp;'
    ads.className = 'adsbox'
    var result = false
    try {
        // body may not exist, that's why we need try/catch
      document.body.appendChild(ads)
      result = document.getElementsByClassName('adsbox')[0].offsetHeight === 0
      document.body.removeChild(ads)
    } catch (e) {
      result = false
    }
    return result
  }
  var getHasLiedLanguages = function () {
      // We check if navigator.language is equal to the first language of navigator.languages
    if (typeof navigator.languages !== 'undefined') {
      try {
        var firstLanguages = navigator.languages[0].substr(0, 2)
        if (firstLanguages !== navigator.language.substr(0, 2)) {
          return true
        }
      } catch (err) {
        return true
      }
    }
    return false
  }
  var getHasLiedResolution = function () {
    return window.screen.width < window.screen.availWidth || window.screen.height < window.screen.availHeight
  }
  var getHasLiedOs = function () {
    var userAgent = navigator.userAgent.toLowerCase()
    var oscpu = navigator.oscpu
    var platform = navigator.platform.toLowerCase()
    var os
      // We extract the OS from the user agent (respect the order of the if else if statement)
    if (userAgent.indexOf('windows phone') >= 0) {
      os = 'Windows Phone'
    } else if (userAgent.indexOf('win') >= 0) {
      os = 'Windows'
    } else if (userAgent.indexOf('android') >= 0) {
      os = 'Android'
    } else if (userAgent.indexOf('linux') >= 0) {
      os = 'Linux'
    } else if (userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0) {
      os = 'iOS'
    } else if (userAgent.indexOf('mac') >= 0) {
      os = 'Mac'
    } else {
      os = 'Other'
    }
      // We detect if the person uses a mobile device
    var mobileDevice = (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0))

    if (mobileDevice && os !== 'Windows Phone' && os !== 'Android' && os !== 'iOS' && os !== 'Other') {
      return true
    }

      // We compare oscpu with the OS extracted from the UA
    if (typeof oscpu !== 'undefined') {
      oscpu = oscpu.toLowerCase()
      if (oscpu.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
        return true
      } else if (oscpu.indexOf('linux') >= 0 && os !== 'Linux' && os !== 'Android') {
        return true
      } else if (oscpu.indexOf('mac') >= 0 && os !== 'Mac' && os !== 'iOS') {
        return true
      } else if ((oscpu.indexOf('win') === -1 && oscpu.indexOf('linux') === -1 && oscpu.indexOf('mac') === -1) !== (os === 'Other')) {
        return true
      }
    }

      // We compare platform with the OS extracted from the UA
    if (platform.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
      return true
    } else if ((platform.indexOf('linux') >= 0 || platform.indexOf('android') >= 0 || platform.indexOf('pike') >= 0) && os !== 'Linux' && os !== 'Android') {
      return true
    } else if ((platform.indexOf('mac') >= 0 || platform.indexOf('ipad') >= 0 || platform.indexOf('ipod') >= 0 || platform.indexOf('iphone') >= 0) && os !== 'Mac' && os !== 'iOS') {
      return true
    } else if ((platform.indexOf('win') === -1 && platform.indexOf('linux') === -1 && platform.indexOf('mac') === -1) !== (os === 'Other')) {
      return true
    }

    return typeof navigator.plugins === 'undefined' && os !== 'Windows' && os !== 'Windows Phone'
  }
  var getHasLiedBrowser = function () {
    var userAgent = navigator.userAgent.toLowerCase()
    var productSub = navigator.productSub

      // we extract the browser from the user agent (respect the order of the tests)
    var browser
    if (userAgent.indexOf('firefox') >= 0) {
      browser = 'Firefox'
    } else if (userAgent.indexOf('opera') >= 0 || userAgent.indexOf('opr') >= 0) {
      browser = 'Opera'
    } else if (userAgent.indexOf('chrome') >= 0) {
      browser = 'Chrome'
    } else if (userAgent.indexOf('safari') >= 0) {
      browser = 'Safari'
    } else if (userAgent.indexOf('trident') >= 0) {
      browser = 'Internet Explorer'
    } else {
      browser = 'Other'
    }

    if ((browser === 'Chrome' || browser === 'Safari' || browser === 'Opera') && productSub !== '20030107') {
      return true
    }

      // eslint-disable-next-line no-eval
    var tempRes = eval.toString().length
    if (tempRes === 37 && browser !== 'Safari' && browser !== 'Firefox' && browser !== 'Other') {
      return true
    } else if (tempRes === 39 && browser !== 'Internet Explorer' && browser !== 'Other') {
      return true
    } else if (tempRes === 33 && browser !== 'Chrome' && browser !== 'Opera' && browser !== 'Other') {
      return true
    }

      // We create an error to see how it is handled
    var errFirefox
    try {
        // eslint-disable-next-line no-throw-literal
      throw 'a'
    } catch (err) {
      try {
        err.toSource()
        errFirefox = true
      } catch (errOfErr) {
        errFirefox = false
      }
    }
    return errFirefox && browser !== 'Firefox' && browser !== 'Other'
  }
  var isCanvasSupported = function () {
    var elem = document.createElement('canvas')
    return !!(elem.getContext && elem.getContext('2d'))
  }
  var isWebGlSupported = function () {
      // code taken from Modernizr
    if (!isCanvasSupported()) {
      return false
    }

    var glContext = getWebglCanvas()
    return !!window.WebGLRenderingContext && !!glContext
  }
  var isIE = function () {
    if (navigator.appName === 'Microsoft Internet Explorer') {
      return true
    } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { // IE 11
      return true
    }
    return false
  }
  var getWebglCanvas = function () {
    if (!window.glcanvas) {
      window.glcanvas = document.createElement('canvas')
      var canvas = window.glcanvas
      canvas.width = 256
      canvas.height = 128
      if (options.debug) {
        document.body.appendChild(canvas)
      }
    }

    var gl = null
    try {
      gl = window.glcanvas.getContext('webgl') || window.glcanvas.getContext('experimental-webgl')
    } catch (e) { /* squelch */ }
    if (!gl) { gl = null }
    return gl
  }

  var components = [
    {key: 'userAgent', getData: UserAgent},
    {key: 'language', getData: languageKey},
    {key: 'colorDepth', getData: colorDepthKey},
    {key: 'deviceMemory', getData: deviceMemoryKey},
    {key: 'pixelRatio', getData: pixelRatioKey},
    {key: 'hardwareConcurrency', getData: hardwareConcurrencyKey},
    {key: 'screenResolution', getData: screenResolutionKey},
    {key: 'availableScreenResolution', getData: availableScreenResolutionKey},
    {key: 'timezoneOffset', getData: timezoneOffset},
    {key: 'timezone', getData: timezone},
    {key: 'sessionStorage', getData: sessionStorageKey},
    {key: 'localStorage', getData: localStorageKey},
    {key: 'indexedDb', getData: indexedDbKey},
    {key: 'addBehavior', getData: addBehaviorKey},
    {key: 'openDatabase', getData: openDatabaseKey},
    {key: 'cpuClass', getData: cpuClassKey},
    {key: 'platform', getData: platformKey},
    {key: 'doNotTrack', getData: doNotTrackKey},
    {key: 'plugins', getData: pluginsComponent},
    {key: 'canvas', getData: canvasKey},
    {key: 'webgl', getData: webglKey},
    {key: 'adBlock', getData: adBlockKey},
    {key: 'hasLiedLanguages', getData: hasLiedLanguagesKey},
    {key: 'hasLiedResolution', getData: hasLiedResolutionKey},
    {key: 'hasLiedOs', getData: hasLiedOsKey},
    {key: 'hasLiedBrowser', getData: hasLiedBrowserKey},
    {key: 'touchSupport', getData: touchSupportKey},
    {key: 'fonts', getData: jsFontsKey, pauseBefore: true}
  ]

  var Fingerprint2 = function (options) {
  }

  Fingerprint2.get = function (options, callback) {
    if (!callback) {
      callback = options
      options = {}
    } else if (!options) {
      options = {}
    }

    function callbackWrap(fpdata) {
      var f = {}
      for (var i in fpdata) {
        f[fpdata[i].key] = fpdata[i].value
      }
      callback(f)
    }

    extendSoft(options, defaultOptions)
    options.components = options.extraComponents.concat(components)

    var keys = {
      data: [],
      addPreprocessedComponent: function (key, value) {
        if (typeof options.preprocessor === 'function') {
          value = options.preprocessor(key, value)
        }
        keys.data.push({key: key, value: value})
      }
    }

    var i = -1
    var chainComponents = function (alreadyWaited) {
      i += 1
      if (i >= options.components.length) { // on finish
        callbackWrap(keys.data)
        return
      }
      var component = options.components[i]

      if (options.excludes[component.key]) {
        chainComponents(false) // skip
        return
      }

      if (!alreadyWaited && component.pauseBefore) {
        i -= 1
        setTimeout(function () {
          chainComponents(true)
        }, 1)
        return
      }

      try {
        component.getData(function (value) {
          keys.addPreprocessedComponent(component.key, value)
          chainComponents(false)
        }, options)
      } catch (error) {
        // main body error
        keys.addPreprocessedComponent(component.key, String(error))
        chainComponents(false)
      }
    }

    chainComponents(false)
  }

  Fingerprint2.getPromise = function (options) {
    return new Promise(function (resolve, reject) {
      Fingerprint2.get(options, resolve)
    })
  }

  Fingerprint2.getV18 = function (options, callback) {
    if (callback == null) {
      callback = options
      options = {}
    }
    return Fingerprint2.get(options, function (components) {
      var newComponents = []
      for (var i = 0; i < components.length; i++) {
        var component = components[i]
        if ((component.value === options.NOT_AVAILABLE) || (component.value === 'not available')) {
          newComponents.push({key: component.key, value: 'unknown'})
        } else if (component.key === 'plugins') {
          newComponents.push({key: 'plugins',
            value: map(component.value, function (p) {
              var mimeTypes = map(p[2], function (mt) {
                if (mt.join) { return mt.join('~') }
                return mt
              }).join(',')
              return [p[0], p[1], mimeTypes].join('::')
            })})
        } else if (['canvas', 'webgl'].indexOf(component.key) !== -1) {
          newComponents.push({key: component.key, value: component.value.join('~')})
        } else if (['sessionStorage', 'localStorage', 'indexedDb', 'addBehavior', 'openDatabase'].indexOf(component.key) !== -1) {
          if (component.value) {
            newComponents.push({key: component.key, value: 1})
          } else {
            // skip
            continue
          }
        } else {
          if (component.value) {
            newComponents.push(component.value.join ? {key: component.key, value: component.value.join(';')} : component)
          } else {
            newComponents.push({key: component.key, value: component.value})
          }
        }
      }
      var murmur = Fingerprint2.x64hash128(map(newComponents, function (component) { return component.value }).join('~~~'), 31)
      callback(murmur, newComponents)
    })
  }

  Fingerprint2.x64hash128 = undefined
  Fingerprint2.VERSION = '2.0.0'
  return Fingerprint2
})
