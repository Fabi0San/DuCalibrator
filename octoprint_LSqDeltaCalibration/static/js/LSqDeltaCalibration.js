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

        // buttons
        self.fetchGeometry = function () { fetchGeometry(self) };

        self.probeBed = function () {
            self.isProbing = true;
            OctoPrint.control.sendGcode("G29.1 P1 I500", null);
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
 * Recv: PROBE: X49.6772, Y-27.0588, Z-0.0375
Recv: PROBE: X52.4946, Y-21.3803, Z-0.0425
Recv: PROBE: X54.6603, Y-15.4224, Z-0.0525
Recv: PROBE: X56.1484, Y-9.2606, Z-0.0750
Recv: PROBE: X56.9418, Y-2.9716, Z-0.0900
Recv: PROBE: X57.0321, Y3.3670, Z-0.1075
Recv: PROBE: X56.4196, Y9.6763, Z-0.1100
Recv: PROBE: X55.1130, Y15.8793, Z-0.1050
Recv: PROBE: X53.1299, Y21.9002, Z-0.0850
Recv: PROBE: X50.4955, Y27.6659, Z-0.0625
Recv: PROBE: X47.2432, Y33.1070, Z-0.0450
Recv: PROBE: X43.4135, Y38.1585, Z-0.0375
Recv: PROBE: X39.0535, Y42.7601, Z-0.0550
Recv: PROBE: X34.2166, Y46.8575, Z-0.0600
Recv: PROBE: X28.9614, Y50.4028, Z-0.0625
Recv: PROBE: X23.3515, Y53.3545, Z-0.0650
Recv: PROBE: X17.4539, Y55.6791, Z-0.0700
Recv: PROBE: X11.3390, Y57.3500, Z-0.0550
Recv: PROBE: X5.0790, Y58.3490, Z-0.0475
Recv: PROBE: X-1.2523, Y58.6654, Z-0.0475
Recv: PROBE: X-7.5808, Y58.2969, Z-0.0350
Recv: PROBE: X-13.8328, Y57.2491, Z-0.0200
Recv: PROBE: X-19.9357, Y55.5353, Z-0.0075
Recv: PROBE: X-25.8198, Y53.1765, Z0.0100
Recv: PROBE: X-31.4174, Y50.2011, Z0.0125
Recv: PROBE: X-36.6648, Y46.6443, Z-0.0025
Recv: PROBE: X-41.5026, Y42.5480, Z-0.0025
Recv: PROBE: X-45.8767, Y37.9595, Z0.0200
Recv: PROBE: X-49.7382, Y32.9319, Z0.0200
Recv: PROBE: X-53.0442, Y27.5230, Z0.0275
Recv: PROBE: X-55.7585, Y21.7943, Z0.0425
Recv: PROBE: X-57.8518, Y15.8105, Z0.0500
Recv: PROBE: X-59.3016, Y9.6394, Z0.0650
Recv: PROBE: X-60.0931, Y3.3498, Z0.0725
Recv: PROBE: X-60.2185, Y-2.9881, Z0.0775
Recv: PROBE: X-59.6777, Y-9.3046, Z0.0750
Recv: PROBE: X-58.4777, Y-15.5293, Z0.0800
Recv: PROBE: X-56.6330, Y-21.5941, Z0.0750
Recv: PROBE: X-54.1647, Y-27.4332, Z0.0700
Recv: PROBE: X-51.1011, Y-32.9830, Z0.0725
Recv: PROBE: X-47.4762, Y-38.1839, Z0.0725
Recv: PROBE: X-43.3307, Y-42.9797, Z0.0675
Recv: PROBE: X-38.7099, Y-47.3196, Z0.0675
Recv: PROBE: X-33.6644, Y-51.1577, Z0.0775
Recv: PROBE: X-28.2490, Y-54.4536, Z0.0850
Recv: PROBE: X-22.5225, Y-57.1729, Z0.0950
Recv: PROBE: X-16.5464, Y-59.2876, Z0.1050
Recv: PROBE: X-10.3842, Y-60.7764, Z0.1025
Recv: PROBE: X-4.1019, Y-61.6245, Z0.0875
Recv: PROBE: X2.2343, Y-61.8240, Z0.0650
Recv: PROBE: X8.5578, Y-61.3740, Z0.0425
Recv: PROBE: X14.8020, Y-60.2802, Z0.0300
Recv: PROBE: X20.9024, Y-58.5550, Z0.0250
Recv: PROBE: X26.7950, Y-56.2177, Z0.0350
Recv: PROBE: X32.4196, Y-53.2932, Z0.0425
Recv: PROBE: X37.7183, Y-49.8129, Z0.0325
Recv: PROBE: X42.6369, Y-45.8136, Z0.0200
Recv: PROBE: X47.1258, Y-41.3372, Z-0.0050
Recv: PROBE: X51.1395, Y-36.4301, Z-0.0200
Recv: PROBE: X54.6378, Y-31.1434, Z-0.0325
Recv: PROBE: X57.5861, Y-25.5311, Z-0.0400
Recv: PROBE: X59.9553, Y-19.6511, Z-0.0400
Recv: PROBE: X61.7224, Y-13.5626, Z-0.0500
Recv: PROBE: X62.8705, Y-7.3282, Z-0.0775
Recv: PROBE: X63.3891, Y-1.0100, Z-0.0900
Recv: PROBE: X63.2741, Y5.3284, Z-0.1175
Recv: PROBE: X62.5275, Y11.6239, Z-0.1275
Recv: PROBE: X61.1578, Y17.8136, Z-0.1200
Recv: PROBE: X59.1795, Y23.8367, Z-0.1125
Recv: PROBE: X56.6132, Y29.6335, Z-0.0850
Recv: PROBE: X53.4851, Y35.1475, Z-0.0625
Recv: PROBE: X49.8267, Y40.3249, Z-0.0575
Recv: PROBE: X45.6748, Y45.1156, Z-0.0725
Recv: PROBE: X41.0704, Y49.4735, Z-0.0800
Recv: PROBE: X36.0593, Y53.3566, Z-0.0750
Recv: PROBE: X30.6908, Y56.7281, Z-0.0800
Recv: PROBE: X25.0169, Y59.5563, Z-0.0725
Recv: PROBE: X19.0933, Y61.8146, Z-0.0600
Recv: PROBE: X12.9768, Y63.4823, Z-0.0500
Recv: PROBE: X6.7267, Y64.5442, Z-0.0475
Recv: PROBE: X0.4032, Y64.9911, Z-0.0525
Recv: PROBE: X-5.9341, Y64.8196, Z-0.0500
Recv: PROBE: X-12.2242, Y64.0326, Z-0.0500
Recv: PROBE: X-18.4087, Y62.6380, Z-0.0325
Recv: PROBE: X-24.4288, Y60.6501, Z-0.0175
Recv: PROBE: X-30.2277, Y58.0886, Z-0.0075
Recv: PROBE: X-35.7520, Y54.9781, Z0.0100
Recv: PROBE: X-40.9497, Y51.3490, Z-0.0025
Recv: PROBE: X-45.7736, Y47.2353, Z0.0000
Recv: PROBE: X-50.1789, Y42.6765, Z0.0125
Recv: PROBE: X-54.1256, Y37.7149, Z0.0250
Recv: PROBE: X-57.5777, Y32.3976, Z0.0300
Recv: PROBE: X-60.5043, Y26.7737, Z0.0500
Recv: PROBE: X-62.8790, Y20.8957, Z0.0550
Recv: PROBE: X-64.6811, Y14.8175, Z0.0700
Recv: PROBE: X-65.8947, Y8.5955, Z0.0775
Recv: PROBE: X-66.5100, Y2.2856, Z0.0875
Recv: PROBE: X-66.5219, Y-4.0538, Z0.0725
Recv: PROBE: X-65.9314, Y-10.3661, Z0.0750
Recv: PROBE: X-64.7445, Y-16.5938, Z0.0625
Recv: PROBE: X-62.9730, Y-22.6805, Z0.0525
Recv: PROBE: X-60.6332, Y-28.5731, Z0.0475
Recv: PROBE: X-57.7473, Y-34.2176, Z0.0450
Recv: PROBE: X-54.3417, Y-39.5649, Z0.0550
Recv: PROBE: X-50.4475, Y-44.5674, Z0.0600
Recv: PROBE: X-46.0997, Y-49.1814, Z0.0575
Recv: PROBE: X-41.3376, Y-53.3667, Z0.0600
Recv: PROBE: X-36.2040, Y-57.0865, Z0.0575
Recv: PROBE: X-30.7444, Y-60.3090, Z0.0800
Recv: PROBE: X-25.0072, Y-63.0066, Z0.0950
Recv: PROBE: X-19.0430, Y-65.1564, Z0.1025
Recv: PROBE: X-12.9048, Y-66.7403, Z0.1075
Recv: PROBE: X-6.6452, Y-67.7454, Z0.0925
Recv: PROBE: X-0.3193, Y-68.1638, Z0.0725
Recv: PROBE: X6.0186, Y-67.9925, Z0.0525
Recv: PROBE: X12.3125, Y-67.2339, Z0.0425
Recv: PROBE: X18.5094, Y-65.8954, Z0.0325
Recv: PROBE: X24.5557, Y-63.9892, Z0.0400
Recv: PROBE: X30.3997, Y-61.5326, Z0.0575
Recv: PROBE: X35.9928, Y-58.5467, Z0.0600
Recv: PROBE: X41.2866, Y-55.0583, Z0.0500
Recv: PROBE: X46.2366, Y-51.0977, Z0.0275
Recv: PROBE: X50.8021, Y-46.6984, Z0.0100
Recv: PROBE: X54.9443, Y-41.8990, Z-0.0075
Recv: PROBE: X58.6291, Y-36.7400, Z-0.0200
Recv: PROBE: X61.8262, Y-31.2654, Z-0.0325
Recv: PROBE: X64.5094, Y-25.5213, Z-0.0350
Recv: PROBE: X66.6570, Y-19.5564, Z-0.0400
Recv: PROBE: X68.2517, Y-13.4205, Z-0.0600
Recv: PROBE: X69.2810, Y-7.1650, Z-0.0775
Recv: PROBE: X69.7373, Y-0.8414, Z-0.0975
Recv: PROBE: X69.6174, Y5.4973, Z-0.1250
Recv: PROBE: X68.9231, Y11.7983, Z-0.1425
Recv: PROBE: X67.6608, Y18.0114, Z-0.1450
Recv: PROBE: X65.8418, Y24.0845, Z-0.1325
Recv: PROBE: X63.4813, Y29.9687, Z-0.1100
Recv: PROBE: X60.5995, Y35.6160, Z-0.0900
Recv: PROBE: X57.2207, Y40.9804, Z-0.0725
Recv: PROBE: X53.3727, Y46.0190, Z-0.0800
Recv: PROBE: X49.0878, Y50.6911, Z-0.0875
Recv: PROBE: X44.4003, Y54.9601, Z-0.0925
Recv: PROBE: X39.3493, Y58.7914, Z-0.0925
Recv: PROBE: X33.9752, Y62.1554, Z-0.1025
Recv: PROBE: X28.3222, Y65.0250, Z-0.0800
Recv: PROBE: X22.4351, Y67.3785, Z-0.0700
Recv: PROBE: X16.3621, Y69.1974, Z-0.0500
Recv: PROBE: X10.1508, Y70.4682, Z-0.0450
Recv: PROBE: X3.8513, Y71.1812, Z-0.0475
Recv: PROBE: X-2.4866, Y71.3317, Z-0.0500
Recv: PROBE: X-8.8131, Y70.9192, Z-0.0525
Recv: PROBE: X-15.0780, Y69.9475, Z-0.0575
Recv: PROBE: X-21.2325, Y68.4250, Z-0.0425
Recv: PROBE: X-27.2280, Y66.3644, Z-0.0250
Recv: PROBE: X-33.0184, Y63.7823, Z-0.0125
Recv: PROBE: X-38.5582, Y60.6998, Z0.0050
Recv: PROBE: X-43.8055, Y57.1409, Z0.0075
Recv: PROBE: X-48.7190, Y53.1344, Z0.0000
Recv: PROBE: X-53.2615, Y48.7115, Z0.0075
Recv: PROBE: X-57.3981, Y43.9074, Z0.0225
Recv: PROBE: X-61.0980, Y38.7587, Z0.0300
Recv: PROBE: X-64.3326, Y33.3063, Z0.0475
Recv: PROBE: X-67.0782, Y27.5920, Z0.0550
Recv: PROBE: X-69.3143, Y21.6592, Z0.0600
Recv: PROBE: X-71.0243, Y15.5546, Z0.0800
Recv: PROBE: X-72.1960, Y9.3238, Z0.0850
Recv: PROBE: X-72.8211, Y3.0147, Z0.0850
Recv: PROBE: X-72.8954, Y-3.3252, Z0.0750
Recv: PROBE: X-72.4192, Y-9.6469, Z0.0725
Recv: PROBE: X-71.3965, Y-15.9039, Z0.0575
Recv: PROBE: X-69.8359, Y-22.0486, Z0.0450
Recv: PROBE: X-67.7496, Y-28.0356, Z0.0300
Recv: PROBE: X-65.1539, Y-33.8196, Z0.0325
Recv: PROBE: X-62.0687, Y-39.3584, Z0.0400
Recv: PROBE: X-58.5174, Y-44.6107, Z0.0475
Recv: PROBE: X-54.5273, Y-49.5376, Z0.0500
Recv: PROBE: X-50.1283, Y-54.1032, Z0.0500
Recv: PROBE: X-45.3536, Y-58.2739, Z0.0450
Recv: PROBE: X-40.2387, Y-62.0197, Z0.0475
Recv: PROBE: X-34.8216, Y-65.3135, Z0.0550
Recv: PROBE: X-29.1424, Y-68.1316, Z0.0800
Recv: PROBE: X-23.2431, Y-70.4539, Z0.0975
Recv: PROBE: X-17.1669, Y-72.2641, Z0.1025
Recv: PROBE: X-10.9585, Y-73.5494, Z0.1075
Recv: PROBE: X-4.6633, Y-74.3011, Z0.0925
Recv: PROBE: X1.6731, Y-74.5144, Z0.0725
Recv: PROBE: X8.0045, Y-74.1885, Z0.0475
Recv: PROBE: X14.2859, Y-73.3261, Z0.0375
Recv: PROBE: X20.4708, Y-71.9343, Z0.0375
Recv: PROBE: X26.5166, Y-70.0234, Z0.0550
Recv: PROBE: X32.3783, Y-67.6080, Z0.0700
Recv: PROBE: X38.0153, Y-64.7058, Z0.0725
Recv: PROBE: X43.3869, Y-61.3382, Z0.0625
Recv: PROBE: X48.4553, Y-57.5299, Z0.0425
Recv: PROBE: X53.1851, Y-53.3080, Z0.0275
Recv: PROBE: X57.5432, Y-48.7030, Z0.0150
Recv: PROBE: X61.4986, Y-43.7483, Z0.0075
Recv: PROBE: X65.0244, Y-38.4789, Z-0.0075
Recv: PROBE: X68.0957, Y-32.9328, Z-0.0200
Recv: PROBE: X70.6919, Y-27.1488, Z-0.0275
Recv: PROBE: X72.7951, Y-21.1677, Z-0.0475
Recv: PROBE: X74.3912, Y-15.0317, Z-0.0600
Recv: PROBE: X75.4695, Y-8.7838, Z-0.0825
Recv: PROBE: X76.0231, Y-2.4682, Z-0.1050
Recv: PROBE: X76.0487, Y3.8716, Z-0.1150
Recv: PROBE: X75.5468, Y10.1922, Z-0.1450
Recv: PROBE: X74.5214, Y16.4486, Z-0.1575
Recv: PROBE: X72.9803, Y22.5983, Z-0.1525
Recv: PROBE: X70.9343, Y28.5995, Z-0.1425
Recv: PROBE: X68.3984, Y34.4100, Z-0.1150
Recv: PROBE: X65.3903, Y39.9913, Z-0.0925
Recv: PROBE: X61.9313, Y45.3047, Z-0.0850
Recv: PROBE: X58.0454, Y50.3143, Z-0.0900
Recv: PROBE: X53.7597, Y54.9863, Z-0.1075
Recv: PROBE: X49.1039, Y59.2892, Z-0.0975
Recv: PROBE: X44.1094, Y63.1946, Z-0.1100
Recv: PROBE: X38.8105, Y66.6764, Z-0.1175
Recv: PROBE: X33.2438, Y69.7112, Z-0.0975
Recv: PROBE: X27.4471, Y72.2790, Z-0.0750
Recv: PROBE: X21.4592, Y74.3633, Z-0.0600
Recv: PROBE: X15.3211, Y75.9504, Z-0.0450
Recv: PROBE: X9.0741, Y77.0303, Z-0.0400
Recv: PROBE: X2.7590, Y77.5963, Z-0.0400
Recv: PROBE: X-3.5809, Y77.6452, Z-0.0450
Recv: PROBE: X-9.9039, Y77.1772, Z-0.0500
Recv: PROBE: X-16.1674, Y76.1959, Z-0.0525
Recv: PROBE: X-22.3304, Y74.7084, Z-0.0475
Recv: PROBE: X-28.3524, Y72.7251, Z-0.0275
Recv: PROBE: X-34.1936, Y70.2595, Z-0.0175
Recv: PROBE: X-39.8152, Y67.3287, Z0.0025
Recv: PROBE: X-45.1815, Y63.9518, Z0.0025
Recv: PROBE: X-50.2566, Y60.1521, Z0.0050
Recv: PROBE: X-55.0084, Y55.9542, Z-0.0125
Recv: PROBE: X-59.4054, Y51.3867, Z0.0000
Recv: PROBE: X-63.4196, Y46.4796, Z0.0175
Recv: PROBE: X-67.0257, Y41.2644, Z0.0350
Recv: PROBE: X-70.2000, Y35.7765, Z0.0500
Recv: PROBE: X-72.9230, Y30.0506, Z0.0600
Recv: PROBE: X-75.1769, Y24.1252, Z0.0650
Recv: PROBE: X-76.9485, Y18.0369, Z0.0825
Recv: PROBE: X-78.2261, Y11.8270, Z0.0850
Recv: PROBE: X-79.0024, Y5.5342, Z0.0900
Recv: PROBE: X-79.2727, Y-0.7997, Z0.0725
Recv: PROBE: X-79.0360, Y-7.1354, Z0.0775
Recv: PROBE: X-78.2941, Y-13.4323, Z0.0650
Recv: PROBE: X-77.0526, Y-19.6492, Z0.0450
Recv: PROBE: X-75.3195, Y-25.7484, Z0.0300
Recv: PROBE: X-73.1067, Y-31.6894, Z0.0225
Recv: PROBE: X-70.4281, Y-37.4365, Z0.0150
Recv: PROBE: X-67.3019, Y-42.9518, Z0.0225
Recv: PROBE: X-63.7474, Y-48.2024, Z0.0275

Send: M503
Recv: ; config override present: /sd/config-override
Recv: ;Steps per unit:
Recv: M92 X400.00000 Y400.00000 Z400.00000
Recv: ;Acceleration mm/sec^2:
Recv: M204 S1000.00000
Recv: ;X- Junction Deviation, Z- Z junction deviation, S - Minimum Planner speed mm/sec:
Recv: M205 X0.05000 Z-1.00000 S0.00000
Recv: ;Max cartesian feedrates in mm/sec:
Recv: M203 X300.00000 Y300.00000 Z300.00000 S-1.00000
Recv: ;Max actuator feedrates in mm/sec:
Recv: M203.1 X250.00000 Y250.00000 Z250.00000
Recv: ;Optional arm solution specific settings:
Recv: M665 L330.0000 R170.4959
Recv: ;Digipot Motor currents:
Recv: M907 X1.00000 Y1.00000 Z1.00000 A1.50000
Recv: ;E Steps per mm:
Recv: M92 E140.0000 P57988
Recv: ;E Filament diameter:
Recv: M200 D0.0000 P57988
Recv: ;E retract length, feedrate:
Recv: M207 S3.0000 F2700.0000 Z0.0000 Q6000.0000 P57988
Recv: ;E retract recover length, feedrate:
Recv: M208 S0.0000 F480.0000 P57988
Recv: ;E acceleration mm/sec��:
Recv: M204 E500.0000 P57988
Recv: ;E max feed rate mm/sec:
Recv: M203 E50.0000 P57988
Recv: ;PID settings:
Recv: M301 S0 P10.0000 I0.3000 D200.0000 X255.0000 Y255
Recv: ;Max temperature setting:
Recv: M143 S0 P300.0000
Recv: ;PID settings:
Recv: M301 S1 P10.0000 I0.3000 D200.0000 X255.0000 Y255
Recv: ;Max temperature setting:
Recv: M143 S1 P300.0000
Recv: ;Home offset (mm):
Recv: M206 X0.00 Y0.00 Z0.00
Recv: ;Trim (mm):
Recv: M666 X-0.488 Y-0.013 Z-0.106
Recv: ;Max Z
Recv: M665 Z237.000
Recv: ;Probe feedrates Slow/fast(K)/Return (mm/sec) max_z (mm) height (mm) dwell (s):
Recv: M670 S5.00 K200.00 R200.00 Z230.00 H1.00 D0.00
Recv: ;Probe offsets:
Recv: M565 X0.00000 Y0.00000 Z0.00000
Recv:
Recv: ok
*/
