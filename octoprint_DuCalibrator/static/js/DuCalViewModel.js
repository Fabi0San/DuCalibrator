/*
 * View model for Delta Micro Calibrator
 *
 * Author: Fabio Santos
 * License: AGPLv3
 */
class DuCalibratorViewModel {
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
        this.settings = this.settingsViewModel.settings.plugins.DuCalibrator;
        switch(this.settings.Firmware())
        {
            case "Marlin":
                this.machine(new MarlinMachine(this.settings));
                break;
            case "Smoothie":
                this.machine(new SmoothieMachine(this.settings));
                break;
            case "Test":
                {
                    const testGeo = new DeltaGeometry(330.330, 165.165, 300.300, [0,1.1,5.2], [5.3,1.4,0], [400,400,400],[0,0,0],[1.5,0,5.6]);
                    const initialGeo = new DeltaGeometry(340, 175, 302, [0,0,0], [0,0,0], [400,400,400]);

                    this.machine(new TestMachine(this.settings, testGeo, initialGeo));
                    break;
                }
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
            this.calibrate.EndStopOffset() && !this.calibrate.MaxHeight(),
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
            this.calibrate.MaxHeight()];

        var result = DeltaGeometry.Calibrate(this.currentGeometry().Clone(), this.ProbedData(), factors);
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
        this.ProbedData.peek().AddPoint(new ProbePoint([x, y, 0], [x, y, z]));
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
            minZ: 0,
            maxZ: 0,
            zScale: 1,
            normalizeTo: radius / 3
        };

        this.plot = this.preparePlot(
            this.plotDivElement,
            radius,
            this.probePointCount());

        this.PlotControl.Show();

        var points = DuCalUtils.GetSpiralPoints(this.probePointCount(), this.probeRadius());
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
        construct: DuCalibratorViewModel,
        // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
        dependencies: [ /* "loginStateViewModel", */ "settingsViewModel", "printerProfilesViewModel"],
        // Elements to bind to, e.g. #settings_plugin_DuCalibrator, #tab_plugin_DuCalibrator, ...
        elements: ["#tab_plugin_DuCalibrator", "#settings_plugin_DuCalibrator"]
    });
});
