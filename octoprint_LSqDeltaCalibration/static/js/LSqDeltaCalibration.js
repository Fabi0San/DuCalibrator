/*
 * View model for OctoPrint-LSqDeltaCalibration
 *
 * Author: Fabio Santos
 * License: AGPLv3
 */
class LsqDeltaCalibrationViewModel {
    constructor(parameters) {

        // dependencies
        this.settingsViewModel = parameters[0];
        this.printerProfilesViewModel = parameters[1];

        // privates
        this.trialNumber = 0;
        this.plot = undefined;
        this.zScaleInfo = undefined;
        this.settings = undefined;

        //config
        this.isSimulation = ko.observable(true);
        this.isTest = ko.observable(true);
        this.probeRadius = ko.observable(this.printerProfilesViewModel.currentProfileData().volume.width() / 2);
        this.probePointCount = ko.observable(50);

        // UI control
        this.isGeometryKnown = ko.observable(false);
        this.isReadyForCommands = function () { return (this.isSimulation() || this.isPrinterReady()) && !this.isProbing && !this.isFetchingGeometry; };
        this.isPrinterReady = ko.observable(false);
        this.isFetchingGeometry = false;
        this.isProbing = false;
        this.isReadyToCalibrate = ko.observable(false);

        this.plotDivElement = $("#surfacePlotDiv")[0];
        this.GeometryControl = new CollapseControl("#collapseGeometryControl");
        this.PlotControl = new CollapseControl("#collapsePlotControl");
        this.CalibrationControl = new CollapseControl("#collapseCalibrationControl");

        // Observable data
        this.currentGeometry = ko.observable(new DeltaGeometry());
        this.newGeometry = ko.observable(new DeltaGeometry());
        this.ProbedData = new ProbingData().Observable;
        this.CalibratedData = ko.observable(undefined);
        this.probedGeometries = ko.observableArray([]);

        this.calibrate =
            {
                StepsPerUnit: ko.observable(false),
                EndStopOffset: ko.observable(true),
                TowerOffset: ko.observable(true),
                RodLength: ko.observable(true),
                RodLenghtAdjust: ko.observable(false),
                DeltaRadius: ko.observable(true),
                DeltaRadiusAdjust: ko.observable(false),
                MaxHeight: ko.observable(true)
            };

        this.calibrate.StepsPerUnit.subscribe(this.computeCorrections, this);
        this.calibrate.EndStopOffset.subscribe(this.computeCorrections, this);
        this.calibrate.TowerOffset.subscribe(this.computeCorrections, this);
        this.calibrate.RodLength.subscribe(this.computeCorrections, this);
        this.calibrate.RodLenghtAdjust.subscribe(this.computeCorrections, this);
        this.calibrate.DeltaRadius.subscribe(this.computeCorrections, this);
        this.calibrate.DeltaRadiusAdjust.subscribe(this.computeCorrections, this);
        this.calibrate.MaxHeight.subscribe(this.computeCorrections, this);

        // test strings
        this.simulatedM503 = ["Send: M503", "Recv: ; config override present: /sd/config-override", "Recv: ;Steps per unit:", "Recv: M92 X400.00000 Y400.00000 Z400.00000", "Recv: ;Acceleration mm/sec^2:", "Recv: M204 S1000.00000", "Recv: ;X- Junction Deviation, Z- Z junction deviation, S - Minimum Planner speed mm/sec:", "Recv: M205 X0.05000 Z-1.00000 S0.00000", "Recv: ;Max cartesian feedrates in mm/sec:", "Recv: M203 X300.00000 Y300.00000 Z300.00000 S-1.00000", "Recv: ;Max actuator feedrates in mm/sec:", "Recv: M203.1 X250.00000 Y250.00000 Z250.00000", "Recv: ;Optional arm solution specific settings:", "Recv: M665 L330.0000 R170.4959", "Recv: ;Digipot Motor currents:", "Recv: M907 X1.00000 Y1.00000 Z1.00000 A1.50000", "Recv: ;E Steps per mm:", "Recv: M92 E140.0000 P57988", "Recv: ;E Filament diameter:", "Recv: M200 D0.0000 P57988", "Recv: ;E retract length, feedrate:", "Recv: M207 S3.0000 F2700.0000 Z0.0000 Q6000.0000 P57988", "Recv: ;E retract recover length, feedrate:", "Recv: M208 S0.0000 F480.0000 P57988", "Recv: ;E acceleration mm/sec��:", "Recv: M204 E500.0000 P57988", "Recv: ;E max feed rate mm/sec:", "Recv: M203 E50.0000 P57988", "Recv: ;PID settings:", "Recv: M301 S0 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S0 P300.0000", "Recv: ;PID settings:", "Recv: M301 S1 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S1 P300.0000", "Recv: ;Home offset (mm):", "Recv: M206 X0.00 Y0.00 Z0.00", "Recv: ;Trim (mm):", "Recv: M666 X-0.488 Y-0.013 Z-0.106", "Recv: ;Max Z", "Recv: M665 Z236.6025", "Recv: ;Probe feedrates Slow/fast(K)/Return (mm/sec) max_z (mm) height (mm) dwell (s):", "Recv: M670 S5.00 K200.00 R200.00 Z230.00 H1.00 D0.00", "Recv: ;Probe offsets:", "Recv: M565 X0.00000 Y0.00000 Z0.00000", "Recv:", "Recv: ok"];
        this.simulatedG29 = ["Send: G29.1 P1", "Recv: PROBE: X0.0000, Y0.0000, Z0.0050", "Recv: PROBE: X-10.4060, Y-4.4403, Z0.0050", "Recv: PROBE: X4.7416, Y-15.2813, Z0.0300", "Recv: PROBE: X19.3953, Y-2.7970, Z0.0125", "Recv: PROBE: X15.6567, Y16.3361, Z0.0025", "Recv: PROBE: X-1.8369, Y25.2314, Z0.0150", "Recv: PROBE: X-20.4358, Y18.7184, Z0.0175", "Recv: PROBE: X-29.9018, Y1.3715, Z0.0275", "Recv: PROBE: X-26.3793, Y-18.1144, Z0.0450", "Recv: PROBE: X-11.9836, Y-31.7552, Z0.0525", "Recv: PROBE: X7.6122, Y-34.9579, Z0.0325", "Recv: PROBE: X25.8929, Y-27.1580, Z0.0125", "Recv: PROBE: X37.5949, Y-11.0736, Z-0.0550", "Recv: PROBE: X39.8532, Y8.7019, Z-0.0725", "Recv: PROBE: X32.4465, Y27.1887, Z-0.0400", "Recv: PROBE: X17.3777, Y40.2246, Z-0.0625", "Recv: PROBE: X-1.9211, Y45.2140, Z-0.0300", "Recv: PROBE: X-21.4938, Y41.4007, Z0.0050", "Recv: PROBE: X-37.6772, Y29.7393, Z0.0100", "Recv: PROBE: X-47.7073, Y12.4905, Z0.0300", "Recv: PROBE: X-50.0630, Y-7.3281, Z0.0800", "Recv: PROBE: X-44.5526, Y-26.5154, Z0.0900", "Recv: PROBE: X-32.1853, Y-42.1913, Z0.0775", "Recv: PROBE: X-14.8893, Y-52.1758, Z0.0800", "Recv: PROBE: X4.8530, Y-55.2128, Z0.0425", "Recv: PROBE: X24.3901, Y-51.0404, Z0.0300", "Recv: PROBE: X41.2544, Y-40.3246, Z0.0000", "Recv: PROBE: X53.4440, Y-24.4896, Z-0.0425", "Recv: PROBE: X59.6152, Y-5.4801, Z-0.0775", "Recv: PROBE: X59.1748, Y14.5034, Z-0.1100", "Recv: PROBE: X52.2807, Y33.2675, Z-0.0700", "Recv: PROBE: X39.7627, Y48.8562, Z-0.0925", "Recv: PROBE: X22.9838, Y59.7306, Z-0.0725", "Recv: PROBE: X3.6642, Y64.8889, Z-0.0600", "Recv: PROBE: X-16.3106, Y63.9216, Z-0.0475", "Recv: PROBE: X-35.0764, Y57.0057, Z0.0050", "Recv: PROBE: X-50.9580, Y44.8474, Z0.0025", "Recv: PROBE: X-62.6020, Y28.5831, Z0.0425", "Recv: PROBE: X-69.0710, Y9.6540, Z0.0900", "Recv: PROBE: X-69.8942, Y-10.3343, Z0.0725", "Recv: PROBE: X-65.0756, Y-29.7518, Z0.0375", "Recv: PROBE: X-55.0637, Y-47.0743, Z0.0475", "Recv: PROBE: X-40.6905, Y-60.9941, Z0.0575", "Recv: PROBE: X-23.0859, Y-70.5056, Z0.1000", "Recv: PROBE: X-3.5774, Y-74.9613, Z0.0825", "Recv: PROBE: X16.4156, Y-74.0981, Z0.0400", "Recv: PROBE: X35.4875, Y-68.0341, Z0.0925", "Recv: PROBE: X52.3408, Y-57.2402, Z0.0300", "Recv: PROBE: X65.8683, Y-42.4895, Z-0.0125", "Recv: PROBE: X75.2157, Y-24.7911, Z-0.0525", "Recv: max: 0.1000, min: -0.1100, delta: 0.2100", "Recv: ok"];
        
        this.simulatedM503 = ["Send: M503", "Recv: ; config override present: /sd/config-override", "Recv: ;Steps per unit:", "Recv: M92 X400.00000 Y400.00000 Z400.00000", "Recv: ;Acceleration mm/sec^2:", "Recv: M204 S1000.00000", "Recv: ;X- Junction Deviation, Z- Z junction deviation, S - Minimum Planner speed mm/sec:", "Recv: M205 X0.05000 Z-1.00000 S0.00000", "Recv: ;Max cartesian feedrates in mm/sec:", "Recv: M203 X300.00000 Y300.00000 Z300.00000 S-1.00000", "Recv: ;Max actuator feedrates in mm/sec:", "Recv: M203.1 X250.00000 Y250.00000 Z250.00000", "Recv: ;Optional arm solution specific settings:", "Recv: M665 L330.0000 R170", "Recv: ;Digipot Motor currents:", "Recv: M907 X1.00000 Y1.00000 Z1.00000 A1.50000", "Recv: ;E Steps per mm:", "Recv: M92 E140.0000 P57988", "Recv: ;E Filament diameter:", "Recv: M200 D0.0000 P57988", "Recv: ;E retract length, feedrate:", "Recv: M207 S3.0000 F2700.0000 Z0.0000 Q6000.0000 P57988", "Recv: ;E retract recover length, feedrate:", "Recv: M208 S0.0000 F480.0000 P57988", "Recv: ;E acceleration mm/sec��:", "Recv: M204 E500.0000 P57988", "Recv: ;E max feed rate mm/sec:", "Recv: M203 E50.0000 P57988", "Recv: ;PID settings:", "Recv: M301 S0 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S0 P300.0000", "Recv: ;PID settings:", "Recv: M301 S1 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S1 P300.0000", "Recv: ;Home offset (mm):", "Recv: M206 X0.00 Y0.00 Z0.00", "Recv: ;Trim (mm):", "Recv: M666 X0 Y0 Z0", "Recv: ;Max Z", "Recv: M665 Z236.6025", "Recv: ;Probe feedrates Slow/fast(K)/Return (mm/sec) max_z (mm) height (mm) dwell (s):", "Recv: M670 S5.00 K200.00 R200.00 Z230.00 H1.00 D0.00", "Recv: ;Probe offsets:", "Recv: M565 X0.00000 Y0.00000 Z0.00000", "Recv:", "Recv: ok"];
       /* this.simulatedG29 = ["Send: G29.1 P1",
            "Recv: PROBE: X0.0000, Y0.0000, Z0.0000",
            "Recv: PROBE: X0.0, Y80, Z10.0000",
            "Recv: PROBE: X-70, Y-40, Z-10",
            "Recv: PROBE: X70, Y-40, Z-10",
            "Recv: ok"];
          */

        this.ar = new AsyncRequestor(req => OctoPrint.control.sendGcode(req));
    }

