/**
 * Convert linear gain to dB.
 *
 * @param {number} x Linear gain.
 * @return {number} Gain in dB.
 */
function dB(x) {
    return 20 * Math.log10(x)
}

/**
 * Convert gain in dB to linear gain.
 *
 * @param {number} x Gain in dB.
 * @return {number} Linear gain.
 */
function linear(x) {
    return 10 ** (x / 20)
}

/**
 * Convert angle in radians to degrees.
 *
 * @param {number} x Angle in radians.
 * @return {number} Angle in degrees.
 */
function degrees(x) {
    return 180 * (x / Math.PI)
}
/** Set of colours for chart lines */
const lineColors = [
    '#00ff00',
    '#ff00ff',
    '#007fff',
    '#ff7f00',
    '#7fbf7f',
    '#7f2181',
    '#ff0000',
    '#d1fc04',
    '#f77ecf',
    '#487a02',
    '#0000ff',
    '#00ffff',
    '#00ff7f',
    '#007f7f',
    '#00007f',
    '#8196fe',
    '#f1d77c',
    '#86f8f1',
    '#850dfe',
    '#860500',
]

/**
 * Base class for parametric EQ, implemented as a cascade of biquad filters.
 *
 * @class ParametricEQ
 */
class ParametricEQ {

    /**
     *  Creates an instance of ParametricEQ.
     * @param {AudioContext} audioContext The audio context to which the EQ is connected.
     * @memberof ParametricEQ
     */
    constructor(audioContext) {
        this.audioContext = audioContext
        this.biquads = []
        this.input = audioContext.createGain()
        this.output = audioContext.createGain()
        this.input.connect(this.output)
        this.input.gain.value = 1.0
        this.output.gain.value = 1.0
    }

    /**
     * Add a biquad to the EQ.
     *
     * @return {BiquadFilterNode} The new biquad filter.
     * @memberof ParametricEQ
     */
    addBiquad() {
        const bq = this.audioContext.createBiquadFilter()
        if (0 == this.numBiquads) {
            this.input.disconnect(this.output)
            this.input.connect(bq)
        } else {
            this.biquads[this.numBiquads - 1].disconnect(this.output)
        }
        this.biquads.push(bq)
        bq.connect(this.output)
        if (1 < this.numBiquads) {
            this.biquads[this.numBiquads - 2].connect(bq)
        }
        return bq
    }

    /**
     * Remove a biquad from the EQ.
     *
     * @param {BiquadFilterNode|number} index Index of the biquad filter, or the biquad filter object.
     * @return {number} The numeric index of the removed filter.
     * @memberof ParametricEQ
     */
    removeBiquad(index) {
        if (index.constructor.name == "BiquadFilterNode") {
            index = this.biquads.indexOf(index)
        }
        if ((index >= 0) && (index < this.numBiquads) && (this.numBiquads > 0)) {
            // disconnect nodes
            this.input.disconnect(this.biquads[0])
            this.biquads[this.numBiquads - 1].disconnect(this.output)
            if (this.numBiquads > 1) {
                for (let i = 0; i < this.numBiquads - 1; i++) {
                    this.biquads[i].disconnect(this.biquads[i + 1])
                }
            }

            // remove biquad
            this.biquads.splice(index, 1)

            // reconnect nodes
            if (this.numBiquads > 0) {
                if (this.numBiquads > 1) {
                    for (let i = 0; i < this.numBiquads - 1; i++) {
                        this.biquads[i].connect(this.biquads[i + 1])
                    }
                }
                this.input.connect(this.biquads[0])
                this.biquads[this.numBiquads - 1].connect(this.output)
            } else {
                this.input.connect(this.output)
            }
        }
        return index
    }

    /**
     * The number of biquads in the EQ.
     *
     * @readonly
     * @memberof ParametricEQ
     */
    get numBiquads() {
        return this.biquads.length
    }

    /**
     * Get the filter parameters for a biquad.
     *
     * @param {BiquadFilterNode} biquad The biquad filter.
     * @return {object} The filter parameters.
     * @memberof ParametricEQ
     */
    static getFilterParams(biquad) {
        return {
            type: biquad.type,
            freq: biquad.frequency.value,
            Q: biquad.Q.value,
            gain: biquad.gain.value,
        }
    }

