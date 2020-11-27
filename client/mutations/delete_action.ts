import { Mutation, actionDeserializers } from "../mutation";
import Konva from "konva";
import { currentLayer } from "../workspace";
import { clearSelection, selection, selectionAddresses } from "../components/selectable_component";
import { deserializeComponent } from "../components/component";

const marker = 'DeleteSelectionAction';

actionDeserializers.push(function (data: any): Mutation | null {
    if (data['typeMarker'] !== marker) return null;
    const s: DeleteSelectionActionSpec = data;
    let z = new DeleteSelectionAction();
    z.components = s.components;
    z.prevSelection = s.prevSelection;
    return z;
});

interface DeleteSelectionActionSpec {
    typeMarker: 'DeleteSelectionAction';
    prevSelection: string[];    
    components: any[];
}

export class DeleteSelectionAction extends Mutation {
    prevSelection: string[] = [];
    newSelection: string[] = [];
    components: any[] = [];
    private constructor() {
        super();
    }
    begin() {
        super.begin();
        this.components = selection().map(c => c.serialize());
        this.prevSelection = selectionAddresses();
    }
    apply(): void {
        super.apply();
        selection().forEach(c => c.remove());
        clearSelection();
    }
    undo(): void {
        super.undo();
        this.components.forEach(d => {
            const c = deserializeComponent(d);
            if (c == null) return;
            c.updateLayout();
            c.show(currentLayer());
            c.materialized(true);
        })
        selectionAddresses(this.prevSelection);
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return true;
    }
    serialize() {
        let z: DeleteSelectionActionSpec = {
            typeMarker: marker,
            prevSelection: this.prevSelection,
            components: this.components,
        };
        return z;
    }
}