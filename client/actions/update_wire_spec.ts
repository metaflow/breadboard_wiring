import { Mutation, mutationDeserializers } from "../mutation";
import { getTypedByAddress } from "../address";
import { Wire, WirePointSpec } from "../components/wire";
import assertExists from "ts-assert-exists";
import { classToPlain, plainToClass } from "class-transformer";

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
        assertExists(getTypedByAddress(Wire, this.address)).pointsSpec(this.to);
    }
    undo() {
        assertExists(getTypedByAddress(Wire, this.address)).pointsSpec(this.from);
    }
}


mutationDeserializers.set(UpdateWireSpecMutation.name, (d: object) => {
    return plainToClass(UpdateWireSpecMutation, d);
});