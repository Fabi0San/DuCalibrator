/*
 * View model for OctoPrint-LSqDeltaCalibration
 *
 * Author: Fabio Santos
 * License: AGPLv3
 */
$(function() {
    function LsqdeltacalibrationViewModel(parameters) {
        var self = this;

        // assign the injected parameters, e.g.:
        // self.loginStateViewModel = parameters[0];
        self.settingsViewModel = parameters[0];

        self.geometry = ko.observable(
            {
                StepsPerUnit: [],
                EndStopOffset: [0, 0, 0],
                TowerOffset: [0, 0, 0],
                RodLength: undefined,
                DeltaRadius: undefined,
                MaxHeight: undefined
            });

        self.logText = ko.observable(undefined);

        self.isFetchingGeometry = false;
        self.isProbing = false;
        self.probePoints = [];

        // test strings
        self.simulatedM503 = ["Send: M503", "Recv: ; config override present: /sd/config-override", "Recv: ;Steps per unit:", "Recv: M92 X400.00000 Y400.00000 Z400.00000", "Recv: ;Acceleration mm/sec^2:", "Recv: M204 S1000.00000", "Recv: ;X- Junction Deviation, Z- Z junction deviation, S - Minimum Planner speed mm/sec:", "Recv: M205 X0.05000 Z-1.00000 S0.00000", "Recv: ;Max cartesian feedrates in mm/sec:", "Recv: M203 X300.00000 Y300.00000 Z300.00000 S-1.00000", "Recv: ;Max actuator feedrates in mm/sec:", "Recv: M203.1 X250.00000 Y250.00000 Z250.00000", "Recv: ;Optional arm solution specific settings:", "Recv: M665 L330.0000 R170.4959", "Recv: ;Digipot Motor currents:", "Recv: M907 X1.00000 Y1.00000 Z1.00000 A1.50000", "Recv: ;E Steps per mm:", "Recv: M92 E140.0000 P57988", "Recv: ;E Filament diameter:", "Recv: M200 D0.0000 P57988", "Recv: ;E retract length, feedrate:", "Recv: M207 S3.0000 F2700.0000 Z0.0000 Q6000.0000 P57988", "Recv: ;E retract recover length, feedrate:", "Recv: M208 S0.0000 F480.0000 P57988", "Recv: ;E acceleration mm/sec��:", "Recv: M204 E500.0000 P57988", "Recv: ;E max feed rate mm/sec:", "Recv: M203 E50.0000 P57988", "Recv: ;PID settings:", "Recv: M301 S0 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S0 P300.0000", "Recv: ;PID settings:", "Recv: M301 S1 P10.0000 I0.3000 D200.0000 X255.0000 Y255", "Recv: ;Max temperature setting:", "Recv: M143 S1 P300.0000", "Recv: ;Home offset (mm):", "Recv: M206 X0.00 Y0.00 Z0.00", "Recv: ;Trim (mm):", "Recv: M666 X-0.488 Y-0.013 Z-0.106", "Recv: ;Max Z", "Recv: M665 Z237.000", "Recv: ;Probe feedrates Slow/fast(K)/Return (mm/sec) max_z (mm) height (mm) dwell (s):", "Recv: M670 S5.00 K200.00 R200.00 Z230.00 H1.00 D0.00", "Recv: ;Probe offsets:", "Recv: M565 X0.00000 Y0.00000 Z0.00000", "Recv:", "Recv: ok"]

        self.simulatedG29 = ["Send: G29.1 P1", "Recv: PROBE: X0.0000, Y0.0000, Z0.0050", "Recv: PROBE: X-10.4060, Y-4.4403, Z0.0050", "Recv: PROBE: X4.7416, Y-15.2813, Z0.0300", "Recv: PROBE: X19.3953, Y-2.7970, Z0.0125", "Recv: PROBE: X15.6567, Y16.3361, Z0.0025", "Recv: PROBE: X-1.8369, Y25.2314, Z0.0150", "Recv: PROBE: X-20.4358, Y18.7184, Z0.0175", "Recv: PROBE: X-29.9018, Y1.3715, Z0.0275", "Recv: PROBE: X-26.3793, Y-18.1144, Z0.0450", "Recv: PROBE: X-11.9836, Y-31.7552, Z0.0525", "Recv: PROBE: X7.6122, Y-34.9579, Z0.0325", "Recv: PROBE: X25.8929, Y-27.1580, Z0.0125", "Recv: PROBE: X37.5949, Y-11.0736, Z-0.0550", "Recv: PROBE: X39.8532, Y8.7019, Z-0.0725", "Recv: PROBE: X32.4465, Y27.1887, Z-0.0400", "Recv: PROBE: X17.3777, Y40.2246, Z-0.0625", "Recv: PROBE: X-1.9211, Y45.2140, Z-0.0300", "Recv: PROBE: X-21.4938, Y41.4007, Z0.0050", "Recv: PROBE: X-37.6772, Y29.7393, Z0.0100", "Recv: PROBE: X-47.7073, Y12.4905, Z0.0300", "Recv: PROBE: X-50.0630, Y-7.3281, Z0.0800", "Recv: PROBE: X-44.5526, Y-26.5154, Z0.0900", "Recv: PROBE: X-32.1853, Y-42.1913, Z0.0775", "Recv: PROBE: X-14.8893, Y-52.1758, Z0.0800", "Recv: PROBE: X4.8530, Y-55.2128, Z0.0425", "Recv: PROBE: X24.3901, Y-51.0404, Z0.0300", "Recv: PROBE: X41.2544, Y-40.3246, Z0.0000", "Recv: PROBE: X53.4440, Y-24.4896, Z-0.0425", "Recv: PROBE: X59.6152, Y-5.4801, Z-0.0775", "Recv: PROBE: X59.1748, Y14.5034, Z-0.1100", "Recv: PROBE: X52.2807, Y33.2675, Z-0.0700", "Recv: PROBE: X39.7627, Y48.8562, Z-0.0925", "Recv: PROBE: X22.9838, Y59.7306, Z-0.0725", "Recv: PROBE: X3.6642, Y64.8889, Z-0.0600", "Recv: PROBE: X-16.3106, Y63.9216, Z-0.0475", "Recv: PROBE: X-35.0764, Y57.0057, Z0.0050", "Recv: PROBE: X-50.9580, Y44.8474, Z0.0025", "Recv: PROBE: X-62.6020, Y28.5831, Z0.0425", "Recv: PROBE: X-69.0710, Y9.6540, Z0.0900", "Recv: PROBE: X-69.8942, Y-10.3343, Z0.0725", "Recv: PROBE: X-65.0756, Y-29.7518, Z0.0375", "Recv: PROBE: X-55.0637, Y-47.0743, Z0.0475", "Recv: PROBE: X-40.6905, Y-60.9941, Z0.0575", "Recv: PROBE: X-23.0859, Y-70.5056, Z0.1000", "Recv: PROBE: X-3.5774, Y-74.9613, Z0.0825", "Recv: PROBE: X16.4156, Y-74.0981, Z0.0400", "Recv: PROBE: X35.4875, Y-68.0341, Z0.0925", "Recv: PROBE: X52.3408, Y-57.2402, Z0.0300", "Recv: PROBE: X65.8683, Y-42.4895, Z-0.0125", "Recv: PROBE: X75.2157, Y-24.7911, Z-0.0525", "Recv: max: 0.1000, min: -0.1100, delta: 0.2100", "Recv: ok"]


        // buttons
        self.fetchGeometry = function () { fetchGeometry(self) };

        self.probeBed = function () {
            self.isProbing = true;
            OctoPrint.control.sendGcode("G29.1 P1", null);
        }

        //hooks
        self.fromCurrentData = function (data)
        {
            self.logText(data.logs);
            parseResponse(data.logs, self);
        }

    }

    function parseResponse(logLines, self)
    {
        stepsPerUnitRegex = /M92 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/g;
        endStopOffsetRegex = /M666 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/g;
        towerOffsetRegex = /M665 .*D(-?\d+\.?\d*) E(-?\d+\.?\d*) H(-?\d+\.?\d*)/g;
        rodLenAndRadiusRegex = /M665 .*L(-?\d+\.?\d*) R(-?\d+\.?\d*)/g;
        maxHeightRegex = /M665 .*Z(-?\d+\.?\d*)/g;
        probePointRegex = /PROBE: X(-?\d+\.?\d*), Y(-?\d+\.?\d*), Z(-?\d+\.?\d*)/g;

        var newGeometry = self.geometry();
        for (var i = 0; i < logLines.length; i++) {

            if (self.isFetchingGeometry) {
                if (match = stepsPerUnitRegex.exec(logLines[i])) {
                    newGeometry.StepsPerUnit = [match[1], match[2], match[3]];
                }

                if (match = endStopOffsetRegex.exec(logLines[i])) {
                    newGeometry.EndStopOffset = [match[1], match[2], match[3]];
                }

                if (match = towerOffsetRegex.exec(logLines[i])) {
                    newGeometry.TowerOffset = [match[1], match[2], match[3]];
                }

                if (match = rodLenAndRadiusRegex.exec(logLines[i])) {
                    newGeometry.RodLength = match[1];
                    newGeometry.DeltaRadius = match[2];
                }

                if (match = maxHeightRegex.exec(logLines[i])) {
                    newGeometry.MaxHeight = match[1];
                }
            }

            if (self.isProbing) {
                if (match = probePointRegex.exec(logLines[i])) {
                    self.probePoints.push(match);
                }
            }

            if (logLines[i] == "Recv: ok") {
                self.logText(self.probePoints);
                plotSurface(self.probePoints);
            }

        }
        if (self.isFetchingGeometry) {
            self.geometry(newGeometry);
        }
    }

    function fetchGeometry(self) {
        self.isFetchingGeometry = true;
        OctoPrint.control.sendGcode("M503", null);
    }

    function request(type, command, args, successCb) {
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


    function plotSurface(points) {
        var surfacePlotDiv = document.getElementById("surfacePlotDiv");
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        var renderer = new THREE.WebGLRenderer();

        renderer.setSize(surfacePlotDiv.clientWidth, surfacePlotDiv.clientHeight);
        if (surfacePlotDiv.firstChild) surfacePlotDiv.removeChild(surfacePlotDiv.firstChild);
        surfacePlotDiv.appendChild(renderer.domElement);

        var geometry = new THREE.Geometry();

        for (var i = 0; i < points.length; ++i) {
            geometry.vertices.push(new THREE.Vector3(points[i][1],points[i][2],points[i][3]));
        }

        scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-.550, -.550, 0), 0.5, 0xff0000));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.550, -.550, 0), 0.5, 0x00ff00));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-.550, -.550, 0), 0.5, 0x0000ff));

        geometry.computeBoundingBox();
        var size = geometry.boundingBox.getSize();
        geometry.scale(1 / size.x, 1 / size.y, 0.3 / (size.z == 0 ? 1 : size.z));

        particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xff0000, size: 0.025 }));
        scene.add(particles);

        var gridHelper = new THREE.GridHelper(1, 20, 0x000000, 0x000000);
        gridHelper.rotation.x = Math.PI / 2;

        camera.position.set(0, -5, 1);
        var controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.minDistance = 0;
        controls.maxDistance = 500;


        var animate = function () {
            requestAnimationFrame(animate);

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

    }



    /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
    OCTOPRINT_VIEWMODELS.push({
        construct: LsqdeltacalibrationViewModel,
        // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
        dependencies: [ /* "loginStateViewModel", */ "settingsViewModel" ],
        // Elements to bind to, e.g. #settings_plugin_LSqDeltaCalibration, #tab_plugin_LSqDeltaCalibration, ...
        elements: [ "#tab_plugin_LSqDeltaCalibration" ]
    });
});
/*
simulatedM503 = ["Send: M503","Recv: ; config override present: /sd/config-override","Recv: ;Steps per unit:","Recv: M92 X400.00000 Y400.00000 Z400.00000","Recv: ;Acceleration mm/sec^2:","Recv: M204 S1000.00000","Recv: ;X- Junction Deviation, Z- Z junction deviation, S - Minimum Planner speed mm/sec:","Recv: M205 X0.05000 Z-1.00000 S0.00000","Recv: ;Max cartesian feedrates in mm/sec:","Recv: M203 X300.00000 Y300.00000 Z300.00000 S-1.00000","Recv: ;Max actuator feedrates in mm/sec:","Recv: M203.1 X250.00000 Y250.00000 Z250.00000","Recv: ;Optional arm solution specific settings:","Recv: M665 L330.0000 R170.4959","Recv: ;Digipot Motor currents:","Recv: M907 X1.00000 Y1.00000 Z1.00000 A1.50000","Recv: ;E Steps per mm:","Recv: M92 E140.0000 P57988","Recv: ;E Filament diameter:","Recv: M200 D0.0000 P57988","Recv: ;E retract length, feedrate:","Recv: M207 S3.0000 F2700.0000 Z0.0000 Q6000.0000 P57988","Recv: ;E retract recover length, feedrate:","Recv: M208 S0.0000 F480.0000 P57988","Recv: ;E acceleration mm/sec��:","Recv: M204 E500.0000 P57988","Recv: ;E max feed rate mm/sec:","Recv: M203 E50.0000 P57988","Recv: ;PID settings:","Recv: M301 S0 P10.0000 I0.3000 D200.0000 X255.0000 Y255","Recv: ;Max temperature setting:","Recv: M143 S0 P300.0000","Recv: ;PID settings:","Recv: M301 S1 P10.0000 I0.3000 D200.0000 X255.0000 Y255","Recv: ;Max temperature setting:","Recv: M143 S1 P300.0000","Recv: ;Home offset (mm):","Recv: M206 X0.00 Y0.00 Z0.00","Recv: ;Trim (mm):","Recv: M666 X-0.488 Y-0.013 Z-0.106","Recv: ;Max Z","Recv: M665 Z237.000","Recv: ;Probe feedrates Slow/fast(K)/Return (mm/sec) max_z (mm) height (mm) dwell (s):","Recv: M670 S5.00 K200.00 R200.00 Z230.00 H1.00 D0.00","Recv: ;Probe offsets:","Recv: M565 X0.00000 Y0.00000 Z0.00000","Recv:","Recv: ok"]

simulatedG29["Send: G29.1 P1","Recv: PROBE: X0.0000, Y0.0000, Z0.0050","Recv: PROBE: X-10.4060, Y-4.4403, Z0.0050","Recv: PROBE: X4.7416, Y-15.2813, Z0.0300","Recv: PROBE: X19.3953, Y-2.7970, Z0.0125","Recv: PROBE: X15.6567, Y16.3361, Z0.0025","Recv: PROBE: X-1.8369, Y25.2314, Z0.0150","Recv: PROBE: X-20.4358, Y18.7184, Z0.0175","Recv: PROBE: X-29.9018, Y1.3715, Z0.0275","Recv: PROBE: X-26.3793, Y-18.1144, Z0.0450","Recv: PROBE: X-11.9836, Y-31.7552, Z0.0525","Recv: PROBE: X7.6122, Y-34.9579, Z0.0325","Recv: PROBE: X25.8929, Y-27.1580, Z0.0125","Recv: PROBE: X37.5949, Y-11.0736, Z-0.0550","Recv: PROBE: X39.8532, Y8.7019, Z-0.0725","Recv: PROBE: X32.4465, Y27.1887, Z-0.0400","Recv: PROBE: X17.3777, Y40.2246, Z-0.0625","Recv: PROBE: X-1.9211, Y45.2140, Z-0.0300","Recv: PROBE: X-21.4938, Y41.4007, Z0.0050","Recv: PROBE: X-37.6772, Y29.7393, Z0.0100","Recv: PROBE: X-47.7073, Y12.4905, Z0.0300","Recv: PROBE: X-50.0630, Y-7.3281, Z0.0800","Recv: PROBE: X-44.5526, Y-26.5154, Z0.0900","Recv: PROBE: X-32.1853, Y-42.1913, Z0.0775","Recv: PROBE: X-14.8893, Y-52.1758, Z0.0800","Recv: PROBE: X4.8530, Y-55.2128, Z0.0425","Recv: PROBE: X24.3901, Y-51.0404, Z0.0300","Recv: PROBE: X41.2544, Y-40.3246, Z0.0000","Recv: PROBE: X53.4440, Y-24.4896, Z-0.0425","Recv: PROBE: X59.6152, Y-5.4801, Z-0.0775","Recv: PROBE: X59.1748, Y14.5034, Z-0.1100","Recv: PROBE: X52.2807, Y33.2675, Z-0.0700","Recv: PROBE: X39.7627, Y48.8562, Z-0.0925","Recv: PROBE: X22.9838, Y59.7306, Z-0.0725","Recv: PROBE: X3.6642, Y64.8889, Z-0.0600","Recv: PROBE: X-16.3106, Y63.9216, Z-0.0475","Recv: PROBE: X-35.0764, Y57.0057, Z0.0050","Recv: PROBE: X-50.9580, Y44.8474, Z0.0025","Recv: PROBE: X-62.6020, Y28.5831, Z0.0425","Recv: PROBE: X-69.0710, Y9.6540, Z0.0900","Recv: PROBE: X-69.8942, Y-10.3343, Z0.0725","Recv: PROBE: X-65.0756, Y-29.7518, Z0.0375","Recv: PROBE: X-55.0637, Y-47.0743, Z0.0475","Recv: PROBE: X-40.6905, Y-60.9941, Z0.0575","Recv: PROBE: X-23.0859, Y-70.5056, Z0.1000","Recv: PROBE: X-3.5774, Y-74.9613, Z0.0825","Recv: PROBE: X16.4156, Y-74.0981, Z0.0400","Recv: PROBE: X35.4875, Y-68.0341, Z0.0925","Recv: PROBE: X52.3408, Y-57.2402, Z0.0300","Recv: PROBE: X65.8683, Y-42.4895, Z-0.0125","Recv: PROBE: X75.2157, Y-24.7911, Z-0.0525","Recv: max: 0.1000, min: -0.1100, delta: 0.2100","Recv: ok"]
*/
