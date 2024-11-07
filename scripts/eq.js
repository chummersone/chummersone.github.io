function dB(x) {
    return 20 * Math.log10(x)
}

function degrees(x) {
    return 180 * (x / Math.PI)
}

class ParametricEQ {

    constructor(audioContext) {
        this.audioContext = audioContext
        this.biquads = []
        this.input = audioContext.createGain()
        this.output = audioContext.createGain()
        this.input.connect(this.output)
        this.input.gain.value = 1.0
        this.output.gain.value = 1.0
    }

    addBiquad() {
        var bq = this.audioContext.createBiquadFilter()
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

    get numBiquads() {
        return this.biquads.length
    }

    coefficients(fs) {
        var coeffs = []
        this.biquads.forEach(function(biquad) {
            var acoeff = new Float32Array(3)
            var bcoeff = new Float32Array(3)

            var g = biquad.gain.value
            var f0 = biquad.frequency.value
            var q = biquad.Q.value

            var a = 10 ** (g / 40)
            var w0 = 2 * Math.PI * (f0 / fs)
            var aq = Math.sin(w0) / (2 * q)
            var aqdb = Math.sin(w0) / (2 * (10 ** (q / 20)))
            var s = 1
            var as = (Math.sin(w0) / (2)) * Math.sqrt((a + (1 / a)) * ((1 / s) - 1) + 2)
            var asqrt = Math.sqrt(a)

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

            var a0 = acoeff[0]
            acoeff = acoeff.map(function(x) { return x / a0 })
            bcoeff = bcoeff.map(function(x) { return x / a0 })

            coeffs.push({a: acoeff, b: bcoeff})
        })
        return coeffs
    }

}


class EqDesigner extends ParametricEQ {

    #numPoints; // number of frequency points
    #fmin = 10;
    #fmax = 20000;

    constructor(audioContext, magCtx, phsCtx) {

        super(audioContext)

        this.#numPoints = 256
        this.frequency = new Float32Array(this.#numPoints)
        this.updateFrequencies()

        this.magnitudes = []
        this.phases = []

        this.overallMag = new Float32Array(this.#numPoints)
        this.overallMag.fill(1)
        this.overallPhase = new Float32Array(this.#numPoints)

        var xconfig = {
            type: 'logarithmic',
            min: this.#fmin,
            max: this.#fmax,
            title: {
                text: 'Frequency / Hz',
                display: true,
            },
            ticks: {
                callback: function(value, index, ticks) {
                    let log = Math.log10(value)
                    if (Math.round(log) == log) {
                        return value
                    } else {
                        return ''
                    }
                },
            },
        }

        this.magPlot = new Chart(magCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallMag.map(dB), label: 'Overall'}],
                labels: this.frequency,
            },
            options: {
                scales: {
                    x: xconfig,
                    y: {
                        title: {
                            text: 'Magnitude / dB',
                            display: true,
                        },
                        min: -20,
                        max: 20,
                    },
                },
                plugins: {
                    colors: {
                        enabled: true,
                        forceOverride: true,
                    },
                },
            },
        })

        this.phasePlot = new Chart(phsCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallPhase.map(degrees), label: 'Overall'}],
                labels: this.frequency,
            },
            options: {
                scales: {
                    x: xconfig,
                    y: {
                        title: {
                            text: 'Phase / °',
                            display: true,
                        },
                    },
                },
                plugins: {
                    colors: {
                        enabled: true,
                        forceOverride: true,
                    },
                },
            },
        })

        this.magPlot.update()
        this.phasePlot.update()
    }

    updateFrequencies() {
        var logMin = Math.log10(this.#fmin)
        var logMax = Math.log10(this.#fmax)
        var step = (logMax - logMin) / (this.#numPoints - 1)
        for (let n = 0; n < this.#numPoints; n++) {
            this.frequency[n] = 10 ** (logMin + (n * step))
        }
    }

    get numPoints() {
        return this.#numPoints
    }

    addBiquad() {
        // Add the biquad to the audio context
        var bq = super.addBiquad()

        // calculate the new response
        var magCopy = new Float32Array(this.numPoints)
        var phaseCopy = new Float32Array(this.numPoints)
        this.biquads[this.numBiquads - 1].getFrequencyResponse(this.frequency, magCopy, phaseCopy)
        this.magnitudes.push(magCopy)
        this.phases.push(phaseCopy)
        this.magPlot.data.datasets.push({data: magCopy.map(dB), label: this.numBiquads})
        this.phasePlot.data.datasets.push({data: phaseCopy.map(degrees), label: this.numBiquads})
        this.redraw()
        return bq
    }

    removeBiquad(index) {
        index = super.removeBiquad(index)
        if ((index >= 0) && (index < this.magnitudes.length) && (this.magnitudes.length > 0)) {
            this.magnitudes.splice(index, 1)
            this.phases.splice(index, 1)
            this.magPlot.data.datasets.splice(index + 1, 1)
            this.phasePlot.data.datasets.splice(index + 1, 1)
            for (let i = 0; i < this.numBiquads; i++) {
                this.magPlot.data.datasets[i + 1].label = i + 1
                this.phasePlot.data.datasets[i + 1].label = i + 1
            }
            this.redraw()
        }
    }

    recalculateOverall() {
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

    redraw() {
        this.recalculateOverall()
        for (let i = 0; i < this.numBiquads; i++) {
            this.magPlot.data.datasets[i+1].data = this.magnitudes[i].map(dB)
            this.phasePlot.data.datasets[i+1].data = this.phases[i].map(degrees)
        }
        this.magPlot.data.datasets[0].data = this.overallMag.map(dB)
        this.phasePlot.data.datasets[0].data = this.overallPhase.map(degrees)

        this.magPlot.update()
        this.phasePlot.update()
    }

}
