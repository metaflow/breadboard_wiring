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

import { plainToClass } from "class-transformer";
import type { KonvaEventObject } from "konva/types/Node";
import theme from '../../theme.json';
import { Area, AreaName, assert, Component, ComponentSpec, CompoundMutation, deserializeComponent, Interaction, LayerNameT, Mutation, mutationDeserializers, Point, stageLayer, workspace } from "../everything";

export class AddComponentMutation extends Mutation {
    spec: ComponentSpec | undefined;
    constructor(spec: ComponentSpec) {
        super();
        this.spec = spec;
        this.postInit();
    }
    postInit() {
        if (this.spec == null) return;  // For deserialization.
        assert(this.spec.id != null);
    }
    apply(): void {
        const c = deserializeComponent(this.spec);
        console.log('apply add', c, this.spec);
        c.show();
        c.materialized(true);
    }
    undo(): void {
        assert(this.spec != null);
        assert(this.spec?.id != null);
        const area = workspace.area(Area.fromLayer(LayerNameT.check(this.spec?.layerName)));
        const c = area.componentByID(this.spec?.id!);
        c.materialized(false);
        c.hide();
    }
}

mutationDeserializers.set(AddComponentMutation.name, (d: object) => {
    return plainToClass(AddComponentMutation, d);
});

export class AddComponentInteraction extends Interaction {
    components: Component[];
    offsets: Point[];
    start: Point;
    constructor(stageName: AreaName, cc: Component[]) {
        super(stageName);
        this.components = cc;
        this.components.forEach(c => {
            c.mainColor(theme.active);
            c.layerName(stageLayer(stageName));
            c.show();
        });
        this.offsets = this.components.map(c => c.offset());
        this.start = this.area().cursor(); // End position will be aligned.
    }
    cancel() {
        this.components.forEach(c => c.remove());
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        console.log('AddComponentInteraction mouse move');
        const o = this;
        this.components.forEach((c, i) => {
            const p = o.offsets[i].clone().add(o.area().cursor()).sub(o.start);
            c.offset(o.area().align(p));
        });
        return this;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        const mm = this.components.map(c => new AddComponentMutation(c.serialize()));
        this.cancel();
        workspace.update(new CompoundMutation(mm));
        return null;
    }
}