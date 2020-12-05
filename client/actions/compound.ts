import { plainToClass } from "class-transformer";
import { deserializeMutation, Mutation, mutationDeserializers, MutationSpec } from "../mutation";

export class CompoundMutation extends Mutation {
    actions: Mutation[]|undefined;
    constructor(actions: Mutation[]) {        
        super();
        this.actions = actions;
        this.postInit();
    }
    apply(): void {
        if (this.actions == null) return;
        this.actions.forEach(a => a.apply());
    }
    undo(): void {
        if (this.actions == null) return;
        this.actions.reverse();
        this.actions.forEach(a => a.undo());
        this.actions.reverse();
    }
}

mutationDeserializers.set(CompoundMutation.name, function (data: object): Mutation {
    const z = plainToClass(CompoundMutation, data);
    z.actions = z.actions!.map((d: any) => deserializeMutation(d));
    return z;
});