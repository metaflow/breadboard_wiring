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

import Konva from "konva";
import { AddWireInteraction } from "../actions/add_wire";
import { SCHEME, workspace } from "../workspace";
import type { ComponentSpec } from "./component";
import { SelectableComponent } from "./selectable_component";
import theme from '../../theme.json';

export class Contact extends SelectableComponent {
    circle: Konva.Circle;
    constructor(spec: ComponentSpec) {
        super(spec);
        this.circle = new Konva.Circle({radius: 1});
        this.shapes.add(this.circle);
        this.setupEvents();
    }    
    setupEvents() {
        const o = this;
        this.circle.on('mousedown', function (e) {            
            if (workspace.currentInteraction()) {
                o.area().onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            // TоыODO: what if there is an existing wire attached here? How this should look like in UI?
            new AddWireInteraction(o.areaName(), o.absolutePosition());
        });
    }
    updateLayout() {
        super.updateLayout();
        this.circle.stroke(this.selected() ? theme.selection : this.mainColor());
        this.circle.position(this.absolutePosition());
        this.circle.strokeWidth(this.areaName() == SCHEME ? 1 : 0.5);
        this.circle.radius(this.areaName() == SCHEME ? 3 : 0.7);
    }
}