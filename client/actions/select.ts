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

import { Mutation, Interaction, mutationDeserializers } from "../mutation";
import Konva from "konva";
import { workspace, layer, stageLayer, AreaName } from "../workspace";
import { selectionAddresses } from "../components/selectable_component";
import { KonvaEventObject } from "konva/types/Node";
import theme from '../../theme.json';
import { plainToClass } from "class-transformer";

export class SelectInteraction extends Interaction {
    rect: Konva.Rect|null = null;
    prevSelection: string[];
    constructor(stageName: AreaName) {        
        super(stageName);
        this.prevSelection = selectionAddresses();        
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect == null) return this;
        let pos = this.area().cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());        
        workspace.invalidateScene();
        selectionAddresses(this.selected());
        return this;
    }
    selected(): string[] {
        if (this.rect == null) return [];
        const r = this.rect.getClientRect(null);
        return this.area().stage.find('.selectable')
            .toArray()
            .filter((shape) => Konva.Util.haveIntersection(r, shape.getClientRect()))
            .map(a => a.attrs['address']);
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect != null) return this;
        let pos = this.area().cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            stroke: theme.selection,
            strokeWidth: 1,
        });
        layer(stageLayer(this.areaName)).add(this.rect);
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        this.rect?.remove();
        workspace.invalidateScene();
        workspace.update(new UpdateSelectionMutation(this.prevSelection, selectionAddresses()));        
        return null;
    }
    cancel(): void {
        this.rect?.remove();
        selectionAddresses(this.prevSelection);
    }
}

export class UpdateSelectionMutation extends Mutation {
    prevSelection: string[] = [];
    newSelection: string[] = [];
    constructor(prevSelection: string[], newSelection: string[]) {
        super();
        this.prevSelection = prevSelection;
        this.newSelection = newSelection;
    }
    apply() {
        selectionAddresses(this.newSelection);
    }
    undo() {
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(UpdateSelectionMutation.name, (d: object) => {
    return plainToClass(UpdateSelectionMutation, d);
});