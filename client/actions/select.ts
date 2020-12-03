import { Mutation, actionDeserializers, Interaction } from "../mutation";
import Konva from "konva";
import { stage, Point, currentLayer, workspace } from "../workspace";
import { clearSelection, selectionAddresses } from "../components/selectable_component";
import { KonvaEventObject } from "konva/types/Node";
import theme from '../../theme.json';

export class SelectInteraction extends Interaction {
    rect: Konva.Rect|null = null;
    prevSelection: string[];
    constructor() {
        super();
        this.prevSelection = selectionAddresses();        
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect == null) return this;
        let pos = Point.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());        
        workspace.invalidateScene();
        selectionAddresses(this.selected());        
        return this;
    }
    selected(): string[] {
        if (this.rect == null) return [];
        const r = this.rect.getClientRect(null);
        return stage().find('.selectable')
            .toArray()
            .filter((shape) => Konva.Util.haveIntersection(r, shape.getClientRect()))
            .map(a => a.attrs['address']);
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect != null) return this;
        let pos = Point.cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            stroke: theme.selection,
            strokeWidth: 1,
        });
        currentLayer()?.add(this.rect);
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        this.rect?.remove();
        workspace.invalidateScene();
        workspace.update(new UpdateSelectionMutation(this.prevSelection, selectionAddresses()));        
        return null;
    }
    cancel(): void {
        this.rect?.remove();
        selectionAddresses(this.prevSelection);
    }
}

const marker = 'update_selection';
interface UpdateSelection {
    T: 'update_selection';
    prevSelection: string[];
    newSelection: string[];
}

actionDeserializers.set(marker, function (s: UpdateSelection): Mutation {
    return new UpdateSelectionMutation(s.newSelection, s.prevSelection);
});

export class UpdateSelectionMutation extends Mutation {
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