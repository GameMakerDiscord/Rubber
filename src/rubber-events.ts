// This file handles the typings for the custom event emitter typings for rubber.
import { EventEmitter } from "events";

interface TypedMsg<Name, Args extends Function> {
    messageType: Name;
    messageHandler: Args;
}

export type CompileStatusType = "fileSetup" | "igor";

export interface IGameClosedStats {
    /**
     * Minimum FPS as shown in IGOR Output
     */
    minFPS: number;
    /**
     * Maximum FPS as shown in IGOR Output
     */
    maxFPS: number;
    /**
     * Average FPS as shown in IGOR Output
     */
    avgFPS: number;
}

interface IRubberMessageMap {
    "compileStarted": [undefined, () => void];
    "compileFinished": [undefined, () => void];
    "compileStatus": [string, (data: string) => void];
    "gameStarted": [undefined, () => void];
    "gameStatus": [string, (data: string) => void];
    "gameFinished": [undefined, () => void];
    "allFinished": [undefined, () => void];
    "rawStdout": [string, (data: string) => void];
    "error": [Error, (error: string) => void];
}

export class RubberEventEmitter extends EventEmitter {
    on<MessageType extends keyof IRubberMessageMap>
    (
        messageType: MessageType,
        handler: IRubberMessageMap[MessageType][1]
    ){
        super.on(messageType, handler);
        return this;
    }
    public emit<MessageType extends keyof IRubberMessageMap>(
        messageType: MessageType,
        arg?: IRubberMessageMap[MessageType][0]
    ) {
        return super.emit(messageType, arg);
    }
}