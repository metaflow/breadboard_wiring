import Konva from 'konva';
import { error } from './utils';

export const actionDeserializers: { (data: any): (Action | null) }[] = [];

export function deserializeAction(data: any): Action {
    for (const d of actionDeserializers) {
        const a = d(data);
        if (a !== null) return a;
    }
    error('cannot deserialize action', data);
    throw new Error('cannot deserialize action');
}

export abstract class Action {    
    state: 'init' | 'active' | 'applied' | 'ready' | 'cancelled';
    /* 
 http://asciiflow.com/
 *init - begin() -> active - apply() -> applied
                      |         |          |
                   cancel()  *ready  <-  undo()
                      |
                      v
                  cancelled
    */
    constructor() {
        this.state = 'init';
    }
    begin() {
        if (this.state != 'init') throw new Error(`action state must be init ${this}`);
        this.state = 'active';
    }
    apply() {
        if (this.state != 'ready' && this.state != 'active') throw new Error(`action state must be init or active ${this}`);
        this.state = 'applied';
        // TODO: check in workspace that after such actions state changes. 
    }
    undo() {
        if (this.state != 'applied') throw new Error(`action state must be applied ${this}`);
        this.state = 'ready';
    }
    cancel() {
        if (this.state != 'active') throw new Error(`action state must be active ${this}`);
        this.state = 'cancelled';
    }
    abstract mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract serialize(): any;
}
