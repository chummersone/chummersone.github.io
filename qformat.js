/**
* Class for float<->fixed-point conversion.
*/
class FixedPointConverter {

    /** 
    * Initialise a new fixed-point converter.
    * @param {Integer} numFracBits - Number of fractional bits.
    * @param {Integer} numBits - Word size in bits.
    */
    constructor(numFracBits, numBits, signed) {
        this._numFracBits = numFracBits;
        this._numBits = numBits;
        this._signed = signed;
        this._float = 0;
        this._fixed = 0;
        this._int = BigInt(0);
        this.floatChanged = true;
        this._update();
    }

    /** 
    * Get the integer value.
    */
    get int() {
        return BigInt(this._int);
    }

    /** 
    * Get the integer value.
    * @param {Integer} x - Integer value.
    */
    set int(x) {
        this._int = BigInt(x);
        this.floatChanged = false;
        this._update();
    }

    /** 
    * Get the floating-point value.
    */
    get float() {
        return this._float;
    }

    /** 
    * Set the floating-point value.
    * @param {Number} x - Floating-point value.
    */
    set float(x) {
        this._float = x;
        this.floatChanged = true;
        this._update();
    }

    /** 
    * Get the integer value in hexadecimal format (i.e. as a string).
    */
    get hex() {
        if (!isNaN(Number(this._int))) {
            var val = this._maskInt(this._int);
            return val.toString(16).padStart(this.numHexChars, '0');
        } else {
            return NaN;
        }
    }

    /** 
    * Set the integer value from a hexadecimal-format string.
    * @param {String} x - Hexadecimal integer value.
    */
    set hex(x) {
        this.int = this._str2int(x, 16);
    }

    /** 
    * Get the integer value in binary format (i.e. as a string).
    */
    get bin() {
        if (!isNaN(this._int)) {
            var val = this._maskInt(this._int);
            return val.toString(2).padStart(this._numBits, '0');
        } else {
            return NaN;
        }
    }

    /** 
    * Set the integer value from a binary-format string.
    * @param {String} x - Binary integer value.
    */
    set bin(x) {
        this.int = this._str2int(x, 2);
    }

    /** 
    * Get the fixed-point value.
    */
    get fixed() {
        if (this.intInRange && this.floatInRange) {
            return this._fixed;
        } else {
            return NaN;
        }
        
    }

    /** 
    * Get the number of fractional bits.
    */
    get numFracBits() {
        return this._numFracBits;
    }

    /** 
    * Set the number of fractional bits.
    * @param {Integer} x - Number of fractional bits.
    */
    set numFracBits(x) {
        this._numFracBits = x;
        this._update();
    }
    
    /** 
    * Get the word size in bits.
    */
    get numBits() {
        return this._numBits;
    }

    /** 
    * Set the word size in bits.
    * @param {Integer} x - Word size in bits.
    */
    set numBits(x) {
        this._numBits = x;
        this._update();
    }

    /** 
    * The value is signed?
    */
    get signed() {
        return this._signed;
    }

    /** 
    * Make the value signed.
    * @param {Boolean} x - Value is signed.
    */
    set signed(x) {
        this._signed = x;
        this._update();
    }

    /** 
    * Get the number of hexadecimal characters.
    */
    get numHexChars() {
        return Math.ceil(this._numBits / 4);
    }

    /** 
    * Get the maximum number of decimal characters.
    */
    get maxNumDecChars() {
        return (2 ** this._numBits).toString().length + 1;
    }

    /** 
    * Get the representation error.
    */
    get error() {
        return Math.abs(this._float - this._fixed);
    }

    /** 
    * Get the representation error in dB.
    */
    get error_dB() {
        return 20 * Math.log10(this.error);
    }

    /** 
    * Signed-ness correction when calculating value range.
    */
    get _signCorrection() {
        if (this._signed) {
            return 1;
        } else {
            return 0;
        }
    }

    /** 
    * Minimum floating-point value.
    */
    get minFloat() {
        if (this._signed) {
            return - (2 ** (this._numBits - this._numFracBits - 1));
        } else {
            return 0.0;
        }
    }

    /** 
    * Maximum floating-point value.
    */
    get maxFloat() {
        return (2 ** (this._numBits - this._numFracBits - this._signCorrection)) - (2 ** -this._numFracBits);
    }

    /** 
    * Minimum integer value.
    */
    get minInteger() {
        if (this._signed) {
            return - (2 ** (this._numBits - 1));
        } else {
            return 0;
        }
    }

    /** 
    * Maximum integer value.
    */
    get maxInteger() {
        return (2 ** (this._numBits - this._signCorrection)) - 1;
    }

    /** 
    * Floating-point value is in valid range.
    */
    get floatInRange() {
        return this._float <= this.maxFloat && this._float >= this.minFloat;
    }

