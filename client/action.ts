import Konva from 'konva';
import { fullState, StageState } from './stage';
import {diffString} from 'json-diff';
import { json } from 'express';

export const actionDeserializers: { (data: any): (Action | null) }[] = [];

export function deserializeAction(data: any) : Action {
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
    private readonly history: Action[] = [];
    private readonly forwardHistory: Action[] = [];
    stateHistory: StageState[] = [];
    constructor() {
        this.stateHistory.push(fullState());
    }
    current(a?: Action | null): Action | null {
        if (a !== undefined) this._current = a;
        return this._current;
    }
    onMouseDown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.current() == null) return false;
        if (this.current()?.mousedown(event)) this.commit();
        return true;
    }
    onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this.current() == null) return false;
        if (this.current()?.mouseup(event)) this.commit();
        return true;
    }
    onMouseMove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.current() == null) return false;
        if (this.current()?.mousemove(event)) this.commit();
        return true;
    }
    commit(keepForwardHistory: boolean = false) {
        const a = this.current();
        if (a == null) return;                 
        this.history.push(a);
        if (!keepForwardHistory) this.forwardHistory.splice(0, this.forwardHistory.length);
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
    }
    redo() {
        this.cancelCurrent();
        this.current(this.forwardHistory.pop());
        this.commit(true);
    }
    cancelCurrent() {
        const a = this.current();
        if (a != null) a.cancel();
        this.current(null);
    }

    save() {
        let h: any[] = [];
        for (const a of this.history) {
            const s = a.serialize();
            if (s == null) continue;
            h.push(s);
        }
        localStorage.setItem('actions_history', JSON.stringify(h));
    }
    load() {
        let s = localStorage.getItem("actions_history");
        if (s === null) return;
        let h = JSON.parse(s);
        for (const data of h) {
            this.current(deserializeAction(data));
            this.commit();
        }
    }
}


export let appActions = new Actions();