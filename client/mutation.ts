import Konva from 'konva';
import { assert } from './utils';
import { workspace } from './workspace';

/* active - (finish) ->  ready - (apply) -> applied
         |                     ^                  |
      (cancel) -> cancelled    +----- (undo) -----+

    Every action implements static ctor "start()" that must set "active" state.
    Deserialize returns "ready" or "applied".
    "finish" completes user interaction. */

// Individual actions should register here.
export const actionDeserializers = new Map<string, { (data: any): Mutation }>();

export function deserializeMutation(data: any): Mutation {
    const t = data.T;
    assert(actionDeserializers.has(t), t);
    return actionDeserializers.get(t)!(data)!;
}

export abstract class Mutation { 
    abstract apply(): void;
    abstract undo(): void; 
    abstract serialize(): any;
}

export interface MutationSpec {
    T: string;
}

export abstract class Interaction {
    constructor() {
        workspace.currentInteraction(this);
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null {
        return this;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null {
        return this;
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null {
        return this;
    }
    abstract cancel(): void;
}