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

import { Mutation, Interaction } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Point, AreaName, workspace } from "../workspace";
import { all, Component, deserializeComponent } from "../components/component";
import { moveSingleWire, Wire, WirePoint } from "../components/wire";
import { selectionByType, selectionAddresses } from "../components/selectable_component";
import { Contact } from "../components/contact";
import { MoveComponentMutation } from "./move_component";
import assertExists from "ts-assert-exists";
import { checkT } from "../utils";
import theme from '../../theme.json';
import { CompoundMutation } from "./compound";
import { UpdateWireSpecMutation } from "./update_wire_spec";
import { UpdateSelectionMutation } from "./select";
import { DeleteComponentsMutation } from "./delete_action";

export class MoveSelectionInteraction extends Interaction {
    from: Point;
    components: Component[] = [];
    auxComponents: Component[];
    selection: string[];
    wires = new Map<Wire, [number[], Wire]>();  // Map of "original wire" => (id of affected points, aux wire).
    constructor(areaName: AreaName) {
        super(areaName);
        this.selection = selectionAddresses();
        this.from = this.area().cursor();
        this.components = selectionByType(Component).filter(c => !checkT(c, WirePoint));
        this.auxComponents = this.components.map(c => {
            const x = deserializeComponent(c.serialize());
            x.mainColor(theme.active);
            x.show();
            c.hide();
            return x;
        });
        const points = selectionByType(WirePoint);
        const cc = this.components.flatMap((c: Component) => c.descendants(Contact));
        const attached = all(WirePoint).filter((p: WirePoint) => {
            return cc.some((c: Contact) => c.absolutePosition().closeTo(p.absolutePosition()));
        });
        points.push(...(attached.filter((p: WirePoint) => points.indexOf(p) == -1)));
        for (const p of points) {
            if (!this.wires.has(p.wire())) {
                const w = new Wire();
                w.layerName(p.wire().layerName());
                w.mainColor(theme.active);
                w.offset(p.wire().offset());
                w.alwaysShowPoints = true;
                w.pointsSpec(p.wire().pointsSpec());
                w.show();
                p.wire().hide();
                this.wires.set(p.wire(), [[], w]);
            }
            this.wires.get(p.wire())![0].push(assertExists(p.id()));
        }
        this.area().stage.container()!.setAttribute('style', 'cursor: move');
    }
    cancel() {
        this.components.forEach(c => c.show());
        this.wires.forEach((v, k) => {
            if (k.materialized()) k.show();
            v[1].remove();
        });
        this.auxComponents.forEach(c => c.remove());
        this.area().stage.container()!.setAttribute('style', 'cursor: auto');
    }
    mousemove(e: KonvaEventObject<MouseEvent>): Interaction | null {
        const d = this.area().cursor().sub(this.from);
        this.auxComponents.forEach((c, i) => {
            const a = workspace.area(c.areaName());
            c.offset(a.align(this.components[i].offset().add(d)));
        });
        this.wires.forEach((v, k) => {
            v[1].pointsSpec(moveSingleWire(d, k.pointsSpec(), v[0]));
        });
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        const mm: Mutation[] = [];
        // Add selection of the current selection to make proper undo.
        mm.push(new UpdateSelectionMutation(this.selection, this.selection));
        this.components.forEach((c, i) => {
            mm.push(new MoveComponentMutation(c.address(), c.offset().plain(), this.auxComponents[i].offset().plain()));
        });
        this.wires.forEach((v, k) => {
            const points = v[1].pointsSpec();
            if (points.length < 2) {
                mm.push(new DeleteComponentsMutation([k.serialize()], []));
            } else {
                mm.push(new UpdateWireSpecMutation(k.address(), k.pointsSpec(), v[1].pointsSpec()));
            }
        });
        workspace.update(new CompoundMutation(mm));
        this.cancel();
        return null;
    }
}