    /**
     * Create a stringified JSON representation of the filters' parameters.
     *
     * @return {string} The stringified JSON parameters.
     * @memberof ParametricEQ
     */
    stringify() {
        const biquads = this.biquads.map(ParametricEQ.getFilterParams)
        return JSON.stringify(biquads)
    }

    /**
     * Calculate the coefficients for the filters.
     *
     * The BiquadFilterNode objects do not expose their filter coefficients, so they must be calculated.
     *
     * @param {number} fs The sampling rate of the filter.
     * @return {Array.<Object>} Array of objects containing the a (feedback) and b (feedforward) coefficients.
     * @memberof ParametricEQ
     */
    coefficients(fs) {
        const coeffs = []
        this.biquads.forEach(function(biquad) {
            let acoeff = new Float32Array(3)
            let bcoeff = new Float32Array(3)

            let g = biquad.gain.value
            let f0 = biquad.frequency.value
            let q = biquad.Q.value

            let a = 10 ** (g / 40)
            let w0 = 2 * Math.PI * (f0 / fs)
            let aq = Math.sin(w0) / (2 * q)
            let aqdb = Math.sin(w0) / (2 * (10 ** (q / 20)))
            let s = 1
            let as = (Math.sin(w0) / (2)) * Math.sqrt((a + (1 / a)) * ((1 / s) - 1) + 2)
            let asqrt = Math.sqrt(a)

            switch (biquad.type) {
                case "lowpass":
                    bcoeff[0] = (1 - Math.cos(w0)) / 2
                    bcoeff[1] = 1 - Math.cos(w0)
                    bcoeff[2] = (1 - Math.cos(w0)) / 2
                    acoeff[0] = 1 + aqdb
                    acoeff[1] = -2 * Math.cos(w0)
                    acoeff[2] = 1 - aqdb
                    break
                case "highpass":
                    bcoeff[0] = (1 + Math.cos(w0)) / 2
                    bcoeff[1] = -(1 + Math.cos(w0))
                    bcoeff[2] = (1 + Math.cos(w0)) / 2
                    acoeff[0] = 1 + aqdb
                    acoeff[1] = -2 * Math.cos(w0)
                    acoeff[2] = 1 - aqdb
                    break
                case "bandpass":
                    bcoeff[0] = aq
                    bcoeff[1] = 0
                    bcoeff[2] = -aq
                    acoeff[0] = 1 + aq
                    acoeff[1] = -2 * Math.cos(w0)
                    acoeff[2] = 1 - aq
                    break
                case "notch":
                    bcoeff[0] = 1
                    bcoeff[1] = -2 * Math.cos(w0)
                    bcoeff[2] = 1
                    acoeff[0] = 1 + aq
                    acoeff[1] = -2 * Math.cos(w0)
                    acoeff[2] = 1 - aq
                    break
                case "peaking":
                    bcoeff[0] = 1 + (aq * a)
                    bcoeff[1] = -2 * Math.cos(w0)
                    bcoeff[2] = 1 - (aq * a)
                    acoeff[0] = 1 + (aq / a)
                    acoeff[1] = -2 * Math.cos(w0)
                    acoeff[2] = 1 - (aq / a)
                    break
                case "lowshelf":
                    bcoeff[0] = a * ((a + 1) - ((a - 1) * (Math.cos(w0))) + (2 * as * asqrt))
                    bcoeff[1] = 2 * a * ((a - 1) - ((a + 1) * (Math.cos(w0))))
                    bcoeff[2] = a * ((a + 1) - ((a - 1) * (Math.cos(w0))) - (2 * as * asqrt))
                    acoeff[0] = (a + 1) + ((a - 1) * (Math.cos(w0))) + (2 * as * asqrt)
                    acoeff[1] = -2 * a * ((a - 1) + ((a + 1) * (Math.cos(w0))))
                    acoeff[2] = (a + 1) + ((a - 1) * (Math.cos(w0))) - (2 * as * asqrt)
                    break
                case "highshelf":
                    bcoeff[0] = a * ((a + 1) + ((a - 1) * (Math.cos(w0))) + (2 * as * asqrt))
                    bcoeff[1] = -2 * a * ((a - 1) + ((a + 1) * (Math.cos(w0))))
                    bcoeff[2] = a * ((a + 1) + ((a - 1) * (Math.cos(w0))) - (2 * as * asqrt))
                    acoeff[0] = (a + 1) - ((a - 1) * (Math.cos(w0))) + (2 * as * asqrt)
                    acoeff[1] = 2 * a * ((a - 1) - ((a + 1) * (Math.cos(w0))))
                    acoeff[2] = (a + 1) - ((a - 1) * (Math.cos(w0))) - (2 * as * asqrt)
                    break
            }

            let a0 = acoeff[0]
            acoeff = acoeff.map(function(x) { return x / a0 })
            bcoeff = bcoeff.map(function(x) { return x / a0 })

            coeffs.push({a: acoeff, b: bcoeff})
        })
        return coeffs
    }

}