    onSettingsBeforeSave()
        {
            this.geometryElementParsers = [
                new GeometryElementParser(this.settings.cmdStepsPerUnit(), this.settings.idsStepsPerUnit(), function(geometry, value) { geometry.StepsPerUnit = value }, function (geometry) { return geometry.StepsPerUnit }),
                new GeometryElementParser(this.settings.cmdEndStopOffset(), this.settings.idsEndStopOffset(), function(geometry, value) { geometry.EndStopOffset = value }, function (geometry) { return geometry.EndStopOffset }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsTowerAngleOffset(), function(geometry, value) { geometry.TowerOffset = value }, function (geometry) { return geometry.TowerOffset }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusOffset(), function(geometry, value) { geometry.RadiusAdjust = value }, function (geometry) { return geometry.RadiusAdjust }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRodLenOffset(), function(geometry, value) { geometry.DiagonalRodAdjust = value }, function (geometry) { return geometry.DiagonalRodAdjust }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[0], function(geometry, value) { geometry.Radius = value }, function (geometry) { return geometry.Radius }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[1], function(geometry, value) { geometry.Height = value }, function (geometry) { return geometry.Height }),
                new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[2], function(geometry, value) { geometry.DiagonalRod = value }, function (geometry) { return geometry.DiagonalRod }),
            ];
        }

    onBeforeBinding(){
        this.settings = this.settingsViewModel.settings.plugins.LSqDeltaCalibration;
        this.onSettingsBeforeSave();
    }

    //hooks
    fromCurrentData(data) {
        this.ar.ReceiveResponse(data.logs);
        this.parseResponse(data.logs);
        this.fromHistoryData(data);
    }

    fromHistoryData(data) {
        this.isPrinterReady(data.state.flags.ready);
    }

    // events
    onProbingFinished() {
        this.probedGeometries.unshift({
            Name: "Trial #" + this.trialNumber++,
            Timestamp: new Date().toLocaleString(),
            RMS: this.ProbedData.peek().RMS.toFixed(3),
            Geometry: this.currentGeometry().Clone()
        });

        this.isReadyToCalibrate(true);
        this.computeCorrections();
        this.GeometryControl.Hide();
        this.CalibrationControl.Show();
    }

    onFetchGeoFinished() {
        this.isGeometryKnown(true);
        this.resetCalibrationData();
        this.GeometryControl.Show();
        this.PlotControl.Hide();
    }

    // helpers
    resetProbeData() {
        this.isReadyToCalibrate(false);
        new ProbingData(this.ProbedData);

        if (this.plot) {
            this.plot.geometry.dispose();
            this.plot = null;
        }

        if (this.plotDivElement.firstChild)
            this.plotDivElement.removeChild(this.plotDivElement.firstChild);
        //this.PlotControl.Hide();
    }

    resetCalibrationData() {
        this.CalibratedData(undefined);
        this.CalibrationControl.Hide();
    }
       
    computeCorrections() {
        var factors = [
            this.calibrate.EndStopOffset(),
            this.calibrate.EndStopOffset(),
            this.calibrate.EndStopOffset(),
            this.calibrate.DeltaRadius(),
            this.calibrate.TowerOffset(),
            this.calibrate.TowerOffset(),
            this.calibrate.RodLength(),
            this.calibrate.StepsPerUnit(),
            this.calibrate.StepsPerUnit(),
            this.calibrate.StepsPerUnit(),
            this.calibrate.DeltaRadiusAdjust(),
            this.calibrate.DeltaRadiusAdjust(),
            this.calibrate.DeltaRadiusAdjust() && !this.calibrate.DeltaRadius(),
            this.calibrate.RodLenghtAdjust(),
            this.calibrate.RodLenghtAdjust(),
            this.calibrate.RodLenghtAdjust() && !this.calibrate.RodLength(),
            /*this.calibrate.MaxHeight()*/];

        var result = DoDeltaCalibration(this.currentGeometry().Clone(), this.ProbedData(), factors);
        this.CalibratedData(result);
        this.newGeometry(result.Geometry);
        
        console.log(result);
    }

    // 3d visualization
    preparePlot(surfacePlotDiv, bedRadius, probeCount) {
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        //scene.fog = new THREE.FogExp2(0xffffff, 0.002);
        var renderer = new THREE.WebGLRenderer();

        renderer.setSize(surfacePlotDiv.clientWidth, surfacePlotDiv.clientHeight);
        if (surfacePlotDiv.firstChild) surfacePlotDiv.removeChild(surfacePlotDiv.firstChild);
        surfacePlotDiv.appendChild(renderer.domElement);

        // add the bed plate for reference
        scene.add(
            new THREE.Mesh(
                (new THREE.CylinderBufferGeometry(bedRadius, bedRadius, 0.001, 32))
                    .rotateX(Math.PI / 2),
                new THREE.MeshBasicMaterial({ color: 0x8080FF, opacity: 0.6, transparent: true })));

        // Axes arrows
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(bedRadius, 0, 0), new THREE.Vector3(-bedRadius, -bedRadius, 0), bedRadius / 2, 0xff0000));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, bedRadius, 0), new THREE.Vector3(-bedRadius, -bedRadius, 0), bedRadius / 2, 0x00ff00));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, bedRadius), new THREE.Vector3(-bedRadius, -bedRadius, 0), bedRadius / 2, 0x0000ff));

        var geometry = new THREE.BufferGeometry();
        var vertices = new Float32Array(probeCount * 3).fill(0); // x,y,z
        geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

        var particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xff0000, size: 5, sizeAttenuation: true }));
        particles.geometry.setDrawRange(0, 0);

        scene.add(particles);

        // camera
        var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(0, -bedRadius * 4, bedRadius);
        var controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.minDistance = 10;
        controls.maxDistance = bedRadius * 5;


        var animate = function () {
            requestAnimationFrame(animate);

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        return particles;

    }

    logProbePoint(x, y, z) {
        this.ProbedData.peek().AddPoint(x, y, 0, z);
        this.plot.geometry.scale(1, 1, this.adjustZScale(this.zScaleInfo, z));

        this.plot.geometry.attributes.position.setXYZ(this.ProbedData.peek().DataPoints.length - 1, x, y, z * this.zScaleInfo.zScale);
        this.plot.geometry.setDrawRange(0, this.ProbedData.peek().DataPoints.length);
        this.plot.geometry.attributes.position.needsUpdate = true;
    }

    adjustZScale(zScaleInfo, z) {
        if ((zScaleInfo.maxZ === undefined) || (z > zScaleInfo.maxZ))
            zScaleInfo.maxZ = z;
        if ((zScaleInfo.minZ === undefined) || (z < zScaleInfo.minZ))
            zScaleInfo.minZ = z;

        if (zScaleInfo.maxZ === zScaleInfo.minZ)
            return 1;

        var oldScale = zScaleInfo.zScale;
        var newScale = zScaleInfo.normalizeTo / (zScaleInfo.maxZ - zScaleInfo.minZ);
        zScaleInfo.zScale = newScale;

        return newScale / oldScale;
    }

    // Printer interface

    parseResponse(logLines) {
        var stepsPerUnitRegex = /M92 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/;
        var endStopOffsetRegex = /M666 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/;
        var radiusOffsetRegex = /M665 .*A(-?\d+\.?\d*) B(-?\d+\.?\d*) C(-?\d+\.?\d*).*/;
        var towerOffsetRegex = /M665 .*D(-?\d+\.?\d*) E(-?\d+\.?\d*) H(-?\d+\.?\d*)/;
        var rodLenAndRadiusRegex = /M665 .*L(-?\d+\.?\d*) R(-?\d+\.?\d*)/;
        var maxHeightRegex = /M665 .*Z(-?\d+\.?\d*)/;
        var probePointRegex = /PROBE: X(-?\d+\.?\d*), Y(-?\d+\.?\d*), Z(-?\d+\.?\d*)/;
        var match;

        var newGeometry = this.currentGeometry();
        for (var i = 0; i < logLines.length; i++) {

            if (this.isFetchingGeometry) {
                if (match = stepsPerUnitRegex.exec(logLines[i])) {
                    newGeometry.StepsPerUnit = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }

                if (match = endStopOffsetRegex.exec(logLines[i])) {
                    newGeometry.EndStopOffset = [parseFloat(match[1]) * -1, parseFloat(match[2]) * -1, parseFloat(match[3]) * -1];
                }

                if (match = towerOffsetRegex.exec(logLines[i])) {
                    newGeometry.TowerOffset = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }

                if (match = radiusOffsetRegex.exec(logLines[i])) {
                    newGeometry.RadiusAdjust = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }

                if (match = rodLenAndRadiusRegex.exec(logLines[i])) {
                    newGeometry.DiagonalRod = parseFloat(match[1]);
                    newGeometry.Radius = parseFloat(match[2]);
                }

                if (match = maxHeightRegex.exec(logLines[i])) {
                    newGeometry.Height = parseFloat(match[1]);
                }
            }

            if (this.isProbing) {
                if (match = probePointRegex.exec(logLines[i])) {
                    this.logProbePoint(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
                }
            }

            if (logLines[i] === "Recv: ok") {
                if (this.isProbing) {
                    this.isProbing = false;
                    this.onProbingFinished();
                }

                if (this.isFetchingGeometry) {
                    this.isFetchingGeometry = false;
                    this.onFetchGeoFinished();
                }
            }
        }

        this.currentGeometry(newGeometry);
    }

    SendGeometryToMachine(geometry) {
        OctoPrint.control.sendGcode(
            ["M92 X" + geometry.StepsPerUnit[0].toFixed(4) + " Y" + geometry.StepsPerUnit[1].toFixed(4) + " Z" + geometry.StepsPerUnit[2].toFixed(4),
            "M666 X" + (geometry.EndStopOffset[0] * -1).toFixed(4) + " Y" + (geometry.EndStopOffset[1] * -1).toFixed(4) + " Z" + (geometry.EndStopOffset[2] * -1).toFixed(4),
            "M665 A" + geometry.RadiusAdjust[0].toFixed(4) + " B" + geometry.RadiusAdjust[1].toFixed(4) + " C" + geometry.RadiusAdjust[2].toFixed(4),
            "M665 D" + geometry.TowerOffset[0].toFixed(4) + " E" + geometry.TowerOffset[1].toFixed(4) + " H" + geometry.TowerOffset[2].toFixed(4),
            "M665 L" + geometry.DiagonalRod.toFixed(4) + " R" + geometry.Radius.toFixed(4) + " Z" + geometry.Height.toFixed(4)], null);
    }

    // ui commands
    configureGeometry() {
        this.ConfigureGeometry(this.newGeometry());
    }

    ConfigureGeometry(geometry) {
        if (this.isPrinterReady())
            this.SendGeometryToMachine(geometry);
        this.currentGeometry(geometry);
        this.GeometryControl.Show();
        this.resetProbeData();
        this.resetCalibrationData();
        this.PlotControl.Hide();
    }

    probeBed() {
        this.isProbing = true;
        this.resetProbeData();

        var radius = this.printerProfilesViewModel.currentProfileData().volume.width() / 2;

        this.zScaleInfo = {
            minZ: undefined,
            maxZ: undefined,
            zScale: 1,
            normalizeTo: radius / 3
        };


        this.plot = this.preparePlot(
            this.plotDivElement,
            radius,
            this.probePointCount());

        this.PlotControl.Show();

        if (this.isTest()) {
            var points = SpiralPoints(this.probePointCount(), this.probeRadius());
            var geo = this.currentGeometry().Clone();
            var positions = points.map((point) => geo.GetCarriagePosition([point[0], point[1], 0]));
            //geo.DiagonalRod += 1;
            //geo.Radius += 1;
            //geo.TowerOffset[1] += 1;
            geo = geo.Clone();
            var newPoints = positions.map((pos) => geo.GetEffectorPosition([(pos[0]), (pos[1]), (pos[2])]));
            newPoints.map(point => (this.logProbePoint(point[0], point[1], point[2])));
            this.onProbingFinished();
            return;
        }

        if (this.isPrinterReady())
            OctoPrint.control.sendGcode(`G29.1 P1 I${this.probePointCount()} J${this.probeRadius()}`, null);
        else this.parseResponse(this.simulatedG29);

    }

    fetchGeometry() {
        //debugger;
        this.resetProbeData();
        this.isFetchingGeometry = true;
        if (this.isPrinterReady())
            this.ar.Query("M503", str => str.includes("Recv: ok"), 3000).then(value => this.parseResponse(value));
            //OctoPrint.control.sendGcode("M503", null);
        else this.parseResponse(this.simulatedM503);
    }

    LoadGeometry(data) {
        this.ConfigureGeometry(data.Geometry);
    }
        
    request(type, command, args, successCb) {
        var data = function data() {
            if (command && args) return JSON.stringify({ command: command, args: args });
            if (command) return JSON.stringify({ command: command });
        };
        $.ajax({
            url: '/api' + PLUGIN_BASEURL + 'LSqDeltaCalibration',
            type: type,
            dataType: 'json',
            data: data(),
            contentType: 'application/json; charset=UTF-8',
            success: function success(data) {
                if (successCb) successCb(data);
            }
        });
    }

}

