import WebSocket from 'ws';

export interface ActiveSubscription {
    callback: (data: any) => void;
    subscriptionId: number;
}

export interface Subscription {
    type: string;
    coin?: string;
    user?: string;
    interval?: string;
}

export interface WsMsg {
    channel: string;
    data?: any;
}

function subscriptionToIdentifier(subscription: Subscription): string {
    switch (subscription.type) {
        case "allMids":
            return "allMids";
        case "l2Book":
            return `l2Book:${subscription.coin?.toLowerCase()}`;
        case "trades":
            return `trades:${subscription.coin?.toLowerCase()}`;
        case "userEvents":
            return "userEvents";
        case "userFills":
            return `userFills:${subscription.user?.toLowerCase()}`;
        case "candle":
            return `candle:${subscription.coin?.toLowerCase()},${subscription.interval}`;
        case "orderUpdates":
            return "orderUpdates";
        case "userFundings":
            return `userFundings:${subscription.user?.toLowerCase()}`;
        case "userNonFundingLedgerUpdates":
            return `userNonFundingLedgerUpdates:${subscription.user?.toLowerCase()}`;
        case "webData2":
            return `webData2:${subscription.user?.toLowerCase()}`;
        default:
            return "";
    }
}

function wsMsgToIdentifier(wsMsg: WsMsg): string | null {
    switch (wsMsg.channel) {
        case "pong":
            return "pong";
        case "allMids":
            return "allMids";
        case "l2Book":
            return `l2Book:${wsMsg.data.coin.toLowerCase()}`;
        case "trades":
            const trades = wsMsg.data;
            if (trades.length === 0) {
                return null;
            }
            return `trades:${trades[0].coin.toLowerCase()}`;
        case "user":
            return "userEvents";
        case "userFills":
            return `userFills:${wsMsg.data.user.toLowerCase()}`;
        case "candle":
            return `candle:${wsMsg.data.s.toLowerCase()},${wsMsg.data.i}`;
        case "orderUpdates":
            return "orderUpdates";
        case "userFundings":
            return `userFundings:${wsMsg.data.user.toLowerCase()}`;
        case "userNonFundingLedgerUpdates":
            return `userNonFundingLedgerUpdates:${wsMsg.data.user.toLowerCase()}`;
        case "webData2":
            return `webData2:${wsMsg.data.user.toLowerCase()}`;
        default:
            return null;
    }
}

export class WebsocketManager {
    private subscriptionIdCounter: number;
    private wsReady: boolean;
    private queuedSubscriptions: Array<[Subscription, ActiveSubscription]>;
    private activeSubscriptions: Map<string, ActiveSubscription[]>;
    public ws: WebSocket;
    private pingSender: NodeJS.Timeout;

    constructor(baseUrl: string) {
        this.subscriptionIdCounter = 0;
        this.wsReady = false;
        this.queuedSubscriptions = [];
        this.activeSubscriptions = new Map();
        const wsUrl = "ws" + baseUrl.substring(4) + "/ws";

        this.ws = new WebSocket(wsUrl);
        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('open', this.onOpen.bind(this));

        this.pingSender = setInterval(this.sendPing.bind(this), 50000);
    }

    private sendPing(): void {
        console.debug("Websocket sending ping");
        this.ws.send(JSON.stringify({ method: "ping" }));
    }

    private onMessage(_ws: WebSocket, message: string): void {
        if (message === "Websocket connection established.") {
            console.debug(message);
            return;
        }
        console.debug(`onMessage ${message}`);
        const wsMsg: WsMsg = JSON.parse(message);
        const identifier = wsMsgToIdentifier(wsMsg);

        if (identifier === "pong") {
            console.debug("Websocket received pong");
            return;
        }
        if (identifier === null) {
            console.debug("Websocket not handling empty message");
            return;
        }

        const activeSubscriptions = this.activeSubscriptions.get(identifier) || [];
        if (activeSubscriptions.length === 0) {
            console.log("Websocket message from an unexpected subscription:", message, identifier);
        } else {
            activeSubscriptions.forEach(activeSubscription => {
                activeSubscription.callback(wsMsg);
            });
        }
    }

    private onOpen(_ws: WebSocket): void {
        console.debug("onOpen");
        this.wsReady = true;
        this.queuedSubscriptions.forEach(([subscription, activeSubscription]) => {
            this.subscribe(subscription, activeSubscription.callback, activeSubscription.subscriptionId);
        });
    }

    public subscribe(
        subscription: Subscription,
        callback: (data: any) => void,
        subscriptionId?: number
    ): number {
        if (subscriptionId === undefined) {
            this.subscriptionIdCounter += 1;
            subscriptionId = this.subscriptionIdCounter;
        }

        if (!this.wsReady) {
            console.debug("enqueueing subscription");
            this.queuedSubscriptions.push([subscription, { callback, subscriptionId }]);
        } else {
            console.debug("subscribing");
            const identifier = subscriptionToIdentifier(subscription);
            if (identifier === "userEvents" || identifier === "orderUpdates") {
                const existingSubscriptions = this.activeSubscriptions.get(identifier) || [];
                if (existingSubscriptions.length !== 0) {
                    throw new Error(`Cannot subscribe to ${identifier} multiple times`);
                }
            }

            const activeSubscriptions = this.activeSubscriptions.get(identifier) || [];
            activeSubscriptions.push({ callback, subscriptionId });
            this.activeSubscriptions.set(identifier, activeSubscriptions);
            this.ws.send(JSON.stringify({ method: "subscribe", subscription }));
        }
        return subscriptionId;
    }

    public unsubscribe(subscription: Subscription, subscriptionId: number): boolean {
        if (!this.wsReady) {
            throw new Error("Can't unsubscribe before websocket connected");
        }

        const identifier = subscriptionToIdentifier(subscription);
        const activeSubscriptions = this.activeSubscriptions.get(identifier) || [];
        const newActiveSubscriptions = activeSubscriptions.filter(x => x.subscriptionId !== subscriptionId);

        if (newActiveSubscriptions.length === 0) {
            this.ws.send(JSON.stringify({ method: "unsubscribe", subscription }));
        }

        this.activeSubscriptions.set(identifier, newActiveSubscriptions);
        return activeSubscriptions.length !== newActiveSubscriptions.length;
    }
}
