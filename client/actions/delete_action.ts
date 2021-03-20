import { Mutation, mutationDeserializers } from "../mutation";
import { selectionAddresses } from "../components/selectable_component";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { plainToClass } from "class-transformer";
import { assert } from "../utils";

export class DeleteComponentsMutation extends Mutation {
    specs: ComponentSpec[];
    prevSelection: string[] = [];
    constructor(components: ComponentSpec[], prevSelection: string[]) {
        super();
        this.specs = components;
        this.prevSelection = prevSelection;        
    }
    apply(): void {
        this.specs.forEach(c => {
            const x = Component.byID(c.id!);
            assert(x.parent() == null, 'child component should not be deleted');
            x.remove();
        });
    }
    undo(): void {
        this.specs.forEach(s => {
            const c = deserializeComponent(s);
            c.show();
            c.materialized(true);
        });
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(DeleteComponentsMutation.name, (d: object) => {
    return plainToClass(DeleteComponentsMutation, d);
});