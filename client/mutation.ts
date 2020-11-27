import Konva from 'konva';
import { assert, error } from './utils';

/* active - (finish) ->  ready - (apply) -> applied
         |                     ^                  |
      (cancel) -> cancelled    +----- (undo) -----+

    Every action implements static ctor "start()" that must set "active" state.
    Deserialize returns "ready" or "applied".
    "finish" completes user interaction. */

// Individual actions should register here.
export const actionDeserializers: { (data: any): (Mutation | null) }[] = [];

export function deserializeMutation(data: any): Mutation {
    for (const d of actionDeserializers) {
        const a = d(data);
        if (a == null) continue;
        return a;
    }
    throw error('cannot deserialize', data);
}

export abstract class Mutation { 
    abstract apply(): void;
    abstract undo(): void; 
    abstract serialize(): any;
}

export abstract class Interaction {
    abstract mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null;
    abstract mousedown(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null;
    abstract mouseup(event: Konva.KonvaEventObject<MouseEvent>): Interaction|null;
    abstract cancel(): void;
}