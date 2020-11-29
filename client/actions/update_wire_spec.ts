import { IntegratedCircuitSchematic } from "../components/IC_schematic";
import { Mutation, actionDeserializers, ActionState, MutationSpec, Interaction } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Point, PlainPoint, stage, currentLayer } from "../workspace";
import { all, getTypedByAddress } from "../address";
import { Component, deserializeComponent } from "../components/component";
import { moveSingleWire, Wire, WirePoint, WirePointSpec } from "../components/wire";
import { selectionByType, selectionAddresses } from "../components/selectable_component";
import { Contact } from "../components/contact";
import { MoveComponentMutation } from "./move_component";
import assertExists from "ts-assert-exists";
import { typeGuard } from "../utils";
import theme from '../../theme.json';
import { CompoundMutation } from "./compound";
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