// Delta calibration script
const degreesToRadians = Math.PI / 180.0;
const MaxFactors = 16;
const AllTowers = [AlphaTower, BetaTower, GammaTower];

class Matrix
{
    constructor(rows, cols) {
        this.data = new Array(rows);
        for (var i = 0; i < rows; ++i) 
            this.data[i] = (new Array(cols)).fill(0.0);
    }

    SwapRows(i, j, numCols) {
        if (i !== j) {
            for (var k = 0; k < numCols; ++k) {
                var temp = this.data[i][k];
                this.data[i][k] = this.data[j][k];
                this.data[j][k] = temp;
            }
        }
    }

    // Perform Gauus-Jordan elimination on a matrix with numRows rows and (njumRows + 1) columns
    GaussJordan(solution, numRows) {
        for (var i = 0; i < numRows; ++i) {
            // Swap the rows around for stable Gauss-Jordan elimination
            var vmax = Math.abs(this.data[i][i]);
            for (var j = i + 1; j < numRows; ++j) {
                var rmax = Math.abs(this.data[j][i]);
                if (rmax > vmax) {
                    this.SwapRows(i, j, numRows + 1);
                    vmax = rmax;
                }
            }

            // Use row i to eliminate the ith element from previous and subsequent rows
            var v = this.data[i][i];
            for (var j = 0; j < i; ++j) {
                var factor = this.data[j][i]/v;
                this.data[j][i] = 0.0;
                for (var k = i + 1; k <= numRows; ++k) {
                    this.data[j][k] -= this.data[i][k] * factor;
                }
            }

            for (var j = i + 1; j < numRows; ++j) {
                var factor = this.data[j][i]/v;
                this.data[j][i] = 0.0;
                for (var k = i + 1; k <= numRows; ++k) {
                    this.data[j][k] -= this.data[i][k] * factor;
                }
            }
        }

        for (var i = 0; i < numRows; ++i) {
            solution.push(this.data[i][numRows] / this.data[i][i]);
        }
    }
}

class DeltaGeometry
{
    constructor(diagonalRod = 0, radius = 0, height = 0, endStopOffset = [0,0,0], towerOffset = [0,0,0], stepsPerUnit = [1,1,1], radiusAdjust = [0,0,0], diagonalRodAdjust = [0,0,0])
    {
        this.DiagonalRod = diagonalRod;
        this.DiagonalRodAdjust = diagonalRodAdjust.slice();
        this.Radius = radius;
        this.RadiusAdjust = radiusAdjust.slice();
        this.TowerOffset = towerOffset.slice();
        this.StepsPerUnit = stepsPerUnit.slice();
        this.Height = height;
        this.EndStopOffset = endStopOffset.slice();

        // these two need to be held in steps so steps/mm adjustment stays true
        this.EndStopOffsetSteps = endStopOffset.map((offset, tower) => offset * stepsPerUnit[tower]);
        this.HeightSteps = height * this.StepsPerUnit[AlphaTower];

        this.RecomputeGeometry();
    }

