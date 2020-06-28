// Class abstracting the machine being calibrated
class AbstractMachine 
{
    constructor(settings)
    {
        this.settings = settings;

        this.IsReady = ko.observable(false);
        this.IsBusy = ko.observable(false);
        this.Geometry = ko.observable(undefined);
        
    }

    ParseData(data)
    {
    }

    async Init()
    {
    }

    async GetGeometry()
    {        
    }

    async SetGeometry(geometry, save)
    {
    }

    async ProbeBed(x, y) 
    {
    }
}

class RealMachine extends AbstractMachine
{
    constructor(settings)
    {
        super(settings);
        this.PopulateCommands();
        this.comms = new AsyncRequestor(req => OctoPrint.control.sendGcode(req), this.commands.Echo);
        this.BuildGeometryParsers();
    } 
    
    ParseData(data)
    {
        this.comms.ReceiveResponse(data.logs);
        this.IsReady(data.state.flags.ready);
    }

    async Init()
    {
        await this.comms.Execute(this.commands.Init);
    }

    async GetGeometry()
    {        
        this.IsBusy(true);

        if(!this.Geometry())
        {
            await this.Init();
        }

        const response = await this.comms.Execute(this.commands.FetchSettings);

        var newGeometry = this.Geometry() ?? new DeltaGeometry() ;

        for (var i = 0; i < response.length; i++) {
            this.geometryElementParsers.forEach(element => element.ParseLog(newGeometry, response[i]));
        }

        this.Geometry(newGeometry);
        this.IsBusy(false);
        return newGeometry;
    }

    async SetGeometry(geometry, save)
    {
        this.IsBusy(true);
        await this.comms.Execute(this.geometryElementParsers.map(element => element.GetCommand(geometry)));
        if(save)
            await this.comms.Execute(this.commands.SaveSettings);
        await this.Init();
        const result = await this.GetGeometry();
        this.IsBusy(false);
        return result;
    }
}

class MarlinMachine extends RealMachine
{
    constructor(settings)
    {
        super(settings);
    } 

    BuildGeometryParsers()
    {
        this.geometryElementParsers = [
            new GeometryElementParser(this.commands.StepsPerUnit, this.commands.idsStepsPerUnit, (geometry, value) => geometry.StepsPerUnit = value, (geometry) => geometry.StepsPerUnit),
            
            // endstop offset is added to the height, marlin reverses this for some reason.
            new GeometryElementParser(this.commands.EndStopOffset, this.commands.idsEndStopOffset, (geometry, value) => geometry.EndStopOffset = value.map(i=>-i), (geometry) => geometry.EndStopOffset.map(i=>-i)),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsTowerAngleOffset, (geometry, value) => geometry.TowerOffset = value, (geometry) => geometry.TowerOffset),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.DiagonalRodAdjust, (geometry, value) => geometry.DiagonalRodAdjust = value, (geometry) => geometry.DiagonalRodAdjust),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[0], (geometry, value) => geometry.Radius = value, (geometry) => geometry.Radius),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[1], (geometry, value) => geometry.Height = value, (geometry) => geometry.Height),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[2], (geometry, value) => geometry.DiagonalRod = value, (geometry) => geometry.DiagonalRod),
        ];
    }

    PopulateCommands()
    {
        this.commands = 
        {
            Init: this.settings.InitCommands().split("\n"),
            Echo: "M118",
            Move: "G0",
            ProbeBed: "G30",
            FetchSettings: "M503",
            SaveSettings: "M500",
            StepsPerUnit: "M92",
            EndStopOffset: "M666",
            DeltaConfig: "M665",
            idsRadiusHeightRod: "RHL",
            idsTowerAngleOffset: "XYZ",
            idsEndStopOffset: "XYZ",         
            idsStepsPerUnit: "XYZ",
            DiagonalRodAdjust: "ABC",
        }
    }

    async ProbeBed(x, y) 
    {
        this.IsBusy(true);

        const commands = [
            `${this.commands.Move} Z${this.settings.SafeHeight()}`, // safe height
            `${this.commands.Move} X${x.toFixed(5)} Y${y.toFixed(5)}`, // position
            `${this.commands.ProbeBed}` // probe
        ];

        const response = await this.comms.Execute(commands);

        const probePointRegex = /Bed X: (-?\d+\.?\d*) Y: (-?\d+\.?\d*) Z: (-?\d+\.?\d*)/;
        var match;
        var result = undefined;

        for (var i = 0; i < response.length; i++)
        {
            if (match = probePointRegex.exec(response[i]))
            {
                result = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                break;
            }
        }

        this.IsBusy(false);
        return result;
    }
}

class SmoothieMachine extends RealMachine
{
    constructor(settings)
    {
        super(settings);
    } 

