import Konva from 'konva';
import { assert, error } from './utils';

export type ActionState =  'init' | 'active' | 'applied' | 'ready' | 'cancelled';

export const actionDeserializers: { (data: any, state: ActionState): (Action | null) }[] = [];

export function deserializeAction(data: any, state: ActionState): Action {
    for (const d of actionDeserializers) {
        const a = d(data, state);
        if (a == null) continue;
        a.state = state;
        return a;
    }
    throw error('cannot deserialize', data);
}

export abstract class Action {    
    
    state: ActionState;
    /* 
 http://asciiflow.com/ 
 *init - begin() -> active - apply() -> applied
                      |         |          |
 x invalid         cancel()  *ready  <-  undo()
                      |
                      v
                  cancelled
    */
    constructor() {
        this.state = 'init';
    }
    begin() {
        assert(this.state == 'init', this);
        this.state = 'active';
    }
    apply() {
        assert(this.state == 'ready' || this.state == 'active', this);
        this.state = 'applied';
    }
    undo() {
        assert(this.state == 'applied', this);
        this.state = 'ready';
    }
    cancel() {
        assert(this.state == 'active', this);
        this.state = 'cancelled';
    }
    abstract mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    abstract serialize(): any;
}