class GeometryElementParser {
    constructor(command, element, setFunction, getFunction)
    {
        this.command = command;
        this.element = element && element.length > 0 ? Array.from(element) : new Array(0);
        this.setFunction = setFunction;
        this.getFunction = getFunction;
        this.regex = this.element.map( e => new RegExp(`${command} .*${e}(-?\\d+\\.?\\d*)`));
    }

    ParseLog(logLine, geometry)
    {
        debugger;
        if(this.element.length == 0)
        {
            return;    
        }

        var match;

        if(this.element.length == 1)
        {
            if(match = this.regex.exec(logLine))
                this.setFunction(geometry, parseFloat(match[1]));    
            return;
        }

        var result = this.getFunction(geometry);
        for (let i = 0; i < this.regex.length; i++) {
            if(match = this.regex[i].exec(logLine))
                result[i] = parseFloat(match[1])
            const element = this.regex[i];            
        }

        this.setFunction(geometry, result);
    }

    GetCommand(geometry)
    {
        if(this.element.length == 0)
        {
            return;    
        }

        if(this.element.length == 1)
        {
            return `${this.command} ${this.element}${this.getFunction(geometry)}`;
        }

        var value = this.getFunction(geometry);
        var result = this.command;
        for (let i = 0; i < this.element.length; i++) {
            result += ` ${this.element[i]}${value[i].toFixed(4)}`;            
        }

        return result;
    }
}

