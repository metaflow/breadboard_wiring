import { Mutation, actionDeserializers, MutationSpec } from "../mutation";
import { currentLayer } from "../workspace";
import { selectionAddresses } from "../components/selectable_component";
import { Component, deserializeComponent } from "../components/component";

const marker = 'DeleteSelectionAction';

actionDeserializers.set(marker, function (data: DeleteSelectionActionSpec): Mutation {
    return new DeleteComponentsMutation(
        data.components.map(c => deserializeComponent(c)),
        data.prevSelection);
});

interface DeleteSelectionActionSpec extends MutationSpec {
    prevSelection: string[];    
    components: any[];
}

export class DeleteComponentsMutation extends Mutation {
    components: Component[];
    prevSelection: string[] = [];
    constructor(components: Component[], prevSelection: string[]) {
        super();
        this.components = components;
        this.prevSelection = prevSelection;
    }
    apply(): void {       
        this.components.forEach(c => c.remove());
    }
    undo(): void {
        this.components.forEach(c => {
            c.needsLayoutUpdate(true);
            c.show(currentLayer());
            c.materialized(true);
        })
        selectionAddresses(this.prevSelection);
    }
    serialize() {
        let z: DeleteSelectionActionSpec = {
            T: marker,
            prevSelection: this.prevSelection,
            components: this.components.map(c => c.serialize()),
        };
        return z;
    }
}