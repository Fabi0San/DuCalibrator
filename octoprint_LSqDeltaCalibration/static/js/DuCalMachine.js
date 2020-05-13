// Class abstracting the machine being calibrated
class DuCalMachine 
{
    constructor(settings)
    {
        this.settings = settings;
        this.comms = new AsyncRequestor(req => OctoPrint.control.sendGcode(req));

        this.IsReady = ko.observable(false);
        this.IsBusy = ko.observable(false);
        this.Geometry = ko.observable(undefined);
        
        this.BuildGeometryParsers();
    }

    BuildGeometryParsers()
    {
        this.geometryElementParsers = [
            new GeometryElementParser(this.settings.cmdStepsPerUnit(), this.settings.idsStepsPerUnit(), (geometry, value) => geometry.StepsPerUnit = value, (geometry) => geometry.StepsPerUnit),
            new GeometryElementParser(this.settings.cmdEndStopOffset(), this.settings.idsEndStopOffset(), (geometry, value) => geometry.EndStopOffset = value, (geometry) => geometry.EndStopOffset),
            new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsTowerAngleOffset(), (geometry, value) => geometry.TowerOffset = value, (geometry) => geometry.TowerOffset),
            //new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusOffset(), (geometry, value) => geometry.RadiusAdjust = value, (geometry) => geometry.RadiusAdjust),
            //new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRodLenOffset(), (geometry, value) => geometry.DiagonalRodAdjust = value, (geometry) => geometry.DiagonalRodAdjust),
            new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[0], (geometry, value) => geometry.Radius = value, (geometry) => geometry.Radius),
            new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[1], (geometry, value) => geometry.Height = value, (geometry) => geometry.Height),
            new GeometryElementParser(this.settings.cmdDeltaConfig(), this.settings.idsRadiusHeightRod()[2], (geometry, value) => geometry.DiagonalRod = value, (geometry) => geometry.DiagonalRod),
        ];
    }

    ParseData(data)
    {
        this.comms.ReceiveResponse(data.logs);
        this.IsReady(data.state.flags.ready);
    }

    async Init()
    {
        await this.comms.Query(["G28","M204 T200", "G0 Z5 F12000", "M118 DONE_INIT"] , str => str.includes("Recv: DONE_INIT"));
    }

    async GetGeometry()
    {        
        this.IsBusy(true);

        if(!this.Geometry())
        {
            await this.Init();
        }

        const commands = [this.settings.cmdFetchSettings(), "M118 DONE_GET_GEOMETRY"];

        const response = await this.comms.Query(commands, str => str.includes("Recv: DONE_GET_GEOMETRY"));

        var newGeometry = this.Geometry() ?? new DeltaGeometry() ;

        for (var i = 0; i < response.length; i++) {
            this.geometryElementParsers.forEach(element => element.ParseLog(newGeometry, response[i]));
        }

        this.Geometry(newGeometry);
        this.IsBusy(false);
        return newGeometry;
    }

    async SetGeometry(geometry)
    {
        this.IsBusy(true);
        const commands = this.geometryElementParsers.map(element => element.GetCommand(geometry))
        commands.push("G28", "M118 DONE_SET_GEOMETRY");
        console.log(commands);
        await this.comms.Query(commands, (str)=>str.includes("Recv: DONE_SET_GEOMETRY"));
        const result = await this.GetGeometry();
        this.IsBusy(false);
        return result;
    }

    async ProbeBed(x, y) 
    {
        this.IsBusy(true);

        const commands = [
            `G0 Z5`, // safe height
            `G0 X${x} Y${y}`, // position
            `G30`, // probe
            `M118 DONE_PROBING` // signal were done
        ];

        var response = await this.comms.Query(commands, str => str.includes("Recv: DONE_PROBING"));

        const probePointRegex = /Bed X: (-?\d+\.?\d*) Y: (-?\d+\.?\d*) Z: (-?\d+\.?\d*)/;
        var match;

        this.IsBusy(false);

        for (var i = 0; i < response.length; i++)
            if (match = probePointRegex.exec(response[i]))
                return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];

    }
}

class GeometryElementParser {
    constructor(command, element, setFunction, getFunction) {
        this.command = command;
        this.element = element && element.length > 0 ? Array.from(element) : new Array(0);
        this.setFunction = setFunction;
        this.getFunction = getFunction;
        this.regex = this.element.map(e => new RegExp(`${command} .*${e}(-?\\d+\\.?\\d*)`));
    }

    ParseLog(geometry, logLine) {
        if (this.element.length == 0) {
            return;
        }

        var match;

        if (this.element.length == 1) {
            if (match = this.regex[0].exec(logLine))
                this.setFunction(geometry, parseFloat(match[1]));
            return;
        }

        var result = this.getFunction(geometry);
        for (let i = 0; i < this.regex.length; i++) {
            if (match = this.regex[i].exec(logLine))
                result[i] = parseFloat(match[1])
        }

        this.setFunction(geometry, result);
    }

    GetCommand(geometry) {
        if (this.element.length == 0) {
            return;
        }

        if (this.element.length == 1) {
            return `${this.command} ${this.element}${this.getFunction(geometry)}`;
        }

        var value = this.getFunction(geometry);
        var result = this.command;
        for (let i = 0; i < this.element.length; i++) {
            result += ` ${this.element[i]}${value[i].toFixed(5)}`;
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
        this.requestQueue.push({ query: query, isFinished: isFinished, timeout: timeout, resolve: resolve, reject: reject, response: [], timeoutHandle: null , responseWatermark: 0});
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
        request.watchdogHandle = setInterval(this.Watchdog, 3000, request, this);
    }

    EndRequest() {
        if (this.currentRequest.timeoutHandle)
            clearTimeout(this.currentRequest.timeoutHandle);
        if(this.currentRequest.watchdogHandle)
            clearInterval(this.currentRequest.watchdogHandle);
        this.currentRequest = null;
        this.TryDequeue();
    }

    Timeout(request, self) {
        if (self.currentRequest === request) {
            self.EndRequest();
            request.reject(request.response);
        }
    }

    Watchdog(request, self) {
        // are we still waiting on our request?
        if (self.currentRequest === request) 
            if(request.responseWatermark == request.response.length)
                self.sendRequestFunction("M118");
                else request.responseWatermark = request.response.length;
    }

}