class AsyncRequestor {
    constructor(sendRequestFunction) {
        this.requestQueue = [];
        this.currentRequest = null;
        this.sendRequestFunction = sendRequestFunction;
    }

    Query(query, isFinished, timeout) {
        return new Promise((resolve, reject) => this.Executor(query, isFinished, timeout, resolve, reject));
    }

    Executor(query, isFinished, timeout, resolve, reject) {
        this.requestQueue.push({ query: query, isFinished: isFinished, timeout: timeout, resolve: resolve, reject: reject, response: [], timeoutHandle: null});
        this.TryDequeue();
    }

    TryDequeue() {
        if (this.currentRequest === null && this.requestQueue.length > 0) {
            var request = this.requestQueue.shift();
            this.StartRequest(request);
        }
    }

    ReceiveResponse(data) {
        if (this.currentRequest !== null) {
            var request = this.currentRequest;
            request.response = request.response.concat(data);
            if (request.isFinished(data)) {
                this.EndRequest();
                request.resolve(request.response);
            }
        }
        else {
            this.TryDequeue();
        }
    }

    StartRequest(request) {
        this.currentRequest = request;
        this.sendRequestFunction(request.query);
        if (request.timeout) 
            request.timeoutHandle = setTimeout(this.Timeout, request.timeout, request, this);
    }

    EndRequest() {
        if (this.currentRequest.timeoutHandle)
            clearTimeout(this.currentRequest.timeoutHandle);
        this.currentRequest = null;
        this.TryDequeue();
    }

    Timeout(request, self) {
        if (self.currentRequest === request) {
            self.EndRequest();
            request.reject(request.response);
        }
    }
}

$(function () {
    /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
    OCTOPRINT_VIEWMODELS.push({
        construct: LsqDeltaCalibrationViewModel,
        // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
        dependencies: [ /* "loginStateViewModel", */ "settingsViewModel", "printerProfilesViewModel" ],
        // Elements to bind to, e.g. #settings_plugin_LSqDeltaCalibration, #tab_plugin_LSqDeltaCalibration, ...
        elements: [ "#tab_plugin_LSqDeltaCalibration",  "#settings_plugin_LSqDeltaCalibration" ]
    });
});
