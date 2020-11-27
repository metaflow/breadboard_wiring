import { Mutation, actionDeserializers, Interaction } from "../mutation";
import Konva from "konva";
import { stage, Point, currentLayer, workspace } from "../workspace";
import { clearSelection, selectionAddresses } from "../components/selectable_component";
import theme from '../../theme.json';
import { KonvaEventObject } from "konva/types/Node";

const marker = 'update_selection';

actionDeserializers.set(marker, function (s: UpdateSelection): Mutation {
    return new SelectMutation(s.newSelection, s.prevSelection);
});

interface UpdateSelection {
    T: 'select';
    prevSelection: string[];
    newSelection: string[];
}

export class SelectMutation extends Mutation {
    prevSelection: string[] = [];
    newSelection: string[] = [];
    constructor(prevSelection: string[], newSelection: string[]) {
        super();
        this.prevSelection = prevSelection;
        this.newSelection = newSelection;
    }
    apply() {
        selectionAddresses(this.newSelection);
    }
    undo() {
        selectionAddresses(this.prevSelection);
    }    
    serialize() {
        let z: UpdateSelection = {
            T: marker,
            prevSelection: this.prevSelection,
            newSelection: this.newSelection,
        };
        return z;
    }
}