import { Mutation, mutationDeserializers } from "../mutation";
import { Point } from "../workspace";
import { getTypedByAddress } from "../address";
import assertExists from "ts-assert-exists";
import { Component } from "../components/component";
import { plainToClass } from "class-transformer";

export class MoveComponentMutation extends Mutation {
    address: string
    to: Point;
    from: Point;
    constructor(address: string, from: Point, to: Point) {
        super();        
        this.address = address;
        this.to = to;
        this.from = from;
    }
    apply(): void {
        assertExists(getTypedByAddress(Component, this.address)).offset(this.to);
    }
    undo(): void {
        assertExists(getTypedByAddress(Component, this.address)).offset(this.from);
    }
}

mutationDeserializers.set(MoveComponentMutation.name, (d: object) => {
    return plainToClass(MoveComponentMutation, d);
});