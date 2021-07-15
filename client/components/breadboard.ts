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

import Konva from 'konva';
import { Point, workspace } from '../everything';
import { Contact } from '../everything';
import { componentDeserializers, ComponentSpec } from '../everything';
import theme from '../../theme.json';
import { SelectableComponent } from '../everything';
import { UpdateSelectionMutation } from '../everything';
import { MoveSelectionInteraction } from '../everything';

const p_width = 170.5;
const p_height = 63.1;
const p_contact = 2.54;

export class Breadboard extends SelectableComponent {
    contacts: Contact[] = [];
    rect: Konva.Rect;
    constructor(spec?: ComponentSpec) {
        super(spec);
        let left = (p_width - p_contact * 62) / 2;
        let top = (p_height - 19 * p_contact) / 2;
        for (let i = 0; i < 63; i++) {
            for (let j = 0; j < 20; j++) {
                if (j == 2 || j == 3 || j == 9 || j == 10 || j == 16 || j == 17) continue;
                if ((j == 0 || j == 1 || j == 18 || j == 19) &&
                    (i == 0 || ((i - 1) % 6 == 0) || i == 62)) continue;
                const c = new Contact({
                    T: '',
                    offset: new Point(left + i * p_contact, top + j * p_contact).plain(),
                    layerName: '',
                });
                this.addChild(c);
                this.contacts.push(c);
            }
        }
        this.rect = new Konva.Rect({
            fill: theme.breadboard,
            stroke: theme.foreground,
            strokeWidth: 1,
        });
        this.shapes.add(this.rect);

        this.setupEvents();
    }
    setupEvents() {
        const o = this;
        const f = (e: Konva.KonvaEventObject<MouseEvent>) => {
            if (workspace.currentInteraction()) {
                o.area().onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            if (!this.selected()) {
                workspace.update(new UpdateSelectionMutation(this.areaName(), this.area().selectionAddresses(), [o.address()]));
            }
            new MoveSelectionInteraction(o.areaName());
        };
        this.rect.on('mousedown', f);
    }
    updateLayout(): void {
        super.updateLayout();
        this.rect.position(this.absolutePosition());
        this.rect.height(p_height);
        this.rect.width(p_width);
    }
}

componentDeserializers.set(Breadboard.name, function (data: ComponentSpec): Breadboard {
    return new Breadboard(data);
});