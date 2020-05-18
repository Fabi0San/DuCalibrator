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
        this.probePointCount = ko.observable(15);

        // UI control
        this.isGeometryKnown = () => this.machine().Geometry() != undefined;
        this.isReadyForCommands = ()=> this.machine().IsReady() && !this.machine().IsBusy();
        
        this.isFetchingGeometry = ko.observable(false);
        this.isProbing = ko.observable(false);
        this.isCalibrating = ko.observable(false);
        this.probingProgressString = ko.observable("0");
        
        this.isReadyToCalibrate = ko.observable(false);

        this.plotDivElement = $("#surfacePlotDiv")[0];
        this.GeometryControl = new CollapseControl("#collapseGeometryControl");
        this.PlotControl = new CollapseControl("#collapsePlotControl");
        this.CalibrationControl = new CollapseControl("#collapseCalibrationControl");

        // Observable data
        this.currentGeometry = ()=>this.machine()?.Geometry();
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

        this.machine = new ko.observable(undefined);        
    }

    //hooks
    onSettingsBeforeSave() {
        this.ReloadSettings()
    }

    onBeforeBinding() {
        this.ReloadSettings()
    }

    fromCurrentData(data) {
        this.fromHistoryData(data);
        this.machine()?.ParseData(data);        
    }

    fromHistoryData(data) {
        this.latestData = data;
    }

    // events
    ReloadSettings()
    {
        this.settings = this.settingsViewModel.settings.plugins.LSqDeltaCalibration;
        switch(this.settings.Firmware)
        {
            case "Marlin":
                this.machine(new DuCalMachine(this.settings));
                break;
            case "Test":
                this.machine(new DuCalMachine(this.settings));
                break;
        }
        
        this.machine().ParseData(this.latestData);
        this.GeometryControl.Hide();
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
    preparePlot(surfacePlotDiv, bedRadius, probeCount) 
    {
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

    logProbePoint(x, y, z) 
    {
        this.ProbedData.peek().AddPoint(x, y, 0, z);
        this.plot.geometry.scale(1, 1, this.adjustZScale(this.zScaleInfo, z));

        this.plot.geometry.attributes.position.setXYZ(this.ProbedData.peek().DataPoints.length - 1, x, y, z * this.zScaleInfo.zScale);
        this.plot.geometry.setDrawRange(0, this.ProbedData.peek().DataPoints.length);
        this.plot.geometry.attributes.position.needsUpdate = true;
    }

    adjustZScale(zScaleInfo, z) 
    {
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

    // ui commands
    async configureGeometry() {
        await this.ConfigureGeometry(this.newGeometry());
    }

    cancelProbing()
    {
        this.cancelProbingRequested = true;
    }

    async ConfigureGeometry(geometry) 
    {
        this.isCalibrating(true);
        await this.machine().SetGeometry(geometry);
        this.GeometryControl.Show();
        this.resetProbeData();
        this.resetCalibrationData();
        this.PlotControl.Hide();
        this.isCalibrating(false);
    }

    async probeBed() 
    {
        this.cancelProbingRequested = false;
        this.isProbing(true);
        this.resetProbeData();

        // fetching the actual printer radius so the plot look to scale
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

        var points = SpiralPoints(this.probePointCount(), this.probeRadius());
        for(const point of points)
        {
            if(this.cancelProbingRequested)
            {
                this.resetProbeData();
                this.resetCalibrationData();
                this.PlotControl.Hide();
                this.isProbing(false);
                this.cancelProbingRequested=false;
                return;
            }

            const probe = await this.machine().ProbeBed(point[0],point[1]);
            if(probe)
                this.logProbePoint(probe[0], probe[1], probe[2]);
            
            this.probingProgressString((this.ProbedData.peek().DataPoints.length/points.length*100).toFixed(0));
        }

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
        this.isProbing(false);

        /*
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
        }*/
    }

    async fetchGeometry() {
        this.isFetchingGeometry(true);
        this.resetProbeData();
        var newGeometry = await this.machine().GetGeometry();

        // this.currentGeometry(newGeometry);
        this.resetCalibrationData();
        this.GeometryControl.Show();
        this.PlotControl.Hide();
        this.isFetchingGeometry(false);
    }

    LoadGeometry(data) {
        this.ConfigureGeometry(data.Geometry);
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
        dependencies: [ /* "loginStateViewModel", */ "settingsViewModel", "printerProfilesViewModel"],
        // Elements to bind to, e.g. #settings_plugin_LSqDeltaCalibration, #tab_plugin_LSqDeltaCalibration, ...
        elements: ["#tab_plugin_LSqDeltaCalibration", "#settings_plugin_LSqDeltaCalibration"]
    });
});
