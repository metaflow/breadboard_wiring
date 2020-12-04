import { Mutation, mutationDeserializers, MutationSpec } from "../mutation";
import { currentLayer } from "../workspace";
import { selectionAddresses } from "../components/selectable_component";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { plainToClass } from "class-transformer";
import { getTypedByAddress } from "../address";

export class DeleteComponentsMutation extends Mutation {
    components: ComponentSpec[];
    prevSelection: string[] = [];
    constructor(components: ComponentSpec[], prevSelection: string[]) {
        super();
        this.components = components;
        this.prevSelection = prevSelection;
    }
    apply(): void {       
        this.components.forEach(c => {
            getTypedByAddress(Component, c.id!)?.remove();
        });
    }
    undo(): void {
        this.components.forEach(s => {
            const c = deserializeComponent(s);
            c.updateLayout();
            c.show(currentLayer());
            c.materialized(true);
        })
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(DeleteComponentsMutation.name, (d: object) => {
    return plainToClass(DeleteComponentsMutation, d);
});