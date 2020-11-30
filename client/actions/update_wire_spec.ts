import { Mutation, actionDeserializers, MutationSpec } from "../mutation";
import { getTypedByAddress } from "../address";
import { Wire, WirePointSpec } from "../components/wire";
import assertExists from "ts-assert-exists";
import { classToPlain, plainToClass } from "class-transformer";

const marker = 'UpdateWireSpec';

actionDeserializers.set(marker, function (data: UpdateWireSpecMutationSpec): Mutation {
    // return new UpdateWireSpecMutation(data.address, data.from, data.to);
    return plainToClass(UpdateWireSpecMutation, data);
});

interface UpdateWireSpecMutationSpec extends MutationSpec {
    address: string;
    from: WirePointSpec[];
    to: WirePointSpec[];
}

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
    serialize() {
        const z = classToPlain(this);
        z.T = marker;
        return z;
    }
    apply() {
        assertExists(getTypedByAddress(Wire, this.address)).pointsSpec(this.to);
    }
    undo() {
        assertExists(getTypedByAddress(Wire, this.address)).pointsSpec(this.from);
    }
}