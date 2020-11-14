import { IntegratedCircuitSchematic, IntegratedCircuitSchematicSpec } from "./IC_schematic";
import { componentDeserializers } from "./component";

const marker = 'ic74x245';

componentDeserializers.push(function (data: any): (ic74x245 | null) {
    if (data['type_marker'] !== marker) {
        return null
    }
    return new ic74x245(data as ic74x245Spec);
});

interface ic74x245Spec {
    type_marker: string;
    super?: IntegratedCircuitSchematicSpec;
};

export class ic74x245 extends IntegratedCircuitSchematic {
    constructor(spec?: ic74x245Spec) {
        super(spec?.super || {
            left_pins: ["DIR", "OE", "", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"],
            right_pins: ["", "", "", "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
            label: "74x245"
        });
    }
    spec(): any {
        return {
            type_marker: marker,
            super: super.spec(),
        } as ic74x245Spec;
    }
}