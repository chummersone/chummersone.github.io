/**
 * Matrix defining which parameters are available for a given filter type.
 */
const enableMatrix = {
    lowpass: { Q: true, gain: false },
    highpass: { Q: true, gain: false },
    bandpass: { Q: true, gain: false },
    lowshelf: { Q: false, gain: true },
    highshelf: { Q: false, gain: true },
    peaking: { Q: true, gain: true },
    notch: { Q: true, gain: false },
}

/**
 * Convert a frequency in Hz to mels.
 *
 * @param {number} f Frequency in Hz.
 * @return {number} Frequency in mels.
 */
function toMel(f) {
    return 2595 * Math.log10(1 + (f / 700))
}

/**
 * Convert a frequency in mels to Hz.
 *
 * @param {number} m Frequency in mels.
 * @return {number} Frequency in Hz.
 */
function fromMel(m) {
    return 700 * ((10 ** (m / 2595)) - 1)
}

/**
 * Callback to perform no conversion on the specified number.
 *
 * @param {number} x The input number.
 * @return {number} The unmodified input.
 */
function doNothing(x) {
    return x
}

/**
 * Class for controlling the playback of an audio file.
 */
class AudioFile {

    /**
     *  Creates an instance of AudioFile.
     * @param {File} file The File object representing the user file.
     * @param {AudioContext} audioCtx The active audio context used to play back the file.
     * @param {AudioNode} audioNode The audio node to which the file should be associated.
     * @memberof AudioFile
     */
    constructor(file, audioCtx, audioNode) {
        this.audioCtx = audioCtx
        this.audioNode = audioNode
        this.file = file
        this.objectURL = URL.createObjectURL(file)
    }

    /**
     * Play the audio file.
     * @memberof AudioFile
     */
    play() {
        this.audioNode.src = this.objectURL
        let promise = this.audioNode.play()
        if (promise) {
            // Older browsers may not return a promise, according to the MDN website
            promise.catch((error) => {
                console.log(error)
                if (error.code !== 20) {
                    window.alert("Error loading audio file.\n\nTry a different file, or a different browser.")
                }
            })
        }
        this.audioCtx.resume()
    }

    /**
     * Stop audio file playback.
     * @memberof AudioFile
     */
    stop() {
        this.audioNode.pause()
        this.audioNode.currentTime = 0
    }

}

/**
 * Class for managing a playlist of audio files.
 */
class Playlist {

    /** ID of the element containing the playlist items. */
    #controlID = "playlistControl"

    /**
     *  Creates an instance of Playlist.
     * @param {string} containerID ID of the element containing the playlist.
     * @memberof Playlist
     */
    constructor(containerID) {
        this.containerID = containerID
        this.files = []
        this.nowPlaying = null
        this.playlistIsEmpty()
    }

