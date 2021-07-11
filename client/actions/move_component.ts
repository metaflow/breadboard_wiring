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

import { AreaMutation, Mutation, mutationDeserializers } from "../mutation";
import { AreaName, PlainPoint, Point } from "../workspace";
import { Component } from "../components/component";
import { plainToClass } from "class-transformer";
import { assert } from "../utils";

export class MoveComponentMutation extends AreaMutation {
    address: string;
    to: PlainPoint;
    from: PlainPoint;
    constructor(an: AreaName, address: string, from: PlainPoint, to: PlainPoint) {
        super(an);
        this.address = address;
        this.to = to;
        this.from = from;
    }
    apply(): void {
        const c = this.area().typedComponentByAddress(Component, this.address);
        assert(c != null, `${this.address} is not found`);
        console.log(this);
        c?.offset(new Point(this.to));
    }
    undo(): void {
        const c = this.area().typedComponentByAddress(Component, this.address);
        assert(c != null, `${this.address} is not found`);
        c?.offset(new Point(this.from));
    }
}

mutationDeserializers.set(MoveComponentMutation.name, (d: object) => {
    return plainToClass(MoveComponentMutation, d);
});