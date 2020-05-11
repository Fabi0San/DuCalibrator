// Class abstracting the machine being calibrated
class DuCalMachine 
{
    constructor(getSettings)
    {
        this.getSettings = getSettings;
        this.comms = new AsyncRequestor(req => OctoPrint.control.sendGcode(req));
        this.IsReady = ko.observable(false);
    }

    ParseData(data)
    {
        this.comms.ReceiveResponse(data.logs);
        this.isPrinterReady(data.state.flags.ready);
    }

    async GetGeometry()
    {
        this.ar.Query(this.settings.cmdFetchSettings(), str => str.includes("Recv: ok"), 3000).then(value => this.parsefetchGeoResponse(value));
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
        this.requestQueue.push({ query: query, isFinished: isFinished, timeout: timeout, resolve: resolve, reject: reject, response: [], timeoutHandle: null });
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