    /** 
    * Integer value is in valid range.
    */
    get intInRange() {
        return this._int <= this.maxInteger && this._int >= this.minInteger;
    }

    /** 
    * Bit-mask for the integer value.
    */
    get _wordMask() {
        if (this._numBits < 64) {
            return ((BigInt(1) << BigInt(this._numBits)) - 1n);
        } else {
            return BigInt(0xFFFFFFFFFFFFFFFFn);
        }
    }

    /** 
    * Convert a string value to an integer.
    * @param {String} intstr - Integer value represented in a string.
    * @param {Integer} base - Numeric base for the conversion.
    * @return {Integer} Integer value.
    */
    _str2int(intstr, base) {
        var intval = BigInt(parseInt(intstr, base));
        if (!isNaN(Number(intval)) && base != 10) {
            if (this._signed && ((BigInt(0x1n) << BigInt(this._numBits - 1)) & intval)) {
                /* insert missing redundant sign bits for 32-bit internal representation */
                intval = (intval | (~this._wordMask));
            }
        }
        return intval;
    }

    /** 
    * Mask out-of-range bits.
    * @param {Integer} val - Value to mask.
    * @return {Integer} Masked integer value.
    */
    _maskInt(val) {
        if (!isNaN(Number(val))) {
            /* mask out-of-range bits */
            val = BigInt(val) & this._wordMask;
            /* force to unsigned to prevent a negative symbol */
            //val = val >>> 0;
        }
        return val;
    }

    /** 
    * Convert a fixed-point integer to its floating-point equivalent.
    * @param {Integer} val - Fixed-point value to convert.
    * @return {Number} Floating-point value.
    */
    _fixed2float(val) {
        return Number(val) / (2 ** this._numFracBits);
    }

    /** 
    * Convert a floating-point number to its fixed-point integer equivalent.
    * @param {Integer} val - Fixed-point value to convert.
    * @return {Number} Floating-point value.
    */
    _float2fixed(val) {
        return Math.round(val * (2 ** this._numFracBits));
    }

    /** 
    * Update values.
    */
    _update() {
        if (this.floatChanged) {
            this._int = this._float2fixed(this._float);
        } else {
            this._float = this._fixed2float(this._int);
        }
        this._fixed = this._fixed2float(this._int);
    }

}

/**
 * Set an error on the form element.
 * @param {String} elem - ID of a form element to which the error should apply.
 * @param {String} msg - Text of the error message.
 */
 function setError(elem, msg) {
    clearError(elem);
    $(elem).addClass('error');
    $(elem).siblings('div.error').remove();
    $(elem).after('<div class="error">' + msg + '</div>');
}

/**
 * Clear the error on the form element.
 * @param {String} elem - ID of a form element for which the error should be cleared.
 */
function clearError(elem) {
    $(elem).removeClass('error');
    $(elem).siblings('div.error').remove();
}

/** 
 * Update the fixed-point conversion and associated errors.
 * @param {String} _numBitsID - ID of the numBits form control.
 * @param {String} _numFracBitsID - ID of the numFracBits form control.
 * @param {String} _integerID - ID of the integer form control.
 * @param {String} _floatID - ID of the float form control.
 * @param {String} _signedID - ID of the signedness form control.
 * @param {FixedPointConverter} fixedPoint - The fixed-point value.
 * @param {Function} getFormat - Callback to get the integer format.
 * @param {Function} errorFn - Callback for handling errors.
 */
function updateFixedPointControls(_numBitsID, _numFracBitsID, _integerID, _floatID, _signedID, fixedPoint, getFormat, errorFn) {

    var _fmt = getFormat();

    // update the number of fractional bits control
    $(_numFracBitsID).find('option').remove().end();
    for (let i = fixedPoint.numBits; i >= 0; i--) {
        $(_numFracBitsID).append('<option value="' + i.toString() + '">' + i.toString() + '</option>');
    }
    $(_numFracBitsID).val(fixedPoint.numFracBits.toString());

    // update control values
    $(_numBitsID + ' option:selected').val(fixedPoint.numBits.toString());
    $(_signedID).prop('checked', fixedPoint.signed);

    // raise errors in UI
    var error = false;
    if (fixedPoint.floatChanged) {
        clearError(_integerID);
        if (isNaN(fixedPoint.float)) {
            errorFn(_floatID, 'Parse Error');
            error = true;
        } else if (!fixedPoint.floatInRange) {
            errorFn(_floatID, 'Out of Range');
            error = true;
        } else {
            clearError(_floatID);
        }
    } else {
        clearError(_floatID);
        $(_floatID).val(fixedPoint.float.toString());
        if (isNaN(Number(fixedPoint.int))) {
            errorFn(_integerID, 'Parse Error');
            error = true;
        } else if (!fixedPoint.intInRange) {
            errorFn(_integerID, 'Out of Range');
            error = true;
        } else {
            clearError(_integerID);
        }
    }
    if (!error) {
        switch (_fmt) {
            case 'hex':
                $(_integerID).attr('maxlength', fixedPoint.numHexChars.toString());
                $(_integerID).val(fixedPoint.hex);
                break;
            case 'bin':
                $(_integerID).attr('maxlength', fixedPoint.numBits.toString());
                $(_integerID).val(fixedPoint.bin);
                break;
            default:
                $(_integerID).attr('maxlength', fixedPoint.maxNumDecChars.toString());
                $(_integerID).val(fixedPoint.int.toString());
        }
    }
}