    BuildGeometryParsers()
    {
        this.geometryElementParsers = [
            new GeometryElementParser(this.commands.StepsPerUnit, this.commands.idsStepsPerUnit, (geometry, value) => geometry.StepsPerUnit = value, (geometry) => geometry.StepsPerUnit),
            new GeometryElementParser(this.commands.EndStopOffset, this.commands.idsEndStopOffset, (geometry, value) => geometry.EndStopOffset = value.map(i=>i), (geometry) => geometry.EndStopOffset.map(i=>i)),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsTowerAngleOffset, (geometry, value) => geometry.TowerOffset = value, (geometry) => geometry.TowerOffset),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusOffset, (geometry, value) => geometry.RadiusAdjust = value, (geometry) => geometry.RadiusAdjust),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[0], (geometry, value) => geometry.Radius = value, (geometry) => geometry.Radius),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[1], (geometry, value) => geometry.Height = value, (geometry) => geometry.Height),
            new GeometryElementParser(this.commands.DeltaConfig, this.commands.idsRadiusHeightRod[2], (geometry, value) => geometry.DiagonalRod = value, (geometry) => geometry.DiagonalRod),
        ];
    }

    PopulateCommands()
    {
        this.commands = 
        {
            Init: this.settings.InitCommands().split("\n"),
            Echo: "M118",
            Move: "G0",
            ProbeBed: "G30",
            FetchSettings: "M503",
            SaveSettings: "M500",
            StepsPerUnit: "M92",
            EndStopOffset: "M666",
            DeltaConfig: "M665",
            idsRadiusHeightRod: "RZL",
            idsTowerAngleOffset: "DEH",
            idsEndStopOffset: "XYZ",         
            idsStepsPerUnit: "XYZ",
            idsRadiusOffset: "ABC"
        }
    }

    async ProbeBed(x, y) 
    {
        this.IsBusy(true);

        const commands = [
            `${this.commands.Move} Z${this.settings.SafeHeight()}`, // safe height
            `${this.commands.Move} X${x.toFixed(5)} Y${y.toFixed(5)}`, // position
            `${this.commands.ProbeBed}` // probe
        ];

        const response = await this.comms.Execute(commands);

        const probePointRegex = /Bed X: (-?\d+\.?\d*) Y: (-?\d+\.?\d*) Z: (-?\d+\.?\d*)/;
        var match;
        var result = undefined;

        for (var i = 0; i < response.length; i++)
        {
            if (match = probePointRegex.exec(response[i]))
            {
                result = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                break;
            }
        }

        this.IsBusy(false);
        return result;
    }

}

class TestMachine extends AbstractMachine
{
    constructor(settings, actualGeometry, initialGeometry)
    {
        super(settings);
        this.actualGeometry = actualGeometry;
        this.initialGeometry = initialGeometry;
        this.IsReady(true);
    } 

    async Init()
    {
        this.Geometry(this.initialGeometry);
    }

    async GetGeometry()
    {
        if(!this.Geometry())
        {
            await this.Init();
        }

        return this.Geometry();
    }

    async SetGeometry(geometry)
    {
        this.Geometry(geometry);
    }

    async ProbeBed(x,y)
    {
        const almostZero = 1e-10;
        var targetZ = 0;
        var carriagePositions;
        var actualPosition;

        await new Promise(resolve => setTimeout(resolve, 1));

        // search a point on the current geometry that hit z0 on the actual geomety.
        do
        {
            targetZ -= actualPosition?.[ZAxis] ?? 0;
            carriagePositions = this.Geometry().GetCarriagePosition([x, y, targetZ]);
            actualPosition = this.actualGeometry.GetEffectorPosition(carriagePositions);
        } while (Math.abs(actualPosition[ZAxis]) > almostZero);

        // round it UP from assumed trigger point, tor nearest addressable point.
        //carriagePositions = carriagePositions.map(p=>Math.ceil(p));
        
        return  this.Geometry().GetEffectorPosition(carriagePositions);
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
    constructor(sendRequestFunction, cmdEcho) {
        this.requestQueue = [];
        this.currentRequest = null;
        this.sendRequestFunction = sendRequestFunction;
        this.lastRequestId = 0;
        this.cmdEcho = cmdEcho
    }

    Execute(query)
    {
        const doneString = `DONE_${this.lastRequestId++}`;
        return this.Query([query, `${this.cmdEcho} ${doneString}`].flat(Infinity), (str) => str.includes(`Recv: ${doneString}`));
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
            request.timeoutHandle = setTimeout(this.Error, request.timeout, this, request, "Timeout");
        request.watchdogHandle = setInterval(this.Watchdog, 1000, request, this);
    }

    EndRequest() {
        if (this.currentRequest.timeoutHandle)
            clearTimeout(this.currentRequest.timeoutHandle);
        if(this.currentRequest.watchdogHandle)
            clearInterval(this.currentRequest.watchdogHandle);
        this.currentRequest = null;
        this.TryDequeue();
    }

    Error(self, request, error) {
        if (self.currentRequest === request) {
            self.EndRequest();
            request.reject(request.response + error);
        }
    }

    Watchdog(request, self) 
    {
        // are we still waiting on our request?
        if (self.currentRequest === request) 
            if(request.responseWatermark == request.response.length)
                self.sendRequestFunction(`${self.cmdEcho} PING`).catch((ob, err) => self.Error(self, request, err));
            else request.responseWatermark = request.response.length;
    }

}
