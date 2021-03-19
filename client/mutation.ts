import { classToPlain, Expose } from 'class-transformer';
import Konva from 'konva';
import { assert } from './utils';
import { AreaName, workspace } from './workspace';

/* active - (finish) ->  ready - (apply) -> applied
         |                     ^                  |
      (cancel) -> cancelled    +----- (undo) -----+

    Every action implements static ctor "start()" that must set "active" state.
    Deserialize returns "ready" or "applied".
    "finish" completes user interaction. */

// Individual actions should register here.
export const mutationDeserializers = new Map<string, { (data: any): Mutation }>();

export function deserializeMutation(data: any): Mutation {
    const t = data.T;
    assert(mutationDeserializers.has(t), t);
    const z = mutationDeserializers.get(t)!(data)! as Mutation;
    z.postInit();
    return z;
}

export abstract class Mutation {
    abstract apply(): void;
    abstract undo(): void;
    serialize() {
        return classToPlain(this);
    }
    postInit() { }
    @Expose()
    T() {
        return this.constructor.name;
    }
}

export interface MutationSpec {
    T: string;
}

export abstract class Interaction {
    stageName: AreaName;
    constructor(stageName: AreaName) {
        this.stageName = stageName;
        workspace.currentInteraction(this);
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    abstract cancel(): void;
}