    /**
     * Handling of an empty playlist.
     * @memberof Playlist
     */
    playlistIsEmpty() {
        const group = document.getElementById(this.containerID)
        const info = document.createElement("p")
        info.innerHTML = 'Click "Choose Files" or drop audio files here<br><br>Note that different browsers <a href="https://caniuse.com/?search=audio%20format">support different audio file formats</a>'
        info.id = "playlistInfo"
        group.append(info)
        const controls = document.getElementById(this.#controlID)
        if (controls) {
            controls.remove()
        }
    }

    /**
     * Add an audio file to the playlist.
     *
     * @param {AudioFile} audioFile The audio file object to add.
     * @memberof Playlist
     */
    addFile(audioFile) {
        const info = document.getElementById("playlistInfo")
        let controls
        if (info) {
            // Remove instructions shown when playlist is empty
            info.remove()
            controls = document.createElement("div")
            controls.id = this.#controlID
            controls.className = "control"
            document.getElementById(this.containerID).append(controls)
        }

        // Add the file to the playlist
        this.files.push(audioFile)

        // Add the controls and text for the audio file
        const trackControls = document.createElement("div")
        trackControls.className = "trackControls"

        const trackName = document.createElement("div")
        trackName.className = "trackName"
        trackName.innerHTML = "<span>" + audioFile.file.name + "</span>"

        const playButton = document.createElement("button")
        playButton.title = "Play this track"
        playButton.innerHTML = '<i class="fa-solid fa-play"></i>'
        const that = this
        playButton.addEventListener("click", function (event) {
            that.play(audioFile)
        })

        const removeButton = document.createElement("button")
        removeButton.title = "Remove from playlist"
        removeButton.innerHTML = '<i class="fa-solid fa-close"></i>'
        removeButton.addEventListener("click", function (event) {
            that.removeFile(audioFile)
        })

        trackControls.append(playButton, removeButton, trackName)

        document.getElementById(this.#controlID).append(trackControls)

        if (!this.nowPlaying) {
            this.play(this.files.length - 1)
        }
    }

    /**
     * Remove a file from the playlist.
     *
     * @param {number|AudioFile} index The index, or audio file object, of the audio file to remove.
     * @memberof Playlist
     */
    removeFile(index) {
        if (index.constructor.name == "AudioFile") {
            index = this.files.indexOf(index)
        }
        const controls = document.querySelectorAll('.trackControls')
        controls[index].remove()
        this.files.splice(index, 1)
        if (this.files.length == 0) {
            this.playlistIsEmpty()
        }
    }

    /**
     * Play an audio file from the playlist.
     *
     * @param {number|AudioFile} index The index, or audio file object, of the audio file to play.
     * @memberof Playlist
     */
    play(index) {
        // Stop any currently playing audio
        if (this.nowPlaying) {
            this.nowPlaying.stop()
        }

        // Play the file
        if (index.constructor.name == "AudioFile") {
            index = this.files.indexOf(index)
        }
        this.nowPlaying = this.files[index]
        this.nowPlaying.play()

        // Play the next song when this one has ended
        const that = this
        this.nowPlaying.audioNode.addEventListener("ended", function (event) {
            if (that.files.length > 0) {
                let next = (index + 1) % that.files.length
                that.play(next)
            }
        }, { once: true })

        // Update UI to highlight current song
        const npElem = document.getElementById("nowPlaying")
        if (npElem) {
            npElem.id = ""
        }
        const controls = document.querySelectorAll('.trackControls')
        controls[index].id = "nowPlaying"
    }
}

/**
 * Handling of an empty EQ.
 */
function biquadControlsAreEmpty() {
    const filters = document.getElementById("filterControls")
    const info = document.createElement("p")
    info.innerHTML = 'Choose "Add Filter" above to add filters to the EQ'
    info.id = "addFilterInfo"
    filters.append(info)
}

/**
 * Add a new biquad control to the EQ.
 *
 * @param {object} context The active page context.
 * @param {string} type The biquad filter type.
 * @param {number} frequency The biquad filter frequency.
 * @param {number} Q The biquad filter Q.
 * @param {number} gain The biquad filter gain.
 * @return {BiquadFilterNode} The created filter node.
 */
function addBiquadControl(context, type, frequency, Q, gain) {
    const info = document.getElementById("addFilterInfo")
    if (info) {
        // If the EQ was empty, remove the instructions
        info.remove()
    }

    // random number for IDs
    const num = String(Date.now())

    // Add biquad and its response
    const biquad = context.eq.addBiquad()
    biquad.type = type
    biquad.frequency.value = frequency
    biquad.Q.value = Q
    biquad.gain.value = gain

    // The group of biquad controls
    const group = document.createElement("div")
    group.className = "controlGroup filter"

    // Add the filter type select box
    const typeControl = document.createElement("div")
    typeControl.className = "control"
    const typeLabel = document.createElement("label")
    typeLabel.htmlFor = "biquadType-" + num
    typeLabel.innerText = "Filter Type"
    const typeInput = document.createElement("select")
    typeInput.id = typeLabel.htmlFor
    types = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch"]
    for (let i = 0; i < types.length; i++) {
        const option = document.createElement("option")
        option.value = types[i]
        option.text = types[i]
        typeInput.appendChild(option)
    }
    typeInput.value = biquad.type
    typeInput.selectedIndex = types.indexOf(biquad.type)
    typeInput.options[types.indexOf(biquad.type)].selected = true
    typeControl.append(typeLabel, typeInput)

    // Add remaining controls
    function createNumberInput(id, text, min, max, step, value, param, convertTo, convertFrom) {
        // Create the parent div
        const control = document.createElement("div")
        control.className = "control"

        // Create the label
        const label = document.createElement("label")
        label.htmlFor = id
        label.innerText = text

        // Create the slider
        const slider = document.createElement("input")
        slider.type = 'range'
        slider.id = id
        slider.min = convertTo(min)
        slider.max = convertTo(max)
        slider.step = (convertTo(max) - convertTo(min)) / ((max - min) / step)
        slider.value = convertTo(value)

        // Create the number input
        const number = document.createElement("input")
        number.type = 'number'
        number.id = id + '_number'
        number.min = min
        number.max = max
        number.step = step
        number.value = value

        // Add listeners for when controls are changed
        slider.addEventListener("input", function (event) {
            number.value = convertFrom(slider.value)
            param.value = number.value
            context.eq.redraw()
        })
        number.addEventListener("change", function (event) {
            slider.value = convertTo(number.value)
            param.value = number.value
            context.eq.redraw()
        })

        // Add the controls to the parent div
        control.append(label, slider, number)
        return control
    }

    // Create the frequency control
    const freqControl = createNumberInput("biquadFrequency-" + num, "Frequency / Hz", 20, 20000, 1, biquad.frequency.value, biquad.frequency, toMel, function (m) { return Math.round(fromMel(m)) })

    // Create the Q control
    const qControl = createNumberInput("biquadQ-" + num, "Q", 0, 10, 0.0001, biquad.Q.value, biquad.Q, doNothing, doNothing)

    // Create the gain control
    const gainControl = createNumberInput("biquadGain-" + num, "Gain / dB", -40, 20, 0.1, biquad.gain.value, biquad.gain, doNothing, doNothing)

    // Add a div for the buttons
    const buttonDiv = document.createElement("div")
    buttonDiv.className = "control"

    // Add the remove button
    const removeButton = document.createElement("button")
    removeButton.id = "biquadDelete-" + num
    removeButton.title = "Delete filter"
    removeButton.innerHTML = '<i class="fa-solid fa-close"></i>'
    removeButton.addEventListener("click", function (event) {
        context.eq.removeBiquad(biquad)
        group.remove()
        context.eq.redraw()
        if (context.eq.biquads.length == 0) {
            biquadControlsAreEmpty()
        }
    })
    buttonDiv.append(removeButton)

    // Add the copy button
    const copyButton = document.createElement("button")
    copyButton.id = "biquadCopy-" + num
    copyButton.title = "Copy filter"
    copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>'
    copyButton.addEventListener("click", function (event) {
        addBiquadControl(context, biquad.type, biquad.frequency.value, biquad.Q.value, biquad.gain.value)
    })
    buttonDiv.append(copyButton)

    // Handle change of the filter type
    typeInput.addEventListener("change", function (event) {
        biquad.type = event.target.value
        Array.prototype.slice.call(qControl.getElementsByTagName('input')).forEach(function (elem) {
            elem.disabled = !enableMatrix[biquad.type]["Q"]
        })
        Array.prototype.slice.call(gainControl.getElementsByTagName('input')).forEach(function (elem) {
            elem.disabled = !enableMatrix[biquad.type]["gain"]
        })
        context.eq.redraw()
    })

    // Add the controls to the group
    group.append(typeControl, freqControl, qControl, gainControl, buttonDiv)
    typeInput.dispatchEvent(new Event("change"))
    context.eq.redraw()
    document.getElementById("filterControls").append(group)

    return biquad
}

/**
 * Create a popup to overlay the page content.
 *
 * @param {HTMLElement} content Content of the popup.
 * @return {HTMLElement} The popup parent container.
 */
function createPopup(content) {
    // Create basic popup
    const bg = document.createElement("div")
    bg.className = "popup-bg"
    const popup = document.createElement("div")
    popup.className = "popup-content"
    for (let i = 0; i < arguments.length; i++) {
        popup.append(arguments[i])
    }

    // Add a close button
    const close = document.createElement("div")
    close.className = "control"
    close.style = "width:100%;"
    const closeButton = document.createElement("button")
    closeButton.innerHTML = "Close"
    close.append(closeButton)
    popup.append(close)
    closeButton.addEventListener("click", function (event) { bg.remove() })

    bg.append(popup)
    bg.addEventListener("click", function (event) {
        if (event.target !== this) return;
        bg.remove()
    })
    document.body.append(bg)

    return bg
}

/**
 * Set the EQ input gain.
 *
 * @param {ParametricEQ} eq The parametric EQ to update.
 * @param {number} gainInDB The gain in dB.
 */
function setInputGain(eq, gainInDB) {
    eq.input.gain.value = linear(gainInDB)
    eq.redraw()
}

/**
 * Show the EQ filter coefficients.
 *
 * @param {ParametricEQ} eq The EQ for which the coefficients should be shown.
 */
function showCoefficientTable(eq) {
    const coeffTable = document.createElement("table")
    coeffTable.className = "responsive"
    coeffTable.innerHTML = '<thead>' +
        '<tr>' +
        '<th>a0</th>' +
        '<th>a1</th>' +
        '<th>a2</th>' +
        '<th>b0</th>' +
        '<th>b1</th>' +
        '<th>b2</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        '</tbody>'

    // Create the parent
    const control = document.createElement("div")
    control.className = "control"

    // Add a control for the sample rate
    const fsLabel = document.createElement("label")
    fsLabel.htmlFor = "sampleRate"
    fsLabel.innerText = "Sample rate / Hz"
    const fsSelect = document.createElement("select")
    fsSelect.id = fsLabel.htmlFor
    rates = ["8000", "16000", "32000", "44100", "48000", "96000"]
    for (let i = 0; i < rates.length; i++) {
        const option = document.createElement("option")
        option.value = rates[i]
        option.text = rates[i]
        fsSelect.appendChild(option)
    }

    // Handle sample rate changes, to recreate the table
    fsSelect.addEventListener("change", function (event) {
        const existingError = document.getElementById("coeffError")
        if (existingError) {
            // Remove any pre-existing errors
            existingError.remove()
        }

        // Find any frequencies that exceed Nyquist
        let fs = Number(fsSelect.value)
        let maxFrequency = 0
        eq.biquads.forEach((filter) => {
            maxFrequency = Math.max(maxFrequency, filter.frequency.value)
        })

        // Create error message if any frequencies exceed Nyquist
        if (maxFrequency > (fs / 2)) {
            const error = document.createElement("div")
            error.id = "coeffError"
            error.innerHTML = "One or more filter frequencies exceed the Nyquist limit. The response of the given coefficients will differ from the plotted EQ."
            error.className = "error"
            control.append(error)
        }

        // Insert the coefficients
        const tBody = coeffTable.getElementsByTagName('tbody')[0]
        let content = "<tbody>"
        const coefficients = eq.coefficients(fs)
        coefficients.forEach(function (coeffs) {
            content += '<tr>' +
                '<td data-label="a0">' + String(coeffs.a[0]) + '</td>' +
                '<td data-label="a1">' + String(coeffs.a[1]) + '</td>' +
                '<td data-label="a2">' + String(coeffs.a[2]) + '</td>' +
                '<td data-label="b0">' + String(coeffs.b[0]) + '</td>' +
                '<td data-label="b1">' + String(coeffs.b[1]) + '</td>' +
                '<td data-label="b2">' + String(coeffs.b[2]) + '</td>' +
                '</tr>'
        })
        content += "</tbody>"
        tBody.innerHTML = content // overwrite the table body content
    })

    // Add the sample rate control
    control.append(fsLabel, fsSelect)

    // Add conversion info
    const info = document.createElement("p")
    info.innerHTML = 'Use the <a target="_blank" href="qformat.html">Q-format Converter</a> to convert to fixed-point.'

    // Create the popup
    const bg = createPopup(control, coeffTable, info)

    // Trigger filling in of the table
    let defaultRate = "48000"
    fsSelect.value = defaultRate
    fsSelect.selectedIndex = rates.indexOf(defaultRate)
    fsSelect.options[rates.indexOf(defaultRate)].selected = true
    fsSelect.dispatchEvent(new Event("change"))
}

/**
 * Remove all filters from the EQ.
 *
 * @param {object} context The active page context.
 */
function removeAllFilters(context) {
    const filtersDiv = document.getElementById("filterControls")
    const filterControls = filtersDiv.querySelectorAll("*")
    Array.prototype.forEach.call(filterControls, (eqFilter) => {
        eqFilter.remove()
    })
    for (i = context.eq.numBiquads - 1; i >= 0; i--) {
        context.eq.removeBiquad(i)
    }
}

/**
 * Get the URL hash that describes the EQ.
 *
 * @param {object} context The active page context.
 * @return {string} The hash string.
 */
function getHash(context) {
    return window.location.href.replace(window.location.hash, "").replace(/#+$/, "") +
        "#inputGain=" + document.getElementById("inputGain").value +
        "&eq=" + encodeURI(context.eq.stringify())
}

/**
 * Show the EQ URL in a popup window.
 *
 * @param {object} context The active page context.
 */
function showEqURI(context) {
    let eqUrl = getHash(context)
    const hashInfo = document.createElement("p")
    hashInfo.style = "word-break: break-all;"
    hashInfo.innerHTML = 'Use the following URL to recall this EQ:<br><a href="' + eqUrl + '">' + eqUrl + '</a>'
    const popup = createPopup(hashInfo)
    hashInfo.addEventListener("click", function (event) {
        context.saved = true
        window.location.href = eqUrl
        popup.remove()
    })
}
/**
 * Parse the URL hash and generate the EQ.
 *
 * @param {object} context The active page context.
 */
function parseHash(context) {
    let hash = window.location.hash.split('?')[0];
    if (hash) {
        hash = hash.replace(/^\#+/i, '')
        hash.split("&").forEach((keyval) => {
            keyValArr = keyval.split("=")
            switch (keyValArr[0]) {
                case "eq":
                    loadEqFromString(context, decodeURI(keyValArr[1]))
                    break;
                case "inputGain":
                    const inputGain = document.getElementById("inputGain_number")
                    inputGain.value = keyValArr[1]
                    inputGain.dispatchEvent(new Event("change"))
                    break;
            }
        })
    }
}

/**
 * Load an EQ from a given URL hash string.
 *
 * @param {object} context The active page context.
 * @param {string} eqString The decoded URL hash string describing the EQ.
 */
function loadEqFromString(context, eqString) {
    biquads = JSON.parse(eqString)
    biquads.forEach((biquadObj) => {
        addBiquadControl(context, biquadObj.type, biquadObj.freq, biquadObj.Q, biquadObj.gain)
    })
}
/**
 * Class for managing a UI audio player.
 */
class AudioPlayer {

    #playIcon = '<i class="fa-solid fa-play"></i>'
    #pauseIcon = '<i class="fa-solid fa-pause"></i>'

    /**
     *  Creates an instance of AudioPlayer.
     * @param {string} containerID The ID of the player container.
     * @param {AudioNode} audioNode The audio node that handles actual playback functionality.
     * @memberof AudioPlayer
     */
    constructor(containerID, audioNode) {
        this.audioNode = audioNode
        this.container = document.getElementById(containerID)

        // Create play/pause button
        this.playPauseButton = document.createElement("button")
        this.playPauseButton.title = "Pause/play"
        this.playPauseButton.className = "audioPlayer-play"
        this.playPauseButton.innerHTML = this.#playIcon

        // Create span to show current time
        this.currentTimeSpan = document.createElement("span")
        this.currentTimeSpan.className = "audioPlayer-current-time time"
        this.currentTimeSpan.innerHTML = "00:00"

        // Create the seek slider
        this.seek = document.createElement("input")
        this.seek.type = "range"
        this.seek.className = "audioPlayer-seek-slider"
        this.seek.max = "0"
        this.seek.min = "0"
        this.seek.step = "0.1"
        this.seek.value = "0"

        // Create span to show duration
        this.durationSpan = document.createElement("span")
        this.durationSpan.className = "audioPlayer-duration time"
        this.durationSpan.innerHTML = "00:00"

        // Insert the element in to the page
        this.container.append(this.playPauseButton, this.currentTimeSpan, this.seek, this.durationSpan)

        // States
        this.trackDuration = 0
        this.seeking = false
        this.ready = false
        this.playing = false
        const that = this

        // Browser can start playing audio
        this.audioNode.addEventListener("canplay", function (event) {
            that.ready = true
        })

        // Play has started
        this.audioNode.addEventListener("play", function (event) {
            that.playing = true
            that.handlePlay()
        })

        // Play has started after pause
        this.audioNode.addEventListener("playing", function (event) {
            that.playing = true
            that.handlePlay()
        })

        // Playback is paused
        this.audioNode.addEventListener("pause", function (event) {
            that.playing = false
            that.handlePause()
        })

        // Playback stopped for some reason
        this.audioNode.addEventListener("emptied", function (event) { that.abort() })
        this.audioNode.addEventListener("error", function (event) { that.abort() })

        // Update the current time
        this.audioNode.addEventListener("timeupdate", function (event) {
            if (that.seeking) return;
            let currentTime = event.target.currentTime
            that.currentTimeSpan.innerHTML = that.sToTime(currentTime)
            that.seek.value = currentTime
        })

        // Update the duration
        this.audioNode.addEventListener("durationchange", function (event) {
            that.updateDuration(event.target.duration)
        })

        // Handle clicking on seek bar
        this.seek.addEventListener("input", function (event) {
            if (that.ready) {
                that.seeking = true
                let time = Number(event.target.value)
                that.audioNode.currentTime = time
                that.currentTimeSpan.innerHTML = that.sToTime(time)
                that.seeking = false
            }
        })

        // Handle clicking play/pause button
        this.playPauseButton.addEventListener("click", function (event) {
            if (that.ready) {
                if (that.playing) {
                    that.audioNode.pause()
                    that.handlePause()
                } else {
                    that.audioNode.play()
                    that.handlePlay()
                }
            }
        })
    }

    /**
     * Handle initiation of playback.
     *
     * @memberof AudioPlayer
     */
    handlePlay() {
        this.playPauseButton.innerHTML = this.#pauseIcon
    }

    /**
     * Handle playback pause.
     *
     * @memberof AudioPlayer
     */
    handlePause() {
        this.playPauseButton.innerHTML = this.#playIcon
    }

    /**
     * Convert time in seconds to displayed time.
     *
     * @param {number} t Time in seconds.
     * @return {string} Displayed time.
     * @memberof AudioPlayer
     */
    sToTime(t) {
        let time = ""
        if (this.trackDuration > 3600) {
            time += this.padZero(parseInt((t / (60 * 60)) % 24)) + ":"
        }
        time += this.padZero(parseInt((t / (60)) % 60)) + ":" +
            this.padZero(parseInt((t) % 60))
        return time
    }

    /**
     * Pad a number with a leading zero.
     *
     * @param {number|string} v Value to pad.
     * @return {string} Padded number.
     * @memberof AudioPlayer
     */
    padZero(v) {
        return (v < 10) ? "0" + v : v;
    }

    /**
     * Update based on the audio file duration.
     *
     * @param {number} duration New audio file duration.
     * @memberof AudioPlayer
     */
    updateDuration(duration) {
        this.trackDuration = duration
        this.seek.max = duration
        this.durationSpan.innerHTML = this.sToTime(duration)
        if (duration == 0) {
            this.ready = false
        }
    }

    /**
     * Abort the playback.
     *
     * @memberof AudioPlayer
     */
    abort() {
        this.ready = false
        this.playing = false
        this.seek.max = 0
        this.handlePause()
    }
}