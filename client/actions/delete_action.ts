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

import { Mutation, mutationDeserializers } from "../mutation";
import { selectionAddresses } from "../components/selectable_component";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { plainToClass } from "class-transformer";
import { assert } from "../utils";

export class DeleteComponentsMutation extends Mutation {
    specs: ComponentSpec[];
    prevSelection: string[] = [];
    constructor(components: ComponentSpec[], prevSelection: string[]) {
        super();
        this.specs = components;
        this.prevSelection = prevSelection;        
    }
    apply(): void {
        this.specs.forEach(c => {
            const x = Component.byID(c.id!);
            assert(x.parent() == null, 'child component should not be deleted');
            x.remove();
        });
    }
    undo(): void {
        this.specs.forEach(s => {
            const c = deserializeComponent(s);
            c.show();
            c.materialized(true);
        });
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(DeleteComponentsMutation.name, (d: object) => {
    return plainToClass(DeleteComponentsMutation, d);
});