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

import { IntegratedCircuitSchematic, IntegratedCircuitSchematicSpec } from "../everything";
import { componentDeserializers } from "../everything";
import { Point, UNKNOWN } from "../everything";

export class ic74x245 extends IntegratedCircuitSchematic {
    constructor(spec?: IntegratedCircuitSchematicSpec) {
        super(spec || {
            T: ic74x245.name,
            offset: new Point().plain(),
            left_pins: ["DIR", "OE", "", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"],
            right_pins: ["", "", "", "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
            label: "74x245",
            layerName: UNKNOWN,
        });
    }
}

componentDeserializers.set(ic74x245.name, function (data: IntegratedCircuitSchematicSpec): ic74x245 {
    return new ic74x245(data);
});