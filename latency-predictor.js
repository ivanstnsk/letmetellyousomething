// Latency Prediction and Interpolation Class
class LatencyPredictor {
    constructor() {
        this.pings = [];
        this.maxPings = 10;
        this.latency = 0;
        this.jitter = 0;
        this.predictionEnabled = false;
    }

    addPing(ping) {
        this.pings.push(ping);
        if (this.pings.length > this.maxPings) {
            this.pings.shift();
        }
        this.latency = this.calculateAverageLatency();
        this.jitter = this.calculateJitter();
    }

    calculateAverageLatency() {
        return this.pings.length ? 
            this.pings.reduce((a, b) => a + b, 0) / this.pings.length : 0;
    }

    calculateJitter() {
        if (this.pings.length < 2) return 0;
        
        const diffs = this.pings.slice(1).map((ping, i) => 
            Math.abs(ping - this.pings[i])
        );

        return diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }

    predictPosition(currentPos, targetPos, serverTimestamp, currentTime) {
        if (!this.predictionEnabled) return targetPos;

        const timeDiff = currentTime - serverTimestamp;
        const t = timeDiff / (this.latency || 16);
        
        return {
            x: currentPos.x + (targetPos.x - currentPos.x) * t,
            y: currentPos.y + (targetPos.y - currentPos.y) * t
        };
    }

    togglePrediction() {
        this.predictionEnabled = !this.predictionEnabled;
        return this.predictionEnabled;
    }
}