/**
 * The EqDesigner class extends ParametricEQ by adding charting capabilities.
 *
 * @class EqDesigner
 * @extends {ParametricEQ}
 */
class EqDesigner extends ParametricEQ {

    #numPoints = 256 // number of frequency points
    #fmin = 10
    #fmax = 20000

    /**
     *  Creates an instance of EqDesigner.
     * @param {AudioContext} audioContext The audio context to which the EQ will be attached.
     * @param {HTMLElement} magCtx The canvas element for displaying the magnitude plot.
     * @param {HTMLElement} phsCtx The canvas element for displaying the phase plot.
     * @memberof EqDesigner
     */
    constructor(audioContext, magCtx, phsCtx) {

        super(audioContext)

        // If set, the redraw callback is executed when the plots are updated
        this.redrawCallback = null

        this.frequency = new Float32Array(this.#numPoints)
        this.#updateFrequencies()

        // Containers for the responses of each filter
        this.magnitudes = []
        this.phases = []

        // Overall response
        this.overallMag = new Float32Array(this.#numPoints)
        this.overallMag.fill(1)
        this.overallPhase = new Float32Array(this.#numPoints)

        // Common x-axis configuration
        const xconfig_common = {
            type: 'logarithmic',
            min: this.#fmin,
            max: this.#fmax,
            ticks: {
                callback: function(value, index, ticks) {
                    switch (value) {
                        case 10:
                            return "10";
                        case 100:
                            return "100";
                        case 1000:
                            return "1k"
                        case 10000:
                            return "10k"
                    }
                    return "";
                },
                autoSkip: false,
            },
            afterBuildTicks: axis => axis.ticks = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 20000].map(v => ({ value: v }))
        }
        const xconfig_mag = Object.assign({}, xconfig_common)
        const xconfig_phase = Object.assign({}, xconfig_common)
        xconfig_phase.title = {
            text: 'Frequency / Hz',
            display: true,
        }

        // The magnitude plot
        this.magPlot = new Chart(magCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallMag.map(dB), label: 'Overall', borderColor: "white", backgroundColor: "rgba(0,0,0,0)"}],
                labels: this.frequency,
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    x: xconfig_mag,
                    y: {
                        title: {
                            text: 'Magnitude / dB',
                            display: true,
                        },
                        min: -40,
                        max: 20,
                    },
                },
                plugins: {
                    colors: {
                        enabled: false,
                    },
                },
            },
        })

        // The phase plot
        this.phasePlot = new Chart(phsCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallPhase.map(degrees), label: 'Overall', borderColor: "white", backgroundColor: "rgba(0,0,0,0)"}],
                labels: this.frequency,
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    x: xconfig_phase,
                    y: {
                        title: {
                            text: 'Phase / °',
                            display: true,
                        },
                    },
                },
                plugins: {
                    colors: {
                        enabled: false,
                    },
                },
            },
        })

        this.magPlot.update()
        this.phasePlot.update()
    }

    /**
     * Update the plot frequencies.
     *
     * @memberof EqDesigner
     */
    #updateFrequencies() {
        let logMin = Math.log10(this.#fmin)
        let logMax = Math.log10(this.#fmax)
        let step = (logMax - logMin) / (this.#numPoints - 1)
        for (let n = 0; n < this.#numPoints; n++) {
            this.frequency[n] = 10 ** (logMin + (n * step))
        }
    }

    /**
     * Get the number of frequency points.
     *
     * @readonly
     * @memberof EqDesigner
     */
    get numPoints() {
        return this.#numPoints
    }

    /**
     * Add a biquad to the EQ.
     *
     * Redraw the plots.
     *
     * @return {BiquadFilterNode} The inserted biquad filter.
     * @memberof EqDesigner
     */
    addBiquad() {
        // Add the biquad to the audio context
        const bq = super.addBiquad()

        // calculate the new response
        const magCopy = new Float32Array(this.numPoints)
        const phaseCopy = new Float32Array(this.numPoints)
        this.biquads[this.numBiquads - 1].getFrequencyResponse(this.frequency, magCopy, phaseCopy)
        this.magnitudes.push(magCopy)
        this.phases.push(phaseCopy)
        let color = lineColors[(this.numBiquads - 1) % lineColors.length]
        this.magPlot.data.datasets.push({data: magCopy.map(dB), label: this.numBiquads, borderDash: [5, 5], borderColor: color, backgroundColor: "rgba(0,0,0,0)"})
        this.phasePlot.data.datasets.push({data: phaseCopy.map(degrees), label: this.numBiquads, borderDash: [5, 5], borderColor: color, backgroundColor: "rgba(0,0,0,0)"})
        this.redraw()
        return bq
    }

    /**
     * Remove a biquad filter.
     *
     * Redraw the plots.
     *
     * @param {BiquadFilterNode|number} index Index of the biquad filter, or the biquad filter object.
     * @memberof EqDesigner
     */
    removeBiquad(index) {
        index = super.removeBiquad(index)
        if ((index >= 0) && (index < this.magnitudes.length) && (this.magnitudes.length > 0)) {
            this.magnitudes.splice(index, 1)
            this.phases.splice(index, 1)
            this.magPlot.data.datasets.splice(index + 1, 1)
            this.phasePlot.data.datasets.splice(index + 1, 1)
            for (let i = 0; i < this.numBiquads; i++) {
                let color = lineColors[i % lineColors.length]
                this.magPlot.data.datasets[i + 1].label = i + 1
                this.magPlot.data.datasets[i + 1].borderColor = color
                this.phasePlot.data.datasets[i + 1].label = i + 1
                this.phasePlot.data.datasets[i + 1].borderColor = color
            }
            this.redraw()
        }
    }

    /**
     * Recalculate the overall EQ response.
     *
     * @memberof EqDesigner
     */
    #recalculateOverall() {
        this.overallMag.fill(this.input.gain.value * this.output.gain.value)
        this.overallPhase.fill(0)
        for (let i = 0; i < this.numBiquads; i++) {
            this.biquads[i].getFrequencyResponse(this.frequency, this.magnitudes[i], this.phases[i])
            for (let n = 0; n < this.numPoints; n++) {
                this.overallMag[n] *= this.magnitudes[i][n]
                this.overallPhase[n] += this.phases[i][n]
            }
        }
    }

    /**
     * Recalculate and redraw the response plots.
     *
     * @memberof EqDesigner
     */
    redraw() {
        this.#recalculateOverall()
        for (let i = 0; i < this.numBiquads; i++) {
            this.magPlot.data.datasets[i+1].data = this.magnitudes[i].map(dB)
            this.phasePlot.data.datasets[i+1].data = this.phases[i].map(degrees)
        }
        this.magPlot.data.datasets[0].data = this.overallMag.map(dB)
        this.phasePlot.data.datasets[0].data = this.overallPhase.map(degrees)

        this.magPlot.update()
        this.phasePlot.update()

        if (this.redrawCallback) {
            this.redrawCallback()
        }
    }

}
