import Konva from 'konva';
import { clearStage, fullState, StageState, stageUpdated } from './stage';
import { diffString } from 'json-diff';

export const actionDeserializers: { (data: any): (Action | null) }[] = [];

export function deserializeAction(data: any): Action {
    for (const d of actionDeserializers) {
        const a = d(data);
        if (a !== null) return a;
    }
    console.error('cannot deserialize action', data);
    throw new Error('cannot deserialize action');
}

export interface Action {
    apply(): void;
    undo(): void;
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    cancel(): void;
    serialize(): any;
}

const debugActions = true;

export class Actions {
    private _current: Action | null = null;
    private history: Action[] = [];
    private forwardHistory: Action[] = [];
    stateHistory: StageState[] = [];
    constructor() {
        this.stateHistory.push(fullState());
    }
    current(a?: Action | null): Action | null {
        if (a !== undefined) {
            this._current = a;
            stageUpdated();
        }
        return this._current;
    }
    onMouseDown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.current() == null) return false;
        if (this.current()?.mousedown(event)) {
            this.commit();
        } else {
            stageUpdated();
        }
        return true;
    }
    onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this.current() == null) return false;
        if (this.current()?.mouseup(event)) {
            this.commit();
        } else {
            stageUpdated();
        }
        return true;
    }
    onMouseMove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.current() == null) return false;
        if (this.current()?.mousemove(event)) {
            this.commit();
        } else {
            stageUpdated();
        }
        return true;
    }
    commit(keepForwardHistory: boolean = false) {
        const a = this.current();
        if (a == null) return;
        this.history.push(a);
        if (!keepForwardHistory) this.forwardHistory = [];
        this.current(null);
        if (debugActions) {
            console.groupCollapsed(`applying ${a.constructor.name}`);
            console.log('action', a);
            a.apply();
            let sa = this.stateHistory[this.stateHistory.length - 1];
            let sb = fullState();
            this.stateHistory.push(sb);
            a.undo();
            let s = fullState();
            if (JSON.stringify(sa) != JSON.stringify(s)) {
                console.error('undo changes state');
                console.group('details');
                console.log(diffString(sa, s));
                console.log('expected state', sa);
                console.log('actual state', s);
                console.groupEnd();
            }
            a.apply();
            s = fullState();
            if (JSON.stringify(sb) != JSON.stringify(s)) {
                console.error('redo changes state');
                console.group('details');
                console.log('diff', diffString(sb, s));
                console.log('expected state', sb);
                console.log('actual state', s);
                console.groupEnd();
            }
            console.log('new state', fullState());
            console.groupEnd();
        } else {
            console.log(`applying ${a.constructor.name}`);
            a.apply();
        }
        stageUpdated();
        this.save();
    }
    undo() {
        let a = this.history.pop();        
        if (a == null) return;
        if (debugActions) {
            console.groupCollapsed(`undo action ${a.constructor.name}`);
            // State history is [..., sa, sb], we will end up in [..., sa].
            let sb = this.stateHistory.pop();
            let sa = this.stateHistory[this.stateHistory.length - 1];
            console.log('action', a);
            a.undo();
            let s = fullState();
            if (JSON.stringify(sa) != JSON.stringify(s)) {
                console.groupEnd();
                console.error('undo state does not match recorded');
                console.group('details');
                console.log('diff', diffString(sa, s));
                console.log('expected state', sa);
                console.log('actual state', s);
            }
            a.apply();
            s = fullState();
            if (JSON.stringify(sb) != JSON.stringify(s)) {
                console.groupEnd();
                console.error('redo state does not match');
                console.group('details');
                console.log('diff', diffString(sb, s));
                console.log('expected state', sb);
                console.log('actual state', s);
            }
            a.undo();
            console.log('new state', fullState());
            console.groupEnd();
        } else {
            console.log(`undo action ${a.constructor.name}`)
            a.undo();
        }
        this.forwardHistory.push(a);
        stageUpdated();
    }
    redo() {
        this.cancelCurrent();
        this.current(this.forwardHistory.pop());
        this.commit(true);
    }
    cancelCurrent() {
        const a = this.current();
        if (a != null) {
            a.cancel();
            stageUpdated();
        }
        this.current(null);
    }
    save() {        
        localStorage.setItem('actions_history', JSON.stringify(this.serialize()));
    }
    serialize(): any[] {
        let h: any[] = [];
        for (const a of this.history) {
            const s = a.serialize();
            if (s == null) continue;
            h.push(s);
        }
        return h;
    }
    load(history?: any) {
        if (!history) {
            let s = localStorage.getItem("actions_history");
            if (s === null) return;            
            history = JSON.parse(s);
        }
        clearStage();
        this.history = [];
        this.forwardHistory = [];
        this.stateHistory = [];
        this.stateHistory.push(fullState());
        console.groupCollapsed('load actions');
        for (const data of history) {
            this.current(deserializeAction(data));
            this.commit();
        }
        console.groupEnd();
    }
}


export let appActions = new Actions();