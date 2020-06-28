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

    AddPoint(probe)
    {
        this.DataPoints.push(probe);

        if (this.Max === undefined || probe.Error > this.Max)
            this.Max = probe.Error;

        if (this.Min === undefined || probe.Error < this.Min)
            this.Min = probe.Error;

        this.sumOfSquares += probe.Error * probe.Error;

        this.RMS = Math.sqrt(this.sumOfSquares / this.DataPoints.length);

        this.Observable(this);
    }
}

class ProbePoint
{
    constructor(target, actual)
    {
        this.Target = target;
        this.Actual = actual;
    }

    get X()
    {
        return this.Actual[XAxis];
    }

    get Y()
    {
        return this.Actual[YAxis];
    }

    get Z()
    {
        return this.Actual[ZAxis];
    }

    get DeltaVector()
    {
        return [
            this.Actual[XAxis] - this.Target[XAxis],
            this.Actual[YAxis] - this.Target[YAxis],
            this.Actual[ZAxis] - this.Target[ZAxis]
        ];
    }

    get DeltaMagnitude()
    {
        var dv = this.DeltaVector;
        return Math.sqrt(
            Math.pow(dv[XAxis],2) +
            Math.pow(dv[YAxis],2) +
            Math.pow(dv[ZAxis],2));
    }
    
    get Error()
    {
        return this.DeltaVector[ZAxis];
    }
}

class CollapseControl {
    constructor(id) {
        //this.controlElement = $(id);
        //this.controlElement.collapse();
        this.name=id;
        this.visible = ko.observable(false);
    }

    IsCollapsed() {
        return this.controlElement.classList.contains("collapsed");
    }

    Toggle(self, c) {
        self.visible(!self.visible());
    }

    Hide() {
        this.visible(false);
    }

    Show() {
        this.visible(true);
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

    static Normalize(arr)
    {
        var factor = Math.min.apply(null, arr);
        for(var i = 0 ; i<arr.length; i++)
            arr[i] -= factor;
        return factor;
    }
}