/** 
 * Add a handler for the num bits control.
 * @param {String} _numBitsControlID - ID of the numBits form control.
 * @param {FixedPointConverter} _fixedPoint - The fixed-point value.
 * @param {String} _numFracBitsControlID - ID of the numFracBits form control.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addNumBitsHandler(_numBitsControlID, _fixedPoint, _numFracBitsControlID, callback) {
    $(_numBitsControlID).change(function () {
        var oldNumBits = _fixedPoint.numBits;
        _fixedPoint.numBits = parseInt($(this).val());
        if (_fixedPoint.numBits < _fixedPoint.numFracBits) {
            _fixedPoint.numFracBits -= (oldNumBits - _fixedPoint.numBits);
        }
        $(_numFracBitsControlID).val(_fixedPoint.numFracBits.toString());
        callback();
    });
}

/** 
 * Add a handler for the num fractional bits control.
 * @param {String} _numFracBitsControlID - ID of the numFracBits form control.
 * @param {FixedPointConverter} _fixedPoint - The fixed-point value.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addNumFracBitsHandler(_numFracBitsControlID, _fixedPoint, callback) {
    $(_numFracBitsControlID).change(function () {
        _fixedPoint.numFracBits = parseInt($(this).val());
        callback();
    });
}

/** 
 * Add a handler for the num fractional bits control.
 * @param {String} _signedControlID - ID of the signedness form control.
 * @param {FixedPointConverter} _fixedPoint - The fixed-point value.
 * @param {String} _integerID - ID of the integer form control.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addSignedHandler(_signedControlID, _fixedPoint, _integerID, callback) {
    $(_signedControlID).change(function () {
        _fixedPoint.signed = $(this).prop('checked');
        if (!_fixedPoint.floatChanged) {
            $(_integerID).trigger('change');
        }
        callback();
    });
}


/** 
 * Add a handler for the format control.
 * @param {String} _formatControlID - ID of the format form control.
 * @param {String} _labelID - ID of the label for the integer control.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addFormatHandler(_formatControlID, _labelID, callback) {
    $(_formatControlID).change(function () {
        var _label;
        var _format = $(this).val();
        switch (_format) {
            case 'hex':
                _label = 'hexadecimal';
                break;
            case 'bin':
                _label = 'binary';
                break;
            default:
                _label = 'decimal';
        }
        $(_labelID).text(_label);
        callback(_format);
    });
}

/** 
 * Add a handler for the integer control.
 * @param {String} _intControlID - ID of the integer form control.
 * @param {String} _floatID - ID of the float form control.
 * @param {FixedPointConverter} _fixedPoint - The fixed-point value.
 * @param {Function} _getFormat - Callback to get the integer format.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addIntegerHandler(_intControlID, _floatID, _fixedPoint, _getFormat, callback) {
    var _fmt = _getFormat();
    $(_intControlID).change(function () {
        switch (_fmt) {
            case 'hex':
                _fixedPoint.hex = $(this).val();
                break;
            case 'bin':
                _fixedPoint.bin = $(this).val();
                break;
            default:
                _fixedPoint.int = parseInt($(this).val());
        }
        $(_intControlID).closest('.col.w75').addClass('locked');
        $(_floatID).closest('.col.w75').removeClass('locked');
        callback();
    });
}

/** 
 * Add a handler for the integer control.
 * @param {String} _floatControlID - ID of the float form control.
 * @param {String} _integerID - ID of the integer control.
 * @param {FixedPointConverter} _fixedPoint - The fixed-point value.
 * @param {Function} callback - Callback to execute after updating the form.
 */
function addFloatHandler(_floatControlID, _integerID, _fixedPoint, callback) {
    // updates following change of floating-point value
    $(_floatControlID).change(function () {
        var val = parseFloat($(this).val());
        _fixedPoint.float = val;
        $(_integerID).closest('.col.w75').removeClass('locked');
        $(_floatControlID).closest('.col.w75').addClass('locked');
        callback();
    });
}
