import { IntegratedCircuitSchematic, IntegratedCircuitSchematicSpec } from "./integrated_circuit_schematic";
import { componentDeserializers, ComponentSpec } from "./component";
import { Point, SCHEME } from "../workspace";

export class ic74x245 extends IntegratedCircuitSchematic {
    constructor(spec?: IntegratedCircuitSchematicSpec) {
        super(spec || {
            T: ic74x245.name,
            offset: new Point().plain(),
            left_pins: ["DIR", "OE", "", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"],
            right_pins: ["", "", "", "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
            label: "74x245",
            layerName: SCHEME,
        });
    }    
}

componentDeserializers.set(ic74x245.name, function (data: IntegratedCircuitSchematicSpec): ic74x245 {
    return new ic74x245(data);
});