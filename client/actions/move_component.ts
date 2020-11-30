import { Mutation, actionDeserializers, MutationSpec } from "../mutation";
import { Point, PlainPoint } from "../workspace";
import { getTypedByAddress } from "../address";
import assertExists from "ts-assert-exists";
import { Component } from "../components/component";

const marker = 'MoveIcSchematicAction';

actionDeserializers.set(marker, (data: MoveComponentMutationSpec) => new MoveComponentMutation(data.address, new Point(data.from), new Point(data.to)));

interface MoveComponentMutationSpec extends MutationSpec {
    from: PlainPoint;
    to: PlainPoint;
    address: string;
}

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
    serialize() {
        const z: MoveComponentMutationSpec = {
            T: marker,
            from: this.from.plain(),
            to: this.to.plain(),
            address: this.address,
        };
        return z;
    }
}
