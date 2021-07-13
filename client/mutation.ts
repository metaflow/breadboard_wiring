/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
console.log('import mutation');
import { classToPlain, Expose } from 'class-transformer';
import type Konva from 'konva';
import { assert } from './utils';
import { Area, AreaName, workspace } from './workspace';

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
    console.log(mutationDeserializers.size);
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
    @Expose() // Include in JSON.
    T() {
        return this.constructor.name;
    }
}

export abstract class AreaMutation extends Mutation {
  areaName: AreaName;
  constructor(an: AreaName) {
      super();
      this.areaName = an;
  }
  area(): Area {
    return workspace.area(this.areaName);
  }
}

export interface MutationSpec {
    T: string;
}

export abstract class Interaction {
    areaName: AreaName;
    constructor(stageName: AreaName) {
        this.areaName = stageName;
        // TODO: make part of the area?
        workspace.currentInteraction(this);
    }
    mousemove(_: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    mousedown(_: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    mouseup(_: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        return this;
    }
    area(): Area {
        return workspace.area(this.areaName);
    }
    abstract cancel(): void;
}