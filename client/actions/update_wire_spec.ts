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