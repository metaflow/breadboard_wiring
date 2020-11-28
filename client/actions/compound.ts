import { Mutation, actionDeserializers, ActionState, deserializeMutation, MutationSpec, Interaction } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";

const marker = 'CompoundAction';

interface CompoundActionSpec extends MutationSpec  {
    actions: any[];
};

actionDeserializers.set(marker, function (data: any): Mutation {
    return new CompoundMutation((data as CompoundActionSpec).actions.map(a => deserializeMutation(a)));
});

export class CompoundMutation extends Mutation {
    actions: Mutation[];
    done: boolean[];
    constructor(actions: Mutation[]) {        
        super();
        this.actions = actions;
        this.done = actions.map(_ => false);
    }
    apply(): void {
        this.actions.forEach(a => a.apply());
    }
    undo(): void {
        this.actions.reverse();
        this.actions.forEach(a => a.undo());
        this.actions.reverse();
    }
    serialize() {
        const z: CompoundActionSpec = {
            T: marker,
            actions: this.actions.map(a => a.serialize()),
        };
        return z;
    }
}