// common classes and utilities.

const XAxis = 0;
const YAxis = 1;
const ZAxis = 2;
const AlphaTower = 0;
const BetaTower = 1;
const GammaTower = 2;

class ProbingData{
    constructor(observable = ko.observable())
    {
        this.DataPoints = [];
        this.Max = undefined;
        this.Min = undefined;
        this.RMS = undefined;
        this.Observable = observable;
        this.sumOfSquares = 0;
        this.Observable(this);
    }

    AddPoint(x, y, z, error)
    {
        this.DataPoints.push({ X: x, Y: y, Z: z, Error: error });

        if (this.Max === undefined || error > this.Max)
            this.Max = error;

        if (this.Min === undefined || error < this.Min)
            this.Min = error;

        this.sumOfSquares += error * error;

        this.RMS = Math.sqrt(this.sumOfSquares / this.DataPoints.length);

        this.Observable(this);
    }
}

class CollapseControl {
    constructor(id) {
        this.controlElement = $(id)[0];
    }

    IsCollapsed() {
        return this.controlElement.classList.contains("collapsed");
    }

    Toggle() {
        this.controlElement.click();
    }

    Hide() {
        if (!this.IsCollapsed()) {
            this.Toggle();
        }
    }

    Show() {
        if (this.IsCollapsed()) {
            this.Toggle();
        }
    }
}

class DuCalUtils
{
    static GetSpiralPoints(n, radius) {
        var a = radius / (2 * Math.sqrt(n * Math.PI));
        var step_length = radius * radius / (2 * a * n);
    
        var result = new Array(n);
    
        for (var i = 0; i < n; i++) {
            var angle = Math.sqrt( 2 * (i * step_length) / a);
            var r = angle * a;
    
            // polar to cartesian
            var x = r * Math.cos(angle);
            var y = r * Math.sin(angle);
            result[i] = [x, y];
        }    
        return result;
    }
}