    Clone() {
        return new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit, this.RadiusAdjust, this.DiagonalRodAdjust);
    }

    RecomputeGeometry() {
        this.towerPositions = [
            [-((this.Radius + this.RadiusAdjust[AlphaTower]) * Math.cos((30 + this.TowerOffset[AlphaTower]) * degreesToRadians)),
            -((this.Radius + this.RadiusAdjust[AlphaTower]) * Math.sin((30 + this.TowerOffset[AlphaTower]) * degreesToRadians))],
            [+((this.Radius + this.RadiusAdjust[BetaTower]) * Math.cos((30 - this.TowerOffset[BetaTower]) * degreesToRadians)),
            -((this.Radius + this.RadiusAdjust[BetaTower]) * Math.sin((30 - this.TowerOffset[BetaTower]) * degreesToRadians))],
            [-((this.Radius + this.RadiusAdjust[GammaTower]) * Math.sin(this.TowerOffset[GammaTower] * degreesToRadians)),
            +((this.Radius + this.RadiusAdjust[GammaTower]) * Math.cos(this.TowerOffset[GammaTower] * degreesToRadians))]];

        // Up the mm properties from the calibrated steps.
        this.Height = this.HeightSteps / this.StepsPerUnit[AlphaTower];
        this.EndStopOffset = this.EndStopOffsetSteps.map((offset, tower) => offset / this.StepsPerUnit[tower]);

        // compute tower heigh in steps
        this.TowerHeightSteps = AllTowers.map(tower => (
            this.EndStopOffset[tower] +         // height from endstop to home position in mm
            this.Height +                       // height from home to carriage at touch in mm
            this.CarriagemmFromBottom([0, 0, 0], tower))   // height from carriage at touch to bed in mm
            * this.StepsPerUnit[tower]);        // convert to steps
    }

    GetCarriagePosition(position) {
        return AllTowers.map(tower => //Math.round // rounded to constrain to machine's adressable positions
            (this.TowerHeightSteps[tower] -
            (this.CarriagemmFromBottom(position, tower) * this.StepsPerUnit[tower]))); // fromBottom
    }

    CarriagemmFromBottom(machinePos, tower)
    {
        return machinePos[ZAxis] + Math.sqrt(Math.pow(this.DiagonalRod + this.DiagonalRodAdjust[tower],2) - Math.pow(machinePos[XAxis] - this.towerPositions[tower][XAxis],2) - Math.pow(machinePos[YAxis] - this.towerPositions[tower][YAxis],2));
    }

    GetZ(carriagePositions)
    {
        return this.GetEffectorPosition(carriagePositions)[ZAxis];
    }

    GetEffectorPosition(carriagePositions) {
        var p = AllTowers.map(tower => ({
            x: (this.towerPositions[tower][XAxis]),
            y: (this.towerPositions[tower][YAxis]),
            z: ((this.TowerHeightSteps[tower] - carriagePositions[tower]) / this.StepsPerUnit[tower]),
            r: this.DiagonalRod + this.DiagonalRodAdjust[tower]
        }));
        var results = trilaterate(p[0], p[1], p[2]);
        return [results[1].x, results[1].y, results[1].z];
    }
    
    ComputeDerivative(factor, carriagePositions)
    {
        var perturb = 0.2;
        var hiParams = this.Clone();
        var loParams = this.Clone();
        var adjust = Array(MaxFactors).fill(0.0);
        var factorMap = Array(MaxFactors).fill(true);

        adjust[factor] = perturb;
        hiParams.Adjust(factorMap, adjust);

        adjust[factor] = -perturb;
        loParams.Adjust(factorMap, adjust);

        var zHi = hiParams.GetZ(carriagePositions);
        var zLo = loParams.GetZ(carriagePositions);

        return (zHi - zLo) / (2 * perturb);
    }

    // Make all emndstop corrections positive and as small as possible
    NormaliseEndstopAdjustments()
    {
        var eav = Math.min.apply(null, this.EndStopOffset);
        this.EndStopOffset = this.EndStopOffset.map(v => v - eav);
        return eav;
    }

    Adjust(factors, corrections)
    {
        var i = 0;

        if (factors[0]) this.EndStopOffsetSteps[AlphaTower] += corrections[i++];
        if (factors[1]) this.EndStopOffsetSteps[BetaTower] += corrections[i++];
        if (factors[2]) this.EndStopOffsetSteps[GammaTower] += corrections[i++];
        if (factors[3]) this.Radius += corrections[i++];
        if (factors[4]) this.TowerOffset[AlphaTower] += corrections[i++];
        if (factors[5]) this.TowerOffset[BetaTower] += corrections[i++];
        if (factors[6]) this.DiagonalRod += corrections[i++];
        if (factors[7]) this.StepsPerUnit[AlphaTower] += corrections[i++];
        if (factors[8]) this.StepsPerUnit[BetaTower] += corrections[i++];
        if (factors[9]) this.StepsPerUnit[GammaTower] += corrections[i++];
        if (factors[10]) this.RadiusAdjust[AlphaTower] += corrections[i++];
        if (factors[11]) this.RadiusAdjust[BetaTower]  += corrections[i++];
        if (factors[12]) this.RadiusAdjust[GammaTower] += corrections[i++];
        if (factors[13]) this.DiagonalRodAdjust[AlphaTower] += corrections[i++];
        if (factors[14]) this.DiagonalRodAdjust[BetaTower] += corrections[i++];
        if (factors[15]) this.DiagonalRodAdjust[GammaTower] += corrections[i++];

        this.RecomputeGeometry();

        this.Height += this.NormaliseEndstopAdjustments();
        this.EndStopOffsetSteps = this.EndStopOffset.map((offset, tower) => offset * this.StepsPerUnit[tower]);
        this.HeightSteps = this.Height * this.StepsPerUnit[AlphaTower];

        this.RecomputeGeometry();
    
    }
    
    static Calibrate(currentGeometry, probeData, factors) 
    {
        var debug = false;
        var numFactors = 0;
        for (var i = 0; i < MaxFactors; i++)
            if (factors[i])
                numFactors++;
    
        var numPoints = probeData.DataPoints.length;
    
        if (numFactors > numPoints) {
            throw "Error: need at least as many points as factors you want to calibrate";
        }
    
        // Transform the probing points to motor endpoints and store them in a matrix, so that we can do multiple iterations using the same data
        var probedCarriagePositions = probeData.DataPoints.map(point => currentGeometry.GetCarriagePosition([point.X, point.Y, point.Z]));
        var corrections = new Array(numPoints).fill(0.0);
        var initialSumOfSquares = probeData.DataPoints.reduce((acc, val) => acc += Math.pow(val.Error, 2), 0.0);
        
        // Do 1 or more Newton-Raphson iterations
        var initialRms = Math.sqrt(initialSumOfSquares / numPoints);
        var previousRms = initialRms;
        var expectedRmsError;
        var bestRmsError = initialRms;
        var bestGeometry = currentGeometry.Clone();
        var bestResiduals = probeData;
        for (var iteration = 0; iteration<20; iteration++) {
            // Build a matrix of derivatives.
            var derivativeMatrix = new Matrix(numPoints, numFactors);
            for (var i = 0; i < numPoints; ++i) {
                var j = 0;
                for (var k = 0; k < MaxFactors; k++) {
                    if (factors[k]) {
                        derivativeMatrix.data[i][j++] =
                            currentGeometry.ComputeDerivative(k, probedCarriagePositions[i]);
                    }
                }
            }
    
            //console.log(derivativeMatrix);
    
            // Now build the normal equations for least squares fitting
            var normalMatrix = new Matrix(numFactors, numFactors + 1);
            for (var i = 0; i < numFactors; ++i) {
                for (var j = 0; j < numFactors; ++j) {
                    var temp = 0; 
                    for (var k = 0; k < numPoints; ++k) {
                        temp += derivativeMatrix.data[k][i] * derivativeMatrix.data[k][j];
                    }
                    normalMatrix.data[i][j] = temp;
                }
                var temp = 0; 
                for (var k = 0; k < numPoints; ++k) {
                    temp += derivativeMatrix.data[k][i] * -(probeData.DataPoints[k].Error + corrections[k]);
                }
                normalMatrix.data[i][numFactors] = temp;
            }
    
            var solution = [];
            normalMatrix.GaussJordan(solution, numFactors);
            
            for (var i = 0; i < numFactors; ++i) {
                if (isNaN(solution[i])) {
                    throw "Unable to calculate corrections. Please make sure the bed probe points are all distinct.";
                }
            }
    
            if (debug) {
                // Calculate and display the residuals
                var residuals = [];
                for (var i = 0; i < numPoints; ++i) {
                    var r = probeData.DataPoints[i].Error;
                    for (var j = 0; j < numFactors; ++j) {
                        r += solution[j] * derivativeMatrix.data[i][j];
                    }
                    residuals.push(r);
                }
            }
    
            currentGeometry.Adjust(factors, solution);
    
            // Calculate the expected probe heights using the new parameters
            {
                var expectedResiduals = new Array(numPoints);
                var sumOfSquares = 0.0;
                for (var i = 0; i < numPoints; ++i) {
                    var effector = currentGeometry.GetEffectorPosition(probedCarriagePositions[i]);
                    var correction = effector[ZAxis] - probeData.DataPoints[i].Z;
                    corrections[i] = correction;
                    expectedResiduals[i] = probeData.DataPoints[i].Error + correction;
                    sumOfSquares += Math.pow(expectedResiduals[i], 2);
                }
    
                expectedRmsError = Math.sqrt(sumOfSquares/numPoints);
                //console.log("Iteration " + iteration + " delta rms " + (expectedRmsError < previousRms ? "-" : "+") + Math.log10(Math.abs(expectedRmsError - previousRms)) + " improvement on initial " + (expectedRmsError - initialRms));
                previousRms = expectedRmsError;
            }
    
            if (expectedRmsError < bestRmsError) {
                bestRmsError = expectedRmsError;
                bestGeometry = currentGeometry.Clone();
                bestResiduals = expectedResiduals;
                iteration = 0;
            }
        }
        console.log("Calibrated " + numFactors + " factors using " + numPoints + " points, deviation before " + Math.sqrt(initialSumOfSquares / numPoints) + " after " + bestRmsError);
        
        return {
            Geometry: bestGeometry,
            RMS: bestRmsError,
            Min: Math.min.apply(null, bestResiduals),
            Max: Math.max.apply(null, bestResiduals),
            Residuals: bestResiduals
        };
    }
}
