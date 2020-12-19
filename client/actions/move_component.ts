import { Mutation, mutationDeserializers } from "../mutation";
import { PlainPoint, Point } from "../workspace";
import { Component } from "../components/component";
import { plainToClass } from "class-transformer";
import { assert } from "../utils";

export class MoveComponentMutation extends Mutation {
    address: string;
    to: PlainPoint;
    from: PlainPoint;
    constructor(address: string, from: PlainPoint, to: PlainPoint) {
        super();
        this.address = address;
        this.to = to;
        this.from = from;
    }
    apply(): void {
        const c = Component.typedByAddress(Component, this.address);
        assert(c != null, `${this.address} is not found`);
        console.log(this);
        c?.offset(new Point(this.to));
    }
    undo(): void {
        const c = Component.typedByAddress(Component, this.address);
        assert(c != null, `${this.address} is not found`);
        c?.offset(new Point(this.from));
    }
}

mutationDeserializers.set(MoveComponentMutation.name, (d: object) => {
    return plainToClass(MoveComponentMutation, d);
});