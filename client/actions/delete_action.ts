import { Action, actionDeserializers } from "../action";
import Konva from "konva";
import { stage, actionLayer, ScreenPoint, defaultLayer } from "../stage";
import { clearSelection, selection, selectionAddresses } from "../components/selectable_component";
import { deserializeComponent } from "../components/component";

const marker = 'DeleteSelectionAction';

actionDeserializers.push(function (data: any): Action | null {
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

export class DeleteSelectionAction implements Action {
    prevSelection: string[];
    newSelection: string[] = [];
    components: any[];
    constructor() {
        this.components = selection().map(c => c.spec());
        this.prevSelection = selectionAddresses();
    }
    apply(): void {
        selection().forEach(c => c.remove());
        clearSelection();
    }
    undo(): void {
        this.components.forEach(d => {
            const c = deserializeComponent(d);
            if (c == null) return;
            c.updateLayout();
            c.show(defaultLayer());
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
    cancel(): void {}
    serialize() {
        let z: DeleteSelectionActionSpec = {
            typeMarker: marker,
            prevSelection: this.prevSelection,
            components: this.components,
        };
        return z;
    }
}