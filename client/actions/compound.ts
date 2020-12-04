import { plainToClass } from "class-transformer";
import { deserializeMutation, Mutation, mutationDeserializers, MutationSpec } from "../mutation";

export class CompoundMutation extends Mutation {
    actions: Mutation[]|undefined;
    done: boolean[]|undefined;
    constructor(actions: Mutation[]) {        
        super();
        this.actions = actions;
        this.postInit();
    }
    postInit() {
        if (this.actions == null) return;
        this.done = this.actions.map(_ => false);
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
    z.actions = (data as any).actions.map((d: any) => deserializeMutation(d));
    return z;
});