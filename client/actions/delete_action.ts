import { Mutation, mutationDeserializers } from "../mutation";
import { selectionAddresses } from "../components/selectable_component";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { plainToClass } from "class-transformer";

export class DeleteComponentsMutation extends Mutation {
    specs: ComponentSpec[];
    prevSelection: string[] = [];
    constructor(components: ComponentSpec[], prevSelection: string[]) {
        super();
        this.specs = components;
        this.prevSelection = prevSelection;
    }
    apply(): void {
        // TODO: this deletets non-roots too but createing  of component does not attaches back.
        this.specs.forEach(c => Component.byID(c.id!).remove());
    }
    undo(): void {
        this.specs.forEach(s => {
            const c = deserializeComponent(s);
            c.updateLayout();
            c.show();
            c.materialized(true);
        })
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(DeleteComponentsMutation.name, (d: object) => {
    return plainToClass(DeleteComponentsMutation, d);
});