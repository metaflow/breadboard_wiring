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
import { Wire, WirePointSpec } from "../components/wire";
import { plainToClass } from "class-transformer";
import { Component } from "../components/component";

export class UpdateWireSpecMutation extends Mutation {
    address: string;
    from: WirePointSpec[];
    to: WirePointSpec[];
    constructor(address: string, from: WirePointSpec[], to: WirePointSpec[]) {
        super();
        this.address = address;
        this.from = from;
        this.to = to;
    }
    apply() {
        Component.typedByAddress(Wire, this.address).pointsSpec(this.to);
    }
    undo() {
        Component.typedByAddress(Wire, this.address).pointsSpec(this.from);
    }
}

mutationDeserializers.set(UpdateWireSpecMutation.name, (d: object) => {
    return plainToClass(UpdateWireSpecMutation, d);